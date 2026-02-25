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
} from "lucide-react";

interface Application {
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
}

type Filter = "all" | "pending" | "accepted" | "rejected";

const AdminPanel = () => {
  const { user, loading: authLoading } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("pending");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const qs = filter === "all" ? "" : `?status=${filter}`;
      const res = await fetch(`/.netlify/functions/admin-list${qs}`);
      const data = await res.json();
      setApps(data.applications ?? []);
    } catch {
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

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

  // Guard
  if (!authLoading && (!user || !user.is_staff)) {
    return <Navigate to="/dashboard" replace />;
  }

  const statusIcon = (s: string) => {
    if (s === "pending")
      return <Clock className="w-4 h-4 text-yellow-400" />;
    if (s === "accepted")
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    return <XCircle className="w-4 h-4 text-red-400" />;
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 smoke-overlay pointer-events-none" />

      <div className="relative z-10 container mx-auto px-4 py-12 max-w-4xl">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-8">
            <Shield className="w-7 h-7 text-secondary" />
            <h1 className="font-display text-3xl font-bold neon-text-purple text-secondary">
              Admin Panel
            </h1>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {(["pending", "accepted", "rejected", "all"] as Filter[]).map(
              (f) => (
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
              )
            )}
            <span className="ml-auto text-sm text-muted-foreground self-center">
              {apps.length} result{apps.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Loading */}
          {loading && (
            <div className="text-center py-12">
              <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
            </div>
          )}

          {/* List */}
          {!loading && apps.length === 0 && (
            <p className="text-center text-muted-foreground py-12">
              No applications found.
            </p>
          )}

          <div className="space-y-3">
            {apps.map((app) => (
              <div
                key={app.id}
                className="bg-card border border-border rounded-lg overflow-hidden hover:neon-border-blue transition-all duration-300"
              >
                {/* Summary row */}
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

                {/* Expanded detail */}
                {expanded === app.id && (
                  <div className="border-t border-border px-5 py-5 space-y-3">
                    <Detail label="Discord ID" value={app.discord_id} />
                    <Detail label="UID" value={app.uid} />
                    <Detail label="Age" value={String(app.age)} />
                    <Detail label="Speaks English" value={yesNo(app.speaks_english)} />
                    <Detail label="Timezone" value={app.timezone} />
                    <Detail label="Activity" value={app.activity} />
                    <Detail label="Level" value={app.level} />
                    <Detail label="Preferred playstyle" value={app.playstyle} />
                    <Detail label="Banned from KOTH (cheating)" value={yesNo(app.banned_koth_cheating)} />
                    <Detail label="Looking for in a clan" value={app.looking_for} />
                    <Detail label="Has mic" value={yesNo(app.has_mic)} />
                    <Detail label="Current/previous clan membership" value={app.clan_history} />
                    {app.reviewer_note && (
                      <Detail label="Reviewer note" value={app.reviewer_note} />
                    )}

                    {/* Actions */}
                    {app.status === "pending" && (
                      <div className="pt-3 border-t border-border space-y-3">
                        <textarea
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Optional note..."
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
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

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
