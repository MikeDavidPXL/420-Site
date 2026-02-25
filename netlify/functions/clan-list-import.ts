// /.netlify/functions/clan-list-import
// POST: receive parsed CSV rows (client-side parsed), upsert into clan_list_members
// Resolves discord_id via guild members, detects 420 tag
import type { Handler } from "@netlify/functions";
import {
  getSessionFromCookie,
  discordFetch,
  supabase,
  json,
  fetchAllGuildMembers,
  resolveDiscordId,
  has420InName,
  RANK_LADDER,
  computeTimeDays,
  earnedRank,
  nextRankFor,
  rankIndex,
  GuildMember,
} from "./shared";

const MAX_ROWS = 5000;

// Rate limit: 1 import per 60s per user
const lastImport = new Map<string, number>();
const IMPORT_COOLDOWN = 60_000;

// ── Column name normalizer ──────────────────────────────────
const COL_MAP: Record<string, string> = {
  "discord name": "discord_name",
  discord_name: "discord_name",
  "ingame name": "ign",
  ingame_name: "ign",
  ign: "ign",
  uid: "uid",
  "join date": "join_date",
  join_date: "join_date",
  "time in clan": "time_in_clan",
  "time in clan (days)": "time_in_clan",
  time_in_clan: "time_in_clan",
  "role given": "rank_current",
  role_given: "rank_current",
  role: "rank_current",
  rank: "rank_current",
  status: "status",
  "needs role updated": "_needs_role_updated",
};

function normalizeRow(
  raw: Record<string, unknown>
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [key, val] of Object.entries(raw)) {
    const mapped = COL_MAP[key.toLowerCase().trim()];
    if (mapped) out[mapped] = val == null ? undefined : String(val).trim();
  }
  return out;
}

// Normalize rank name to a known rank
function normalizeRank(raw: string | undefined): string {
  if (!raw) return "Private";
  const lower = raw.toLowerCase().trim();
  const found = RANK_LADDER.find((r) => r.name.toLowerCase() === lower);
  return found ? found.name : "Private";
}

