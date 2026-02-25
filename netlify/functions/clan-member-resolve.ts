// /.netlify/functions/clan-member-resolve
// POST: manually resolve a clan_list_members row to a selected Discord user id (staff only)
import type { Handler } from "@netlify/functions";
import { getSessionFromCookie, discordFetch, supabase, json } from "./shared";

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const session = getSessionFromCookie(event.headers.cookie);
  if (!session) return json({ error: "Unauthorized" }, 401);

  const staffMember = await discordFetch(
    `/guilds/${process.env.DISCORD_GUILD_ID}/members/${session.discord_id}`,
    process.env.DISCORD_BOT_TOKEN!,
    true
  );
  const roles: string[] = staffMember?.roles ?? [];
  if (!roles.includes(process.env.DISCORD_STAFF_ROLE_ID!)) {
    return json({ error: "Forbidden" }, 403);
  }

  let body: { member_row_id?: string; selected_discord_id?: string };
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!body.member_row_id || !body.selected_discord_id) {
    return json({ error: "member_row_id and selected_discord_id are required" }, 400);
  }

  const selectedMember = await discordFetch(
    `/guilds/${process.env.DISCORD_GUILD_ID}/members/${body.selected_discord_id}`,
    process.env.DISCORD_BOT_TOKEN!,
    true
  );
  if (!selectedMember) {
    return json({ error: "selected_discord_id is not in guild", code: "DISCORD_NOT_IN_GUILD" }, 400);
  }

  const { data: existing, error: fetchErr } = await supabase
    .from("clan_list_members")
    .select("id, discord_id")
    .eq("id", body.member_row_id)
    .single();

  if (fetchErr || !existing) {
    return json({ error: "Member row not found" }, 404);
  }

  const now = new Date().toISOString();

  const { data: updated, error: updErr } = await supabase
    .from("clan_list_members")
    .update({
      discord_id: body.selected_discord_id,
      needs_resolution: false,
      resolution_status: "resolved_manual",
      resolved_at: now,
      resolved_by: session.discord_id,
      updated_at: now,
    })
    .eq("id", body.member_row_id)
    .select("id, discord_id, resolution_status, resolved_at, resolved_by")
    .single();

  if (updErr) {
    return json({ error: "Failed to resolve member", details: updErr.message }, 500);
  }

  await supabase.from("audit_log").insert({
    action: "clan_member_resolved_manual",
    actor_id: session.discord_id,
    target_id: body.member_row_id,
    details: {
      old_discord_id: existing.discord_id,
      new_discord_id: body.selected_discord_id,
      resolution_status: "resolved_manual",
    },
  });

  return json({ ok: true, member: updated });
};

export { handler };
