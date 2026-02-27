// pack-redirect — Validates a single-use download token and redirects to the
// actual file URL. The real download URL never appears in frontend code.
import type { Handler } from "@netlify/functions";
import { supabase, redirect as buildRedirect } from "./shared";

const DOWNLOAD_URL = process.env.PACK_DOWNLOAD_URL!;

const html = (body: string, status = 200) => ({
  statusCode: status,
  headers: { "Content-Type": "text/html; charset=utf-8" },
  body,
});

const errorPage = (message: string, status = 403) =>
  html(
    `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Download Error</title>
<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0a0a0a;color:#fff;margin:0}
.box{text-align:center;max-width:400px;padding:2rem}.box h1{color:#a855f7;margin-bottom:.5rem}
.box p{color:#888;font-size:.9rem}</style></head>
<body><div class="box"><h1>Download Failed</h1><p>${message}</p>
<p style="margin-top:1rem"><a href="/" style="color:#a855f7">← Back to site</a></p></div></body></html>`,
    status
  );

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return errorPage("Invalid request method.", 405);
  }

  const token = event.queryStringParameters?.token;
  if (!token) {
    return errorPage("Missing download token.", 400);
  }

  if (!DOWNLOAD_URL) {
    console.error("PACK_DOWNLOAD_URL env var is not set");
    return errorPage("Download is temporarily unavailable.", 500);
  }

  // ── Look up token ───────────────────────────────────────
  const { data: row, error } = await supabase
    .from("download_tokens")
    .select("*")
    .eq("token", token)
    .single();

  if (error || !row) {
    return errorPage("Invalid or unknown download link.");
  }

  // ── Already used? ───────────────────────────────────────
  if (row.used_at) {
    return errorPage("This download link has already been used. Request a new one from the site.");
  }

  // ── Expired? ────────────────────────────────────────────
  if (new Date(row.expires_at) < new Date()) {
    return errorPage("This download link has expired. Go back and click Download again.");
  }

  // ── Optional: IP mismatch check (soft — log only) ──────
  const currentIp =
    event.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    event.headers["client-ip"] ||
    null;

  if (row.ip_address && currentIp && row.ip_address !== currentIp) {
    console.warn(
      `[pack-redirect] IP mismatch for token ${row.id}: created from ${row.ip_address}, used from ${currentIp}`
    );
    // We still allow it but log the mismatch — uncomment next line to block:
    // return errorPage("This link cannot be used from a different network.");
  }

  // ── Mark as used ────────────────────────────────────────
  await supabase
    .from("download_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", row.id);

  // ── Redirect to real download ───────────────────────────
  return buildRedirect(DOWNLOAD_URL);
};
