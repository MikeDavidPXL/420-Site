// /.netlify/functions/guild-member-search
// GET: search Discord guild members by nickname/global display name/username (staff only)
// Returns opaque resolve_tokens instead of raw discord_ids
import type { Handler } from "@netlify/functions";
import {
  getSessionFromCookie,
  discordFetch,
  supabase,
  json,
  fetchAllGuildMembers,
  searchGuildMemberCandidates,
  signResolveToken,
} from "./shared";

const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") {
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

  const query = (event.queryStringParameters?.q ?? "").trim();
  if (!query) return json({ candidates: [] });

  const guildMembers = await fetchAllGuildMembers();
  const rawCandidates = searchGuildMemberCandidates(guildMembers, query, 20);

  // Map to opaque format: no discord_id exposed, only resolve_token
  const candidates = rawCandidates.map((c) => ({
    label: c.display_name,
    sublabel: `@${c.username}${c.nick ? ` (nick: ${c.nick})` : ""}`,
    resolve_token: signResolveToken(c.discord_id),
  }));

  await supabase.from("audit_log").insert({
    action: "guild_member_search",
    actor_id: session.discord_id,
    details: {
      query,
      result_count: candidates.length,
    },
  });

  return json({ candidates });
};

export { handler };
