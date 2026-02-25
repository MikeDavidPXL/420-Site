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
