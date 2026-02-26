import type { Handler } from "@netlify/functions";
import { getSessionFromCookie, discordFetch, json, supabase } from "./shared";

type StaffProfileRow = {
  discord_id: string;
  display_name: string;
  role: string;
  sort_order: number;
};

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

  const { data: staffRows, error } = await supabase
    .from("staff_profiles")
    .select("discord_id, display_name, role, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("display_name", { ascending: true });

  if (error) {
    console.error("staff-profiles query failed:", error);
    return json({ error: "Failed to fetch staff profiles" }, 500);
  }

  const profiles = await Promise.all(
    ((staffRows ?? []) as StaffProfileRow[]).map(async (staff) => {
      const member = await discordFetch(
        `/guilds/${process.env.DISCORD_GUILD_ID}/members/${staff.discord_id}`,
        process.env.DISCORD_BOT_TOKEN!,
        true
      );

      return {
        name: staff.display_name,
        role: staff.role,
        discord_id: staff.discord_id,
        avatar_hash: member?.user?.avatar ?? null,
      };
    })
  );

  return json({ staff: profiles });
};

export { handler };
