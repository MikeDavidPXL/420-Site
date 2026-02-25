// /.netlify/functions/admin-list
// GET: list all applications (staff only)
import type { Handler } from "@netlify/functions";
import { getSessionFromCookie, discordFetch, supabase, json } from "./shared";

const handler: Handler = async (event) => {
  // Auth check
  const session = getSessionFromCookie(event.headers.cookie);
  if (!session) return json({ error: "Unauthorized" }, 401);

  // Staff role check via Discord
  const member = await discordFetch(
    `/guilds/${process.env.DISCORD_GUILD_ID}/members/${session.discord_id}`,
    process.env.DISCORD_BOT_TOKEN!,
    true
  );
  const roles: string[] = member?.roles ?? [];
  if (!roles.includes(process.env.DISCORD_STAFF_ROLE_ID!)) {
    return json({ error: "Forbidden" }, 403);
  }

  // Query params
  const status = event.queryStringParameters?.status; // pending | accepted | rejected
  const showArchived = event.queryStringParameters?.show_archived === "true";

  let query = supabase
    .from("applications")
    .select("*, application_notes(id, note, created_at, created_by, created_by_username)")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  // By default hide archived applications; show only when explicitly requested
  if (!showArchived) {
    query = query.is("archived_at", null);
  }

  const { data, error } = await query;
  if (error) {
    console.error("List error:", error);
    return json({ error: "Failed to fetch applications" }, 500);
  }

  // Sort nested notes newest-first
  const apps = (data ?? []).map((app: any) => ({
    ...app,
    application_notes: (app.application_notes ?? []).sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
  }));

  return json({ applications: apps });
};

export { handler };
