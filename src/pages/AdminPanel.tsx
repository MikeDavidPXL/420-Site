// Admin Panel — standalone page for staff only
// Archive / restore support, expandable application cards
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { Navigate, Link } from "react-router-dom";
import {
  Shield,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  LogOut,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import clanLogo from "@/assets/clan-logo.png";

// ── Types ─────────────────────────────────────────────────
interface AdminApp {
  id: string;
  discord_id: string;
  discord_name: string;
  uid: string;
  age: number;
  speaks_english: boolean;
  timezone: string;
  activity: string;
  level: string;
  playstyle: string;
  banned_koth_cheating: boolean;
  looking_for: string;
  has_mic: boolean;
  clan_history: string;
  status: string;
  reviewer_note: string | null;
  created_at: string;
  archived_at: string | null;
  archived_by: string | null;
  archive_reason: string | null;
}

type Filter = "all" | "pending" | "accepted" | "rejected";

// ══════════════════════════════════════════════════════════
//  ADMIN PANEL PAGE
// ══════════════════════════════════════════════════════════
const AdminPanel = () => {
  const { user, loading: authLoading } = useAuth();
  const [apps, setApps] = useState<AdminApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("pending");
  const [showArchived, setShowArchived] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
      if (showArchived) params.set("show_archived", "true");
      const qs = params.toString() ? `?${params}` : "";
      const res = await fetch(`/.netlify/functions/admin-list${qs}`);
      const data = await res.json();
      setApps(data.applications ?? []);
    } catch {
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, [filter, showArchived]);

  useEffect(() => {
    if (user?.is_staff) fetchApps();
  }, [user, fetchApps]);

  const review = async (appId: string, action: "accept" | "reject") => {
    setActionLoading(appId);
    try {
      const res = await fetch("/.netlify/functions/admin-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: appId, action, note }),
      });
      if (res.ok) {
        setNote("");
        setExpanded(null);
        await fetchApps();
      }
    } finally {
      setActionLoading(null);
    }
  };

  const archiveAction = async (
    appId: string,
    action: "archive" | "restore",
    reason?: string
  ) => {
    setActionLoading(appId);
    try {
      const res = await fetch("/.netlify/functions/admin-archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: appId, action, reason }),
      });
      if (res.ok) {
        await fetchApps();
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Guard: staff only
  if (!authLoading && (!user || !user.is_staff)) {
    return <Navigate to="/pack" replace />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const statusIcon = (s: string) => {
    if (s === "pending") return <Clock className="w-4 h-4 text-yellow-400" />;
    if (s === "accepted") return <CheckCircle className="w-4 h-4 text-green-400" />;
    return <XCircle className="w-4 h-4 text-red-400" />;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top bar ─────────────────────────────────────── */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border shadow-lg"
      >
        <div className="container mx-auto px-4 flex items-center justify-between h-16">
          <Link
            to="/pack"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <img src={clanLogo} alt="420 Clan Logo" className="w-8 h-8 rounded-full" />
            <span className="font-display text-sm font-bold hidden sm:block">
              Back to Pack
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-secondary" />
            <span className="font-display text-lg font-bold text-secondary hidden sm:block">
              Admin Panel
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {user!.avatar && (
                <img
                  src={user!.avatar}
                  alt=""
                  className="w-8 h-8 rounded-full border border-border"
                />
              )}
              <span className="text-sm text-foreground hidden sm:block">
                {user!.username}
              </span>
            </div>
            <a
              href="/.netlify/functions/logout"
              className="text-muted-foreground hover:text-destructive transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </a>
          </div>
        </div>
      </motion.nav>

      {/* ── Content ─────────────────────────────────────── */}
      <div className="container mx-auto px-4 max-w-4xl py-12">
        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap justify-center">
          {(["pending", "accepted", "rejected", "all"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`font-display text-sm px-4 py-1.5 rounded-lg border transition ${
                filter === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Show archived toggle + result count */}
        <div className="flex items-center justify-between mb-6">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="accent-primary w-4 h-4 rounded"
            />
            <Archive className="w-4 h-4" />
            Show archived
          </label>
          <span className="text-sm text-muted-foreground">
            {apps.length} result{apps.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading && (
          <div className="text-center py-12">
            <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
          </div>
        )}

        {!loading && apps.length === 0 && (
          <p className="text-center text-muted-foreground py-12">
            No applications found.
          </p>
        )}

        <div className="space-y-3">
          {apps.map((app) => {
            const isArchived = !!app.archived_at;

            return (
              <div
                key={app.id}
                className={`bg-card border rounded-lg overflow-hidden transition-all duration-300 ${
                  isArchived
                    ? "border-muted opacity-60 hover:opacity-80"
                    : "border-border hover:neon-border-blue"
                }`}
              >
                <button
                  onClick={() =>
                    setExpanded(expanded === app.id ? null : app.id)
                  }
                  className="w-full flex items-center gap-4 px-5 py-4 text-left"
                >
                  {statusIcon(app.status)}
                  <span className="font-display text-sm font-bold text-foreground flex-1">
                    {app.discord_name}{" "}
                    <span className="text-muted-foreground font-normal">
                      (UID: {app.uid})
                    </span>
                    {isArchived && (
                      <span className="ml-2 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        archived
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(app.created_at).toLocaleDateString()}
                  </span>
                  {expanded === app.id ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>

                {expanded === app.id && (
                  <div className="border-t border-border px-5 py-5 space-y-3">
                    <Detail label="Discord ID" value={app.discord_id} />
                    <Detail label="UID" value={app.uid} />
                    <Detail label="Age" value={String(app.age)} />
                    <Detail
                      label="Speaks English"
                      value={yesNo(app.speaks_english)}
                    />
                    <Detail label="Timezone" value={app.timezone} />
                    <Detail label="Activity" value={app.activity} />
                    <Detail label="Level" value={app.level} />
                    <Detail
                      label="Preferred playstyle"
                      value={app.playstyle}
                    />
                    <Detail
                      label="Banned from KOTH (cheating)"
                      value={yesNo(app.banned_koth_cheating)}
                    />
                    <Detail
                      label="Looking for in a clan"
                      value={app.looking_for}
                    />
                    <Detail label="Has mic" value={yesNo(app.has_mic)} />
                    <Detail
                      label="Current/previous clan membership"
                      value={app.clan_history}
                    />
                    {app.reviewer_note && (
                      <Detail
                        label="Reviewer note"
                        value={app.reviewer_note}
                      />
                    )}
                    {isArchived && app.archive_reason && (
                      <Detail
                        label="Archive reason"
                        value={app.archive_reason}
                      />
                    )}

                    {/* ── Accept / Reject (pending only) ─── */}
                    {app.status === "pending" && !isArchived && (
                      <div className="pt-3 border-t border-border space-y-3">
                        <textarea
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Optional note (shown to user if rejected)..."
                          rows={2}
                          className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                        />
                        <div className="flex gap-3">
                          <button
                            onClick={() => review(app.id, "accept")}
                            disabled={actionLoading === app.id}
                            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-display font-bold py-2.5 rounded-lg transition disabled:opacity-50"
                          >
                            {actionLoading === app.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            Accept
                          </button>
                          <button
                            onClick={() => review(app.id, "reject")}
                            disabled={actionLoading === app.id}
                            className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-display font-bold py-2.5 rounded-lg transition disabled:opacity-50"
                          >
                            {actionLoading === app.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                            Reject
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── Archive / Restore ────────────── */}
                    <div className="pt-3 border-t border-border">
                      {isArchived ? (
                        <button
                          onClick={() => archiveAction(app.id, "restore")}
                          disabled={actionLoading === app.id}
                          className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition disabled:opacity-50"
                        >
                          {actionLoading === app.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ArchiveRestore className="w-4 h-4" />
                          )}
                          Restore from archive
                        </button>
                      ) : (
                        <button
                          onClick={() => archiveAction(app.id, "archive")}
                          disabled={actionLoading === app.id}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition disabled:opacity-50"
                        >
                          {actionLoading === app.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Archive className="w-4 h-4" />
                          )}
                          Archive
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Helpers ──────────────────────────────────────────────
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-display text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <p className="text-sm text-foreground mt-0.5">{value}</p>
    </div>
  );
}

function yesNo(value: boolean) {
  return value ? "Yes" : "No";
}

export default AdminPanel;
