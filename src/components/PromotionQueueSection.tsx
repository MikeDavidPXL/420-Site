import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  RefreshCw,
  Trash2,
  CheckCircle,
  AlertTriangle,
  X,
  Loader2,
  Clock,
} from "lucide-react";

interface QueueItem {
  id: string;
  member_id: string;
  discord_id: string;
  discord_name: string;
  ign: string;
  uid: string;
  from_rank: string;
  to_rank: string;
  days?: number;
  status: "queued" | "confirmed" | "processed" | "failed" | "removed";
  created_at: string;
}

interface PromotionQueueProps {
  onQueueUpdate?: (counts: QueueCounts) => void;
}

interface QueueCounts {
  queued: number;
  confirmed: number;
  processed: number;
  failed: number;
  unresolved: number;
}

const PromotionQueueSection = ({ onQueueUpdate }: PromotionQueueProps) => {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [unresolvedItems, setUnresolvedItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [building, setBuilding] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [processResult, setProcessResult] = useState<any>(null);

  // ── Fetch queue items ──────────────────────────────────────
  const fetchQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/.netlify/functions/promotion-queue-list");
      const data = await res.json();
      if (res.ok) {
        const resolved = (data.items ?? []).filter((q: QueueItem) => q.discord_id);
        const unresolved = (data.items ?? []).filter((q: QueueItem) => !q.discord_id);
        setQueueItems(resolved);
        setUnresolvedItems(unresolved);

        const counts = {
          queued: (data.items ?? []).filter((q: QueueItem) => q.status === "queued").length,
          confirmed: (data.items ?? []).filter((q: QueueItem) => q.status === "confirmed").length,
          processed: (data.items ?? []).filter((q: QueueItem) => q.status === "processed").length,
          failed: (data.items ?? []).filter((q: QueueItem) => q.status === "failed").length,
          unresolved: unresolved.length,
        };
        onQueueUpdate?.(counts);
      } else {
        setError(data?.error || "Failed to fetch queue");
      }
    } catch {
      setError("Network error while fetching queue");
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 10 seconds
  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 10_000);
    return () => clearInterval(interval);
  }, []);

  // ── Build queue (find new eligible members) ───────────────
  const buildQueue = async () => {
    setBuilding(true);
    setError(null);
    try {
      const res = await fetch("/.netlify/functions/promotion-queue-build", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(
          `Added ${data.queued_added_count} new members to queue (Total: ${data.total_queued_count})`
        );
        setTimeout(() => setSuccessMessage(null), 5000);
        await fetchQueue();
      } else {
        setError(data?.error || "Failed to build queue");
      }
    } catch {
      setError("Network error while building queue");
    } finally {
      setBuilding(false);
    }
  };

  // ── Clear queue (remove all queued items) ──────────────────
  const clearQueue = async () => {
    if (
      !confirm(
        `Remove all ${queueItems.length + unresolvedItems.length} items from queue?`
      )
    ) {
      return;
    }
    setError(null);
    try {
      const res = await fetch("/.netlify/functions/promotion-queue-clear", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage("Queue cleared");
        setTimeout(() => setSuccessMessage(null), 3000);
        await fetchQueue();
      } else {
        setError(data?.error || "Failed to clear queue");
      }
    } catch {
      setError("Network error while clearing queue");
    }
  };

  // ── Confirm queue (mark as confirmed awaiting process) ────
  const confirmQueue = async () => {
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch("/.netlify/functions/promotion-queue-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(`Confirmed ${data.confirmed_count} promotions`);
        setShowConfirmModal(false);
        setTimeout(() => setSuccessMessage(null), 5000);
        await fetchQueue();
      } else {
        setError(data?.error || "Failed to confirm queue");
      }
    } catch {
      setError("Network error while confirming queue");
    } finally {
      setConfirming(false);
    }
  };

  // ── Process queue (apply roles + announce) ────────────────
  const processQueue = async () => {
    if (!confirm("This will apply roles and post announcement. Continue?")) {
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      const res = await fetch("/.netlify/functions/promotion-queue-process", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setProcessResult(data);
        setSuccessMessage(
          `Processed: ${data.processed_count} success, ${data.failed_count} failed. Announcement ${data.announcement_posted ? "posted!" : "not posted"}`
        );
        setTimeout(() => setSuccessMessage(null), 8000);
        await fetchQueue();
      } else {
        setError(data?.error || "Failed to process queue");
      }
    } catch {
      setError("Network error while processing queue");
    } finally {
      setProcessing(false);
    }
  };

  const resolvedCount = queueItems.length;
  const confirmedCount = queueItems.filter((q) => q.status === "confirmed").length;
  const queuedCount = queueItems.filter((q) => q.status === "queued").length;
  const canConfirm = queuedCount >= 5;
  const canProcess = confirmedCount > 0;

  return (
    <div className="border-t border-secondary/20 pt-6 space-y-4">
      <h2 className="font-display text-lg font-bold text-secondary flex items-center gap-2">
        <Clock className="w-5 h-5" /> Promotion Queue
      </h2>

      {/* Status summary & controls */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div className="bg-card border border-border rounded px-3 py-2">
          <div className="text-xs text-muted-foreground uppercase">Queued</div>
          <div className="font-display font-bold text-secondary">{queuedCount}</div>
        </div>
        <div className="bg-card border border-border rounded px-3 py-2">
          <div className="text-xs text-muted-foreground uppercase">Confirmed</div>
          <div className="font-display font-bold text-green-400">{confirmedCount}</div>
        </div>
        <div className="bg-card border border-border rounded px-3 py-2">
          <div className="text-xs text-muted-foreground uppercase">Resolved</div>
          <div className="font-display font-bold text-primary">{resolvedCount}</div>
        </div>
        <div className="bg-card border border-border rounded px-3 py-2">
          <div className="text-xs text-muted-foreground uppercase">Unresolved</div>
          <div className="font-display font-bold text-yellow-400">
            {unresolvedItems.length}
          </div>
        </div>
      </div>

      {/* Control buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={buildQueue}
          disabled={building}
          className="inline-flex items-center gap-2 border border-secondary/40 text-secondary hover:bg-secondary/10 font-display font-bold px-4 py-2 rounded-lg transition disabled:opacity-50"
        >
          {building ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Build Queue
        </button>

        <button
          onClick={clearQueue}
          disabled={loading || (queuedCount + confirmedCount === 0)}
          className="inline-flex items-center gap-2 border border-red-500/40 text-red-400 hover:bg-red-500/10 font-display font-bold px-4 py-2 rounded-lg transition disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          Clear Queue
        </button>

        {!canProcess && (
          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={!canConfirm || confirming}
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-display font-bold px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Confirm ({resolvedCount}/5)
          </button>
        )}

        {canProcess && (
          <button
            onClick={processQueue}
            disabled={processing}
            className="inline-flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white font-display font-bold px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Process Now
          </button>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded px-4 py-3 text-red-400 text-sm flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-500/10 border border-green-500/30 rounded px-4 py-3 text-green-400 text-sm">
          {successMessage}
        </div>
      )}

      {/* Queue table */}
      {queueItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display text-sm font-bold text-foreground">
            Queue Items ({resolvedCount})
          </h3>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-secondary/10 border-b border-border">
                  {[
                    "Discord",
                    "IGN",
                    "UID",
                    "From",
                    "To",
                    "Days",
                    "Status",
                  ].map((h) => (
                    <th key={h} className="text-left px-3 py-2 font-bold text-secondary uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queueItems.map((item, i) => (
                  <tr key={item.id} className={`border-b border-border/50 ${i % 2 === 0 ? "bg-card" : "bg-muted/30"}`}>
                    <td className="px-3 py-2 text-foreground font-semibold">{item.discord_name}</td>
                    <td className="px-3 py-2 text-foreground">{item.ign}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">{item.uid}</td>
                    <td className="px-3 py-2 text-muted-foreground">{item.from_rank}</td>
                    <td className="px-3 py-2 text-green-400 font-bold">{item.to_rank}</td>
                    <td className="px-3 py-2 text-center">{item.days ?? "—"}</td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded ${
                          item.status === "queued"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : item.status === "confirmed"
                              ? "bg-green-500/20 text-green-400"
                              : item.status === "processed"
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Unresolved members */}
      {unresolvedItems.length > 0 && (
        <div className="space-y-2 bg-yellow-500/5 border border-yellow-500/30 rounded px-4 py-3">
          <h4 className="font-display text-sm font-bold text-yellow-400 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" /> Unresolved ({unresolvedItems.length})
          </h4>
          <p className="text-xs text-muted-foreground">
            These members have no Discord ID and cannot be processed.
          </p>
          <div className="space-y-1 text-xs">
            {unresolvedItems.map((item) => (
              <div key={item.id} className="text-muted-foreground">
                <span className="text-foreground font-semibold">{item.discord_name}</span> — {item.ign} (UID: {item.uid}) — {item.from_rank} → {item.to_rank}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4 space-y-4"
            >
              <h3 className="font-display text-lg font-bold text-foreground">Confirm Promotions</h3>
              <p className="text-sm text-muted-foreground">
                About to mark {resolvedCount} members ready for promotion. Roles and announcement will be applied when you click "Process Now".
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto text-xs">
                {queueItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-muted-foreground">
                    <span>{item.discord_name}</span>
                    <span className="text-green-400">{item.to_rank}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  onClick={confirmQueue}
                  disabled={confirming}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded transition disabled:opacity-50"
                >
                  {confirming ? "Confirming..." : "Confirm"}
                </button>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 bg-muted hover:bg-muted/80 text-foreground font-bold py-2 rounded transition"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Process result */}
      {processResult && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded px-4 py-3 space-y-2 text-sm">
          <div className="font-bold text-blue-400">Process Complete</div>
          <div className="text-sm text-muted-foreground">
            Processed: {processResult.processed_count} | Failed: {processResult.failed_count} | Announcement:{" "}
            {processResult.announcement_posted ? "Posted ✓" : "Not Posted"}
          </div>
        </div>
      )}
    </div>
  );
};

export default PromotionQueueSection;
