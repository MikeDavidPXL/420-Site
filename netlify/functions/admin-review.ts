// /.netlify/functions/admin-review
// POST: accept or reject an application (staff only)
// On accept: assign Private role, remove KOTH role, upsert clan_list_members
import type { Handler } from "@netlify/functions";
import {
  getSessionFromCookie,
  discordFetch,
  supabase,
  json,
  assignRole,
  removeRole,
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

  // ── ACCEPT ────────────────────────────────────────────────
  if (action === "accept") {
    const now = new Date().toISOString();

    // 1. Update application status + timestamps
    const { error: updateErr } = await supabase
      .from("applications")
      .update({
        status: "accepted",
        reviewer_id: session.discord_id,
        reviewer_note: note || null,
        accepted_at: now,
        accepted_by: session.discord_id,
      })
      .eq("id", application_id);

    if (updateErr) {
      console.error("Accept update error:", updateErr);
      return json({ error: "Failed to update application" }, 500);
    }

    // 2. Assign Private role + remove KOTH role
    const roleAssigned = await assignRole(
      app.discord_id,
      process.env.DISCORD_MEMBER_ROLE_ID!
    );
    const roleRemoved = await removeRole(
      app.discord_id,
      process.env.DISCORD_KOTH_PLAYER_ROLE_ID!
    );

    // 3. Upsert clan_list_members — join on discord_id
    let clanMemberId: string | null = null;
    let createdClanMember = false;

    const joinDate = now.split("T")[0]; // YYYY-MM-DD

    // Check if member already exists
    const { data: existing } = await supabase
      .from("clan_list_members")
      .select("id, ign, uid, join_date")
      .eq("discord_id", app.discord_id)
      .maybeSingle();

    if (existing) {
      // Update only non-empty fields; keep existing join_date unless empty
      const updates: Record<string, unknown> = {
        discord_name: app.discord_name,
        status: "active",
        counting_since: now,
        updated_at: now,
      };
      // Only overwrite ign/uid if application has values and existing are empty
      if (app.uid && !existing.uid) updates.uid = app.uid;
      if (!existing.join_date) updates.join_date = joinDate;

      await supabase
        .from("clan_list_members")
        .update(updates)
        .eq("id", existing.id);

      clanMemberId = existing.id;
    } else {
      // Insert new clan member
      const { data: inserted, error: insertErr } = await supabase
        .from("clan_list_members")
        .insert({
          discord_id: app.discord_id,
          discord_name: app.discord_name,
          ign: app.discord_name, // staff can update later
          uid: app.uid || null,
          join_date: joinDate,
          status: "active",
          has_420_tag: false,
          rank_current: "Private",
          frozen_days: 0,
          counting_since: now,
          source: "application",
          needs_resolution: false,
        })
        .select("id")
        .single();

      if (insertErr) {
        console.error("Clan member insert error:", insertErr);
        // Don't fail the whole accept — the role swap already happened
      } else {
        clanMemberId = inserted.id;
        createdClanMember = true;
      }
    }

    // 4. Audit log
    await supabase.from("audit_log").insert({
      action: "application_accepted",
      target_id: application_id,
      actor_id: session.discord_id,
      details: {
        note: note || null,
        role_assigned: roleAssigned,
        role_removed: roleRemoved,
        created_clan_member: createdClanMember,
        clan_member_id: clanMemberId,
        discord_role_result: { assigned: roleAssigned, removed: roleRemoved },
      },
    });

    return json({
      ok: true,
      status: "accepted",
      role_assigned: roleAssigned,
      role_removed: roleRemoved,
      clan_member_created: createdClanMember,
      clan_member_id: clanMemberId,
    });
  }

  // ── REJECT ────────────────────────────────────────────────
  const now = new Date().toISOString();

  const { error: updateErr } = await supabase
    .from("applications")
    .update({
      status: "rejected",
      reviewer_id: session.discord_id,
      reviewer_note: note || null,
      denied_at: now,
      denied_by: session.discord_id,
    })
    .eq("id", application_id);

  if (updateErr) {
    console.error("Reject update error:", updateErr);
    return json({ error: "Failed to update application" }, 500);
  }

  // Audit log
  await supabase.from("audit_log").insert({
    action: "application_denied",
    target_id: application_id,
    actor_id: session.discord_id,
    details: {
      note: note || null,
    },
  });

  return json({
    ok: true,
    status: "rejected",
  });
};

export { handler };
