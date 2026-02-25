// /.netlify/functions/clan-list-bulk-resolve
// POST: attempt to auto-resolve all unresolved clan_list_members against guild (staff only)
import type { Handler } from "@netlify/functions";
import {
  getSessionFromCookie,
  discordFetch,
  supabase,
  json,
  fetchAllGuildMembers,
  searchGuildMemberCandidates,
  normalizeLookup,
} from "./shared";

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

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

  // 1. Fetch all unresolved members
  const { data: unresolved, error: fetchErr } = await supabase
    .from("clan_list_members")
    .select("id, discord_name, discord_id")
    .or("discord_id.is.null,needs_resolution.eq.true");

  if (fetchErr) {
    return json({ error: "Failed to fetch unresolved members" }, 500);
  }

  if (!unresolved || unresolved.length === 0) {
    return json({ ok: true, resolved: 0, skipped: 0, ambiguous: 0, not_found: 0, details: [] });
  }

  // 2. Fetch all guild members once
  const guildMembers = await fetchAllGuildMembers();
  const nowIso = new Date().toISOString();

  let resolved = 0;
  let skipped = 0;
  let ambiguous = 0;
  let notFound = 0;
  const details: { discord_name: string; result: string }[] = [];

  for (const row of unresolved) {
    // Skip if already has a discord_id and isn't flagged
    if (row.discord_id && row.discord_id.length > 0) {
      skipped++;
      details.push({ discord_name: row.discord_name, result: "already_has_id" });
      continue;
    }

    const candidates = searchGuildMemberCandidates(guildMembers, row.discord_name, 25);
    const normalizedQuery = normalizeLookup(row.discord_name);

    // Try exact match first
    const exact = candidates.filter((c) =>
      normalizeLookup(c.username) === normalizedQuery ||
      normalizeLookup(c.display_name) === normalizedQuery ||
      normalizeLookup(c.nick ?? "") === normalizedQuery
    );

    let matchedId: string | null = null;

    if (exact.length === 1) {
      matchedId = exact[0].discord_id;
    } else if (exact.length === 0 && candidates.length === 1) {
      matchedId = candidates[0].discord_id;
    }

    if (matchedId) {
      const { error: updErr } = await supabase
        .from("clan_list_members")
        .update({
          discord_id: matchedId,
          needs_resolution: false,
          resolution_status: "resolved_auto",
          resolved_at: nowIso,
          resolved_by: null,
          updated_at: nowIso,
        })
        .eq("id", row.id);

      if (!updErr) {
        resolved++;
        details.push({ discord_name: row.discord_name, result: "resolved" });
      } else {
        skipped++;
        details.push({ discord_name: row.discord_name, result: `db_error: ${updErr.message}` });
      }
    } else if (exact.length > 1 || candidates.length > 1) {
      ambiguous++;
      details.push({ discord_name: row.discord_name, result: `ambiguous (${candidates.length} matches)` });
    } else {
      notFound++;
      details.push({ discord_name: row.discord_name, result: "not_found" });
    }
  }

  await supabase.from("audit_log").insert({
    action: "clan_list_bulk_resolve",
    actor_id: session.discord_id,
    details: {
      total_unresolved: unresolved.length,
      resolved,
      skipped,
      ambiguous,
      not_found: notFound,
    },
  });

  return json({
    ok: true,
    total_checked: unresolved.length,
    resolved,
    skipped,
    ambiguous,
    not_found: notFound,
    details,
  });
};

export { handler };
