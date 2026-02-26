import type { Handler } from "@netlify/functions";
import { getSessionFromCookie, discordFetch, json } from "./shared";

const STAFF_CONFIG = [
  { name: "Jam", role: "Owner" },
  { name: "Zuo", role: "Owner" },
  { name: "Mike", role: "Web Developer" },
  { name: "Admin1", role: "Clan Admin" },
  { name: "Admin2", role: "Clan Admin" },
] as const;

type GuildMember = {
  nick?: string | null;
  user?: {
    id: string;
    username: string;
    global_name?: string | null;
    avatar?: string | null;
  };
};

function pickBestMatch(targetName: string, candidates: GuildMember[]): GuildMember | null {
  const lower = targetName.toLowerCase();

  const exact = candidates.find((m) => {
    const nick = String(m.nick ?? "").toLowerCase();
    const username = String(m.user?.username ?? "").toLowerCase();
    const globalName = String(m.user?.global_name ?? "").toLowerCase();
    return nick === lower || username === lower || globalName === lower;
  });
  if (exact) return exact;

  const partial = candidates.find((m) => {
    const nick = String(m.nick ?? "").toLowerCase();
    const username = String(m.user?.username ?? "").toLowerCase();
    const globalName = String(m.user?.global_name ?? "").toLowerCase();
    return nick.includes(lower) || username.includes(lower) || globalName.includes(lower);
  });

  return partial ?? candidates[0] ?? null;
}

const handler: Handler = async (event) => {
  const session = getSessionFromCookie(event.headers.cookie);
  if (!session) return json({ error: "Unauthorized" }, 401);

  const selfMember = await discordFetch(
    `/guilds/${process.env.DISCORD_GUILD_ID}/members/${session.discord_id}`,
    process.env.DISCORD_BOT_TOKEN!,
    true
  );

  if (!selfMember) {
    return json({ error: "Forbidden" }, 403);
  }

  const profiles = await Promise.all(
    STAFF_CONFIG.map(async (staff) => {
      const result = (await discordFetch(
        `/guilds/${process.env.DISCORD_GUILD_ID}/members/search?query=${encodeURIComponent(staff.name)}&limit=10`,
        process.env.DISCORD_BOT_TOKEN!,
        true
      )) as GuildMember[] | null;

      const match = pickBestMatch(staff.name, result ?? []);

      return {
        name: staff.name,
        role: staff.role,
        discord_id: match?.user?.id ?? null,
        avatar_hash: match?.user?.avatar ?? null,
      };
    })
  );

  return json({ staff: profiles });
};

export { handler };
