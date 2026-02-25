// Shared helpers for all Netlify Functions
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";
import { parse } from "cookie";

// ── Supabase ────────────────────────────────────────────────
export const supabase = createClient(
  process.env.SUPABASE_DATABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── JWT Session ─────────────────────────────────────────────
const SECRET = process.env.SESSION_SECRET!;

export interface SessionPayload {
  discord_id: string;
  username: string;
  avatar: string | null;
}

export function createSession(payload: SessionPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export function getSessionFromCookie(
  cookieHeader: string | undefined
): SessionPayload | null {
  if (!cookieHeader) return null;
  const cookies = parse(cookieHeader);
  const token = cookies["session"];
  if (!token) return null;
  return verifySession(token);
}

// ── Discord helpers ─────────────────────────────────────────
const DISCORD_API = "https://discord.com/api/v10";

export async function discordFetch(path: string, token: string, bot = false) {
  const res = await fetch(`${DISCORD_API}${path}`, {
    headers: {
      Authorization: bot ? `Bot ${token}` : `Bearer ${token}`,
    },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function assignRole(userId: string, roleId: string) {
  const res = await fetch(
    `${DISCORD_API}/guilds/${process.env.DISCORD_GUILD_ID}/members/${userId}/roles/${roleId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
  return res.ok;
}

export async function removeRole(userId: string, roleId: string) {
  const res = await fetch(
    `${DISCORD_API}/guilds/${process.env.DISCORD_GUILD_ID}/members/${userId}/roles/${roleId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
  return res.ok;
}

// ── Rank ladder ─────────────────────────────────────────────
export interface RankDef {
  name: string;
  roleId: string | null;
  daysRequired: number;
}

export const RANK_LADDER: RankDef[] = [
  { name: "Private",    roleId: null,                    daysRequired: 0  },
  { name: "Corporal",   roleId: "1374050435484094525",   daysRequired: 14 },
  { name: "Sergeant",   roleId: "1378450788069933206",   daysRequired: 30 },
  { name: "Lieutenant", roleId: "1378450714845778022",   daysRequired: 60 },
  { name: "Major",      roleId: "1378450739885637702",   daysRequired: 90 },
];

export const RANK_ROLE_IDS = RANK_LADDER
  .map((r) => r.roleId)
  .filter(Boolean) as string[];

/** Get the rank index (0 = Private, 4 = Major) */
export function rankIndex(name: string): number {
  const idx = RANK_LADDER.findIndex(
    (r) => r.name.toLowerCase() === name.toLowerCase()
  );
  return idx === -1 ? 0 : idx;
}

/** Calculate effective time in clan (days) */
export function computeTimeDays(
  frozenDays: number,
  countingSince: string | null
): number {
  if (!countingSince) return frozenDays;
  const now = Date.now();
  const since = new Date(countingSince).getTime();
  const diff = Math.max(0, Math.floor((now - since) / 86_400_000));
  return frozenDays + diff;
}

/** Determine the highest rank earned based on days */
export function earnedRank(days: number): RankDef {
  let earned = RANK_LADDER[0];
  for (const rank of RANK_LADDER) {
    if (days >= rank.daysRequired) earned = rank;
  }
  return earned;
}

/** Determine next rank above current rank (null if already Major) */
export function nextRankFor(currentRank: string, days: number): RankDef | null {
  const idx = rankIndex(currentRank);
  if (idx >= RANK_LADDER.length - 1) return null; // already Major
  const next = RANK_LADDER[idx + 1];
  if (days >= next.daysRequired) return next;
  return next; // show upcoming rank even if not yet earned
}

// ── Fetch all guild members (paginated) ─────────────────────
export interface GuildMember {
  user: { id: string; username: string; global_name?: string | null };
  nick?: string | null;
  roles: string[];
}

export async function fetchAllGuildMembers(): Promise<GuildMember[]> {
  const allMembers: GuildMember[] = [];
  let after = "0";
  const limit = 1000;

  while (true) {
    const data = await discordFetch(
      `/guilds/${process.env.DISCORD_GUILD_ID}/members?limit=${limit}&after=${after}`,
      process.env.DISCORD_BOT_TOKEN!,
      true
    );
    if (!data || !Array.isArray(data) || data.length === 0) break;
    allMembers.push(...data);
    if (data.length < limit) break;
    after = data[data.length - 1].user.id;
  }

  return allMembers;
}

/** Try to resolve discord_id from a display name.
 *  Strategy: exact match on username/global_name/nick → partial contains →
 *  first-word match. Names are cleaned of newlines/extra whitespace. */
export function resolveDiscordId(
  displayName: string,
  guildMembers: GuildMember[]
): { id: string | null; multiple: boolean } {
  const lower = displayName.toLowerCase().replace(/[\r\n]+/g, "").trim();
  if (!lower) return { id: null, multiple: false };

  const clean = (s: string | null | undefined) =>
    (s ?? "").toLowerCase().replace(/[\r\n]+/g, "").trim();

  // 1. Exact match on username / global_name / nick
  const exact = guildMembers.filter((m) => {
    const un = clean(m.user.username);
    const gn = clean(m.user.global_name);
    const nn = clean(m.nick);
    return un === lower || gn === lower || nn === lower;
  });
  if (exact.length === 1) return { id: exact[0].user.id, multiple: false };
  if (exact.length > 1) return { id: null, multiple: true };

  // 2. Username starts-with or contains (for names with trailing junk)
  const partial = guildMembers.filter((m) => {
    const un = clean(m.user.username);
    return un.startsWith(lower) || lower.startsWith(un);
  });
  if (partial.length === 1) return { id: partial[0].user.id, multiple: false };

  return { id: null, multiple: false };
}

/** Check if a guild member has "420" in any name field */
export function has420InName(member: GuildMember): boolean {
  const names = [
    member.user.username,
    member.user.global_name,
    member.nick,
  ].filter(Boolean) as string[];
  return names.some((n) => n.includes("420"));
}

// ── Post to a Discord channel ───────────────────────────────
export async function postChannelMessage(
  channelId: string,
  content: string
): Promise<boolean> {
  const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`postChannelMessage failed: ${res.status} ${res.statusText}`, body);
  }
  return res.ok;
}

// ── Response helpers ────────────────────────────────────────
export function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
    body: JSON.stringify(body),
  };
}

export function redirect(url: string, cookie?: string) {
  const headers: Record<string, string> = { Location: url };
  if (cookie) headers["Set-Cookie"] = cookie;
  return { statusCode: 302, headers, body: "" };
}
