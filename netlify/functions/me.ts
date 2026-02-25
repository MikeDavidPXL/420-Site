// /.netlify/functions/me
// Returns the current session user + application status + admin flag
import type { Handler } from "@netlify/functions";
import { getSessionFromCookie, discordFetch, supabase, json } from "./shared";

const handler: Handler = async (event) => {
  const session = getSessionFromCookie(event.headers.cookie);
  if (!session) {
    return json({ user: null }, 200);
  }

  // Check guild membership via bot
  const member = await discordFetch(
    `/guilds/${process.env.DISCORD_GUILD_ID}/members/${session.discord_id}`,
    process.env.DISCORD_BOT_TOKEN!,
    true
  );

  const inGuild = !!member;
  const roles: string[] = member?.roles ?? [];
  const isStaff = roles.includes(process.env.DISCORD_STAFF_ROLE_ID!);
  const isMember = roles.includes(process.env.DISCORD_MEMBER_ROLE_ID!);

  // Get latest application status
  const { data: app } = await supabase
    .from("applications")
    .select("id, status, created_at")
    .eq("discord_id", session.discord_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return json({
    user: {
      discord_id: session.discord_id,
      username: session.username,
      avatar: session.avatar,
      in_guild: inGuild,
      is_staff: isStaff,
      is_member: isMember,
      application: app ?? null,
    },
  });
};

export { handler };
