// Clan List — standalone admin page, neon purple accent
// Upload XLSX, view/search clan members, archive lists
import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { Navigate, Link } from "react-router-dom";
import {
  Users,
  ArrowLeft,
  Loader2,
  Upload,
  Search,
  Archive,
  ArchiveRestore,
  Download,
  ChevronLeft,
  ChevronRight,
  LogOut,
  FileSpreadsheet,
  Trash2,
} from "lucide-react";
import * as XLSX from "xlsx";
import clanLogo from "@/assets/clan-logo.png";

// ── Types ─────────────────────────────────────────────────
interface ClanList {
  id: string;
  uploaded_at: string;
  uploaded_by: string;
  file_name: string;
  row_count: number;
  archived_at: string | null;
  archived_by: string | null;
  archive_reason: string | null;
}

interface ClanRow {
  id: string;
  row_data: Record<string, unknown>;
}

// ══════════════════════════════════════════════════════════
//  CLAN LIST PAGE
// ══════════════════════════════════════════════════════════
const ClanListPage = () => {
  const { user, loading: authLoading } = useAuth();

  // ── List management state ───────────────────────────────
  const [lists, setLists] = useState<ClanList[]>([]);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [listsLoading, setListsLoading] = useState(true);

  // ── Rows state ──────────────────────────────────────────
  const [rows, setRows] = useState<ClanRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Upload state ────────────────────────────────────────
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Action state ────────────────────────────────────────
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ── Fetch lists ─────────────────────────────────────────
  const fetchLists = useCallback(async () => {
    setListsLoading(true);
    try {
      const params = new URLSearchParams();
      if (showArchived) params.set("show_archived", "true");
      const qs = params.toString() ? `?${params}` : "";
      const res = await fetch(`/.netlify/functions/clan-list${qs}`);
      const data = await res.json();
      setLists(data.lists ?? []);
    } catch {
      setLists([]);
    } finally {
      setListsLoading(false);
    }
  }, [showArchived]);

  useEffect(() => {
    if (user?.is_staff) fetchLists();
  }, [user, fetchLists]);

  // ── Fetch rows for selected list ────────────────────────
  const fetchRows = useCallback(
    async (listId: string, pg: number, q: string) => {
      setRowsLoading(true);
      try {
        const params = new URLSearchParams({
          list_id: listId,
          page: String(pg),
        });
        if (q) params.set("search", q);
        const res = await fetch(`/.netlify/functions/clan-list?${params}`);
        const data = await res.json();
        setRows(data.rows ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.total_pages ?? 1);

        // Extract columns from the first batch of rows
        if (data.rows?.length > 0) {
          const allKeys = new Set<string>();
          data.rows.forEach((r: ClanRow) => {
            Object.keys(r.row_data).forEach((k) => allKeys.add(k));
          });
          setColumns(Array.from(allKeys));
        }
      } catch {
        setRows([]);
      } finally {
        setRowsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (selectedList) {
      fetchRows(selectedList, page, search);
    }
  }, [selectedList, page, search, fetchRows]);

  // ── Debounced search ────────────────────────────────────
  const handleSearchChange = (val: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 400);
  };

  // ── File upload handler ─────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

      if (jsonRows.length === 0) {
        setUploadError("The file contains no data rows.");
        return;
      }

      const res = await fetch("/.netlify/functions/clan-list-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_name: file.name, rows: jsonRows }),
      });

      const result = await res.json();

      if (!res.ok) {
        setUploadError(result.error || "Upload failed");
        return;
      }

      // Refresh lists and auto-select the new one
      await fetchLists();
      setSelectedList(result.list_id);
      setPage(1);
      setSearch("");
    } catch {
      setUploadError("Failed to read or upload the file.");
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Archive / restore list ──────────────────────────────
  const archiveList = async (listId: string, action: "archive" | "restore") => {
    setActionLoading(listId);
    try {
      const res = await fetch("/.netlify/functions/clan-list-archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ list_id: listId, action }),
      });
      if (res.ok) {
        await fetchLists();
        if (selectedList === listId && action === "archive") {
          setSelectedList(null);
          setRows([]);
        }
      }
    } finally {
      setActionLoading(null);
    }
  };

  // ── Export to CSV ───────────────────────────────────────
  const exportCSV = () => {
    if (rows.length === 0 || columns.length === 0) return;

    const header = columns.join(",");
    const csvRows = rows.map((r) =>
      columns
        .map((col) => {
          const val = r.row_data[col];
          const str = val == null ? "" : String(val);
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(",")
    );

    const blob = new Blob([header + "\n" + csvRows.join("\n")], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clan-list-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Guards ──────────────────────────────────────────────
  if (!authLoading && (!user || !user.is_staff)) {
    return <Navigate to="/pack" replace />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
      </div>
    );
  }

  // ── Find current list metadata ──────────────────────────
  const currentList = lists.find((l) => l.id === selectedList);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top bar ─────────────────────────────────────── */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-secondary/30 shadow-lg"
      >
        <div className="container mx-auto px-4 flex items-center justify-between h-16">
          <Link
            to="/pack"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <img
              src={clanLogo}
              alt="420 Clan Logo"
              className="w-8 h-8 rounded-full"
            />
            <span className="font-display text-sm font-bold hidden sm:block">
              Back to Pack
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-secondary" />
            <span className="font-display text-lg font-bold neon-text-purple text-secondary hidden sm:block">
              Clan List
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
      <div className="container mx-auto px-4 max-w-6xl py-8">
        {/* ── Upload + list selection ── */}
        {!selectedList && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Upload */}
            <div className="bg-card border border-secondary/30 rounded-xl p-6 neon-border-purple">
              <h2 className="font-display text-lg font-bold text-secondary mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5" /> Upload Clan List
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Upload an Excel (.xlsx) file. The first row will be used as
                column headers.
              </p>
              <label className="inline-flex items-center gap-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-display font-bold px-6 py-2.5 rounded-lg transition cursor-pointer disabled:opacity-50">
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4" />
                )}
                {uploading ? "Uploading..." : "Choose File"}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
              {uploadError && (
                <p className="text-sm text-destructive mt-3">{uploadError}</p>
              )}
            </div>

            {/* List selector */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-bold text-foreground">
                  Uploaded Lists
                </h2>
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showArchived}
                    onChange={(e) => setShowArchived(e.target.checked)}
                    className="accent-secondary w-4 h-4 rounded"
                  />
                  <Archive className="w-4 h-4" />
                  Show archived
                </label>
              </div>

              {listsLoading && (
                <div className="text-center py-12">
                  <Loader2 className="w-6 h-6 text-secondary animate-spin mx-auto" />
                </div>
              )}

              {!listsLoading && lists.length === 0 && (
                <p className="text-center text-muted-foreground py-12">
                  No lists uploaded yet.
                </p>
              )}

              <div className="space-y-3">
                {lists.map((list) => {
                  const isArchived = !!list.archived_at;
                  return (
                    <div
                      key={list.id}
                      className={`bg-card border rounded-lg overflow-hidden transition-all ${
                        isArchived
                          ? "border-muted opacity-60 hover:opacity-80"
                          : "border-secondary/30 hover:neon-border-purple"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-4 px-5 py-4">
                        <FileSpreadsheet
                          className={`w-5 h-5 shrink-0 ${
                            isArchived
                              ? "text-muted-foreground"
                              : "text-secondary"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-display text-sm font-bold text-foreground truncate">
                            {list.file_name}
                            {isArchived && (
                              <span className="ml-2 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                archived
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {list.row_count} rows · Uploaded{" "}
                            {new Date(list.uploaded_at).toLocaleDateString()} by{" "}
                            {list.uploaded_by}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {!isArchived && (
                            <button
                              onClick={() => {
                                setSelectedList(list.id);
                                setPage(1);
                                setSearch("");
                              }}
                              className="text-sm font-display font-bold text-secondary hover:text-secondary/80 transition px-3 py-1.5 rounded-lg border border-secondary/30 hover:bg-secondary/10"
                            >
                              View
                            </button>
                          )}
                          {isArchived ? (
                            <button
                              onClick={() => archiveList(list.id, "restore")}
                              disabled={actionLoading === list.id}
                              className="text-sm text-secondary hover:text-secondary/80 transition"
                              title="Restore"
                            >
                              {actionLoading === list.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <ArchiveRestore className="w-4 h-4" />
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => archiveList(list.id, "archive")}
                              disabled={actionLoading === list.id}
                              className="text-sm text-muted-foreground hover:text-destructive transition"
                              title="Archive"
                            >
                              {actionLoading === list.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Table view (selected list) ── */}
        {selectedList && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Back + meta */}
            <div className="flex items-center gap-4 flex-wrap">
              <button
                onClick={() => {
                  setSelectedList(null);
                  setRows([]);
                  setColumns([]);
                }}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition"
              >
                <ChevronLeft className="w-4 h-4" /> Back to lists
              </button>
              {currentList && (
                <div className="flex-1 min-w-0">
                  <h2 className="font-display text-lg font-bold text-secondary truncate">
                    {currentList.file_name}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {total} rows · Uploaded{" "}
                    {new Date(currentList.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {/* Search + export */}
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search all columns..."
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full bg-muted border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-secondary/50 transition"
                />
              </div>
              <button
                onClick={exportCSV}
                disabled={rows.length === 0}
                className="flex items-center gap-2 text-sm font-display font-bold text-secondary border border-secondary/30 hover:bg-secondary/10 px-4 py-2.5 rounded-lg transition disabled:opacity-50"
              >
                <Download className="w-4 h-4" /> Export CSV
              </button>
            </div>

            {/* Table */}
            {rowsLoading && (
              <div className="text-center py-12">
                <Loader2 className="w-6 h-6 text-secondary animate-spin mx-auto" />
              </div>
            )}

            {!rowsLoading && rows.length === 0 && (
              <p className="text-center text-muted-foreground py-12">
                {search ? "No rows match your search." : "No data in this list."}
              </p>
            )}

            {!rowsLoading && rows.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-secondary/20">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-secondary/10 border-b border-secondary/20">
                      {columns.map((col) => (
                        <th
                          key={col}
                          className="text-left font-display font-bold text-secondary px-4 py-3 whitespace-nowrap text-xs uppercase tracking-wider"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr
                        key={row.id}
                        className={`border-b border-border/50 ${
                          i % 2 === 0 ? "bg-card" : "bg-muted/30"
                        } hover:bg-secondary/5 transition`}
                      >
                        {columns.map((col) => (
                          <td
                            key={col}
                            className="px-4 py-2.5 text-foreground whitespace-nowrap max-w-[300px] truncate"
                            title={String(row.row_data[col] ?? "")}
                          >
                            {row.row_data[col] != null
                              ? String(row.row_data[col])
                              : "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <span className="text-sm text-muted-foreground font-display">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition disabled:opacity-30"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ClanListPage;
