// /.netlify/functions/clan-list-member
// POST: create or update a single clan_list_members row (staff only)
// Handles freeze / unfreeze logic when status or has_420_tag changes
import type { Handler } from "@netlify/functions";
import {
  getSessionFromCookie,
  discordFetch,
  supabase,
  json,
  computeTimeDays,
  earnedRank,
  nextRankFor,
  rankIndex,
  RANK_LADDER,
} from "./shared";

interface MemberBody {
  id?: string;
  discord_name?: string;
  discord_id?: string | null;
  ign?: string;
  uid?: string;
  join_date?: string;
  status?: "active" | "inactive";
  has_420_tag?: boolean;
  rank_current?: string;
  needs_resolution?: boolean;
  source?: "csv" | "manual" | "application";
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // ── Auth ──────────────────────────────────────────────────
  const session = getSessionFromCookie(event.headers.cookie);
  if (!session) return json({ error: "Unauthorized" }, 401);

  const discordMember = await discordFetch(
    `/guilds/${process.env.DISCORD_GUILD_ID}/members/${session.discord_id}`,
    process.env.DISCORD_BOT_TOKEN!,
    true
  );
  const roles: string[] = discordMember?.roles ?? [];
  if (!roles.includes(process.env.DISCORD_STAFF_ROLE_ID!)) {
    return json({ error: "Forbidden" }, 403);
  }

  // ── Parse body ────────────────────────────────────────────
  let body: MemberBody;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const isUpdate = !!body.id;

  // ── UPDATE ────────────────────────────────────────────────
  if (isUpdate) {
    // Fetch existing row
    const { data: existing, error: fetchErr } = await supabase
      .from("clan_list_members")
      .select("*")
      .eq("id", body.id)
      .single();

    if (fetchErr || !existing) {
      return json({ error: "Member not found" }, 404);
    }

    // Merge fields
    const upd: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.discord_name !== undefined) upd.discord_name = body.discord_name;
    if (body.discord_id !== undefined) upd.discord_id = body.discord_id;
    if (body.ign !== undefined) upd.ign = body.ign;
    if (body.uid !== undefined) upd.uid = body.uid;
    if (body.join_date !== undefined) upd.join_date = body.join_date;
    if (body.rank_current !== undefined) upd.rank_current = body.rank_current;
    if (body.needs_resolution !== undefined) upd.needs_resolution = body.needs_resolution;

    // Determine new status + tag for freeze logic
    const newStatus = body.status ?? existing.status;
    const newTag =
      body.has_420_tag !== undefined ? body.has_420_tag : existing.has_420_tag;
    upd.status = newStatus;
    upd.has_420_tag = newTag;

    const wasActive =
      existing.status === "active" && existing.has_420_tag === true;
    const nowActive = newStatus === "active" && newTag === true;

    // Handle freeze / unfreeze
    if (wasActive && !nowActive) {
      // Freeze: accumulate counted days, clear counting_since
      if (existing.counting_since) {
        const extraDays = Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(existing.counting_since).getTime()) /
              86_400_000
          )
        );
        upd.frozen_days = (existing.frozen_days || 0) + extraDays;
      }
      upd.counting_since = null;
    } else if (!wasActive && nowActive) {
      // Unfreeze: start counting from now
      upd.counting_since = new Date().toISOString();
    }

    // Recompute promotion fields
    const frozenDays = (upd.frozen_days as number) ?? existing.frozen_days ?? 0;
    const countingSince =
      (upd.counting_since as string | null) ?? existing.counting_since;
    const days = computeTimeDays(frozenDays, countingSince);
    const currentRank =
      (upd.rank_current as string) ?? existing.rank_current ?? "Private";
    const earned = earnedRank(days);
    const currentIdx = rankIndex(currentRank);
    const earnedIdx = RANK_LADDER.indexOf(earned);
    const nxt = nextRankFor(currentRank, days);

    upd.rank_next = nxt?.name ?? null;
    upd.promote_eligible =
      nowActive &&
      earnedIdx > currentIdx &&
      currentIdx < RANK_LADDER.length - 1;
    upd.promote_reason =
      upd.promote_eligible && nxt
        ? `${days} days in clan, meets ${earned.name} threshold (${earned.daysRequired} days)`
        : null;

    const { data: result, error: updErr } = await supabase
      .from("clan_list_members")
      .update(upd)
      .eq("id", body.id)
      .select()
      .single();

    if (updErr) {
      console.error("Member update error:", updErr);
      return json({ error: "Update failed" }, 500);
    }

    // Reattach computed days
    return json({
      ok: true,
      member: { ...result, time_in_clan_days: days },
    });
  }

  // ── CREATE ────────────────────────────────────────────────
  if (!body.discord_name || !body.ign || !body.uid || !body.join_date) {
    return json(
      { error: "discord_name, ign, uid, and join_date are required" },
      400
    );
  }

  const status = body.status ?? "active";
  const hasTag = body.has_420_tag ?? false;
  const rankCurrent = body.rank_current ?? "Private";
  const isActive = status === "active" && hasTag;

  const countingSince = isActive
    ? `${body.join_date}T00:00:00.000Z`
    : null;
  const frozenDays = 0;
  const days = computeTimeDays(frozenDays, countingSince);
  const earned = earnedRank(days);
  const currentIdx = rankIndex(rankCurrent);
  const earnedIdx = RANK_LADDER.indexOf(earned);
  const nxt = nextRankFor(rankCurrent, days);

  const record = {
    discord_name: body.discord_name,
    discord_id: body.discord_id ?? null,
    ign: body.ign,
    uid: body.uid,
    join_date: body.join_date,
    status,
    has_420_tag: hasTag,
    rank_current: rankCurrent,
    rank_next: nxt?.name ?? null,
    frozen_days: frozenDays,
    counting_since: countingSince,
    promote_eligible:
      isActive && earnedIdx > currentIdx && currentIdx < RANK_LADDER.length - 1,
    promote_reason:
      isActive && earnedIdx > currentIdx && nxt
        ? `${days} days in clan, meets ${earned.name} threshold (${earned.daysRequired} days)`
        : null,
    needs_resolution: body.needs_resolution ?? !body.discord_id,
    source: "manual" as const,
  };

  const { data: created, error: createErr } = await supabase
    .from("clan_list_members")
    .insert(record)
    .select()
    .single();

  if (createErr) {
    console.error("Member create error:", createErr);
    return json(
      {
        error: "Create failed",
        details: createErr.message,
      },
      500
    );
  }

  await supabase.from("audit_log").insert({
    action: "clan_member_added",
    actor_id: session.discord_id,
    target_id: created.id,
    details: { discord_name: body.discord_name, ign: body.ign, uid: body.uid },
  });

  return json({
    ok: true,
    member: { ...created, time_in_clan_days: days },
  });
};

export { handler };
