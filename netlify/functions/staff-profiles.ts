import type { Handler } from "@netlify/functions";
import { getSessionFromCookie, discordFetch, json } from "./shared";

const STAFF_CONFIG = [
  { name: "Jam", role: "Owner", discord_id: "777216423470039040" },
  { name: "Zuo", role: "Owner" },
  { name: "Mike", role: "Web Developer" },
  { name: "Admin1", role: "Clan Admin" },
  { name: "Admin2", role: "Clan Admin" },
  { name: "Admin3", role: "Clan Admin" },
  { name: "Admin4", role: "Clan Admin" },

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

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]/g, "");
}

function pickBestMatch(targetName: string, candidates: GuildMember[]): GuildMember | null {
  const target = normalizeName(targetName);
  const isShortTarget = target.length <= 3;

  const scored = candidates
    .map((member) => {
      const variants = [
        normalizeName(String(member.nick ?? "")),
        normalizeName(String(member.user?.username ?? "")),
        normalizeName(String(member.user?.global_name ?? "")),
      ].filter(Boolean);

      let score = Number.POSITIVE_INFINITY;
      for (const variant of variants) {
        if (variant === target) {
          score = Math.min(score, 0);
        } else if (!isShortTarget && variant.startsWith(target)) {
          score = Math.min(score, 1);
        }
      }

      return { member, score };
    })
    .filter((entry) => Number.isFinite(entry.score))
    .sort((a, b) => a.score - b.score);

  // For short names (like "Jam"), allow only exact matches to avoid false positives (e.g. "Mr Raj")
  if (isShortTarget) {
    return scored.find((entry) => entry.score === 0)?.member ?? null;
  }

  // For longer names, allow exact or starts-with only
  return scored[0]?.member ?? null;
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
      if (staff.discord_id) {
        const directMember = await discordFetch(
          `/guilds/${process.env.DISCORD_GUILD_ID}/members/${staff.discord_id}`,
          process.env.DISCORD_BOT_TOKEN!,
          true
        );

        return {
          name: staff.name,
          role: staff.role,
          discord_id: directMember?.user?.id ?? staff.discord_id,
          avatar_hash: directMember?.user?.avatar ?? null,
        };
      }

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
