// /.netlify/functions/admin-review
// POST: accept or reject an application (staff only)
import type { Handler } from "@netlify/functions";
import {
  getSessionFromCookie,
  discordFetch,
  supabase,
  json,
  assignRole,
} from "./shared";

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // Auth check
  const session = getSessionFromCookie(event.headers.cookie);
  if (!session) return json({ error: "Unauthorized" }, 401);

  // Staff role check
  const member = await discordFetch(
    `/guilds/${process.env.DISCORD_GUILD_ID}/members/${session.discord_id}`,
    process.env.DISCORD_BOT_TOKEN!,
    true
  );
  const roles: string[] = member?.roles ?? [];
  if (!roles.includes(process.env.DISCORD_STAFF_ROLE_ID!)) {
    return json({ error: "Forbidden" }, 403);
  }

  let body: any;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const { application_id, action, note } = body;
  if (!application_id || !["accept", "reject"].includes(action)) {
    return json({ error: "application_id and action (accept|reject) required" }, 400);
  }

  // Get application
  const { data: app, error: fetchErr } = await supabase
    .from("applications")
    .select("*")
    .eq("id", application_id)
    .single();

  if (fetchErr || !app) {
    return json({ error: "Application not found" }, 404);
  }

  const newStatus = action === "accept" ? "accepted" : "rejected";

  // Update status
  const { error: updateErr } = await supabase
    .from("applications")
    .update({
      status: newStatus,
      reviewer_id: session.discord_id,
      reviewer_note: note || null,
    })
    .eq("id", application_id);

  if (updateErr) {
    console.error("Update error:", updateErr);
    return json({ error: "Failed to update application" }, 500);
  }

  // On accept → assign Discord role
  let roleAssigned = false;
  if (action === "accept") {
    roleAssigned = await assignRole(
      app.discord_id,
      process.env.DISCORD_MEMBER_ROLE_ID!
    );
  }

  // Audit log
  await supabase.from("audit_log").insert({
    action: `application_${newStatus}`,
    target_id: application_id,
    actor_id: session.discord_id,
    details: { note: note || null, role_assigned: roleAssigned },
  });

  return json({ ok: true, status: newStatus, role_assigned: roleAssigned });
};

export { handler };
