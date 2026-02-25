// /.netlify/functions/clan-list-members
// GET: paginated list of clan_list_members with search & filters (staff only)
import type { Handler } from "@netlify/functions";
import {
  getSessionFromCookie,
  discordFetch,
  supabase,
  json,
  computeTimeDays,
  earnedRank,
  nextRankFor,
  rankIndex,
  RANK_LADDER,
} from "./shared";

const PAGE_SIZE = 50;

const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  // ── Auth ──────────────────────────────────────────────────
  const session = getSessionFromCookie(event.headers.cookie);
  if (!session) return json({ error: "Unauthorized" }, 401);

  const member = await discordFetch(
    `/guilds/${process.env.DISCORD_GUILD_ID}/members/${session.discord_id}`,
    process.env.DISCORD_BOT_TOKEN!,
    true
  );
  const roles: string[] = member?.roles ?? [];
  if (!roles.includes(process.env.DISCORD_STAFF_ROLE_ID!)) {
    return json({ error: "Forbidden" }, 403);
  }

  // ── Query params ──────────────────────────────────────────
  const params = event.queryStringParameters ?? {};
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const search = (params.search ?? "").trim();
  const statusFilter = params.status; // active | inactive
  const tagFilter = params.has_420_tag; // true | false
  const promoFilter = params.promotion_due; // true | false

  // ── Build query ───────────────────────────────────────────
  let query = supabase
    .from("clan_list_members")
    .select("*", { count: "exact" })
    .order("join_date", { ascending: true });

  if (statusFilter === "active" || statusFilter === "inactive") {
    query = query.eq("status", statusFilter);
  }
  if (tagFilter === "true") query = query.eq("has_420_tag", true);
  if (tagFilter === "false") query = query.eq("has_420_tag", false);
  if (promoFilter === "true") query = query.eq("promote_eligible", true);
  if (promoFilter === "false") query = query.eq("promote_eligible", false);

  if (search) {
    query = query.or(
      `discord_name.ilike.%${search}%,ign.ilike.%${search}%,uid.ilike.%${search}%`
    );
  }

  const from = (page - 1) * PAGE_SIZE;
  query = query.range(from, from + PAGE_SIZE - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error("clan_list_members query error:", error);
    return json({ error: "Failed to fetch members" }, 500);
  }

  const total = count ?? 0;

  // Recompute time_in_clan_days live for each row
  const members = (data ?? []).map((m: any) => {
    const days = computeTimeDays(m.frozen_days, m.counting_since);
    const earned = earnedRank(days);
    const currentIdx = rankIndex(m.rank_current);
    const earnedIdx = RANK_LADDER.indexOf(earned);
    // Determine if promotion is due
    const needsPromo =
      m.status === "active" &&
      m.has_420_tag &&
      earnedIdx > currentIdx &&
      currentIdx < RANK_LADDER.length - 1;
    const nxt = nextRankFor(m.rank_current, days);

    return {
      ...m,
      time_in_clan_days: days,
      rank_next: nxt?.name ?? null,
      promote_eligible: needsPromo,
      promote_reason: needsPromo && nxt
        ? `${days} days in clan, meets ${earned.name} threshold (${earned.daysRequired} days)`
        : null,
    };
  });

  // Counts for UI
  const { count: promoCount } = await supabase
    .from("clan_list_members")
    .select("id", { count: "exact", head: true })
    .eq("promote_eligible", true);

  const { count: unresolvedCount } = await supabase
    .from("clan_list_members")
    .select("id", { count: "exact", head: true })
    .eq("needs_resolution", true);

  return json({
    members,
    total,
    page,
    page_size: PAGE_SIZE,
    total_pages: Math.ceil(total / PAGE_SIZE),
    promotion_due_count: promoCount ?? 0,
    unresolved_count: unresolvedCount ?? 0,
  });
};

export { handler };