// Parse date from various formats
function parseDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // ── Auth ──────────────────────────────────────────────────
  const session = getSessionFromCookie(event.headers.cookie);
  if (!session) return json({ error: "Unauthorized" }, 401);

  const member = await discordFetch(
    `/guilds/${process.env.DISCORD_GUILD_ID}/members/${session.discord_id}`,
    process.env.DISCORD_BOT_TOKEN!,
    true
  );
  const roles: string[] = member?.roles ?? [];
  if (!roles.includes(process.env.DISCORD_STAFF_ROLE_ID!)) {
    return json({ error: "Forbidden" }, 403);
  }

  // ── Rate limit ────────────────────────────────────────────
  const now = Date.now();
  const last = lastImport.get(session.discord_id) ?? 0;
  if (now - last < IMPORT_COOLDOWN) {
    return json(
      { error: "Please wait before importing again.", code: "RATE_LIMITED" },
      429
    );
  }
  lastImport.set(session.discord_id, now);

  // ── Parse body ────────────────────────────────────────────
  let body: { rows?: Record<string, unknown>[] };
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const { rows } = body;
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return json({ error: "rows is required (non-empty array)" }, 400);
  }
  if (rows.length > MAX_ROWS) {
    return json({ error: `Maximum ${MAX_ROWS} rows allowed` }, 400);
  }

  // ── Fetch guild members for discord_id resolution ─────────
  let guildMembers: GuildMember[] = [];
  try {
    guildMembers = await fetchAllGuildMembers();
  } catch (err) {
    console.error("Failed to fetch guild members:", err);
    // Continue without resolution — all rows get needs_resolution
  }

  // ── Process rows ──────────────────────────────────────────
  let imported = 0;
  let updated = 0;
  let unresolved = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = normalizeRow(rows[i]);

    if (!raw.discord_name) {
      errors.push(`Row ${i + 1}: missing Discord name`);
      continue;
    }
    if (!raw.ign) {
      errors.push(`Row ${i + 1}: missing Ingame name`);
      continue;
    }
    if (!raw.uid) {
      errors.push(`Row ${i + 1}: missing UID`);
      continue;
    }

    const joinDate = parseDate(raw.join_date);
    if (!joinDate) {
      errors.push(`Row ${i + 1}: invalid or missing Join date`);
      continue;
    }

    const status =
      raw.status?.toLowerCase() === "inactive" ? "inactive" : "active";
    const rankCurrent = normalizeRank(raw.rank_current);
    const timeCsv = raw.time_in_clan ? parseInt(raw.time_in_clan, 10) : 0;

    // Resolve discord_id
    let discordId: string | null = null;
    let needsResolution = false;
    let detectedTag = false;

    if (guildMembers.length > 0) {
      const resolved = resolveDiscordId(raw.discord_name, guildMembers);
      if (resolved.id) {
        discordId = resolved.id;
        // Check 420 tag
        const gm = guildMembers.find((m) => m.user.id === resolved.id);
        if (gm) detectedTag = has420InName(gm);
      } else {
        needsResolution = true;
        unresolved++;
      }
    } else {
      needsResolution = true;
      unresolved++;
    }

    // Calculate time & rank fields
    const isActive = status === "active";
    // For active + tagged members: counting_since = join_date
    // For inactive or not tagged: frozen with whatever days from CSV
    const countingSince =
      isActive && detectedTag ? `${joinDate}T00:00:00.000Z` : null;
    const frozenDays = countingSince ? 0 : Math.max(0, timeCsv || 0);

    const effectiveDays = computeTimeDays(frozenDays, countingSince);
    const earned = earnedRank(effectiveDays);
    // Use the higher of CSV rank and earned rank
    const currentIdx = Math.max(
      RANK_LADDER.findIndex(
        (r) => r.name.toLowerCase() === rankCurrent.toLowerCase()
      ),
      RANK_LADDER.indexOf(earned)
    );
    const finalRank = RANK_LADDER[Math.max(0, currentIdx)].name;

    const nxt = nextRankFor(finalRank, effectiveDays);
    const promoteEligible =
      isActive &&
      detectedTag &&
      !!nxt &&
      effectiveDays >= nxt.daysRequired &&
      rankIndex(finalRank) < RANK_LADDER.length - 1;

    const record = {
      discord_name: raw.discord_name,
      discord_id: discordId,
      ign: raw.ign,
      uid: raw.uid,
      join_date: joinDate,
      status,
      has_420_tag: detectedTag,
      rank_current: finalRank,
      rank_next: nxt?.name ?? null,
      frozen_days: frozenDays,
      counting_since: countingSince,
      promote_eligible: promoteEligible,
      promote_reason: promoteEligible && nxt
        ? `${effectiveDays} days in clan, meets ${nxt.name} threshold (${nxt.daysRequired} days)`
        : null,
      needs_resolution: needsResolution,
      source: "csv" as const,
      updated_at: new Date().toISOString(),
    };

    // Upsert by uid (unique game id)
    const { data: existing } = await supabase
      .from("clan_list_members")
      .select("id")
      .eq("uid", raw.uid)
      .maybeSingle();

    if (existing) {
      const { error: updateErr } = await supabase
        .from("clan_list_members")
        .update(record)
        .eq("id", existing.id);
      if (updateErr) {
        errors.push(`Row ${i + 1}: update failed — ${updateErr.message}`);
        continue;
      }
      updated++;
    } else {
      const { error: insertErr } = await supabase
        .from("clan_list_members")
        .insert(record);
      if (insertErr) {
        errors.push(`Row ${i + 1}: insert failed — ${insertErr.message}`);
        continue;
      }
      imported++;
    }
  }

  // ── Audit log ─────────────────────────────────────────────
  await supabase.from("audit_log").insert({
    action: "clan_list_imported",
    actor_id: session.discord_id,
    details: { imported, updated, unresolved, error_count: errors.length },
  });

  return json({ ok: true, imported, updated, unresolved, errors });
};

export { handler };
