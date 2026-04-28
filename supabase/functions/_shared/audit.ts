// Shared audit logger for edge functions.
// Writes to NeonDB `audit_logs` table. Auto-creates the table on first use.
// Never throws — audit failure must never break the primary request.

import { getDb } from "./db.ts";

export type AuditCategory =
  | "http_in"
  | "http_out"
  | "user_action"
  | "system"
  | "webhook"
  | "db";

export interface AuditEntry {
  category: AuditCategory;
  action: string;                   // e.g. "api-emails.PATCH", "approve_and_send", "webhook-email.received"
  actor?: string | null;            // email/user/system identifier
  target_type?: string | null;      // e.g. "email", "customer", "order"
  target_id?: string | null;
  status?: string | null;           // e.g. "success", "error", "200", "500"
  source?: string | null;           // function name or component
  ip?: string | null;
  user_agent?: string | null;
  request?: unknown;                // request payload/headers (sanitized)
  response?: unknown;               // response body (sanitized/truncated)
  metadata?: Record<string, unknown> | null;
  error?: string | null;
  duration_ms?: number | null;
}

const SENSITIVE_HEADER_KEYS = new Set([
  "authorization",
  "apikey",
  "x-webhook-secret",
  "cookie",
  "set-cookie",
]);

const MAX_BODY_BYTES = 32 * 1024; // 32 KB cap per field

function truncate(value: unknown): unknown {
  if (value == null) return value;
  try {
    const s = typeof value === "string" ? value : JSON.stringify(value);
    if (s.length <= MAX_BODY_BYTES) return value;
    return { __truncated: true, preview: s.slice(0, MAX_BODY_BYTES), original_length: s.length };
  } catch {
    return { __unserializable: true };
  }
}

export function sanitizeHeaders(headers: Headers | Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  const entries = headers instanceof Headers ? [...headers.entries()] : Object.entries(headers);
  for (const [k, v] of entries) {
    if (SENSITIVE_HEADER_KEYS.has(k.toLowerCase())) {
      out[k] = "[redacted]";
    } else {
      out[k] = String(v);
    }
  }
  return out;
}

let tableEnsured = false;
async function ensureTable(sql: any) {
  if (tableEnsured) return;
  await sql`CREATE TABLE IF NOT EXISTS audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    category text NOT NULL,
    action text NOT NULL,
    actor text,
    target_type text,
    target_id text,
    status text,
    source text,
    ip text,
    user_agent text,
    request jsonb,
    response jsonb,
    metadata jsonb,
    error text,
    duration_ms integer
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs (category)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs (target_type, target_id)`;
  tableEnsured = true;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const sql = getDb();
    await ensureTable(sql);
    await sql`INSERT INTO audit_logs
      (category, action, actor, target_type, target_id, status, source, ip, user_agent, request, response, metadata, error, duration_ms)
      VALUES (
        ${entry.category},
        ${entry.action},
        ${entry.actor ?? null},
        ${entry.target_type ?? null},
        ${entry.target_id ?? null},
        ${entry.status ?? null},
        ${entry.source ?? null},
        ${entry.ip ?? null},
        ${entry.user_agent ?? null},
        ${JSON.stringify(truncate(entry.request) ?? null)}::jsonb,
        ${JSON.stringify(truncate(entry.response) ?? null)}::jsonb,
        ${JSON.stringify(entry.metadata ?? null)}::jsonb,
        ${entry.error ?? null},
        ${entry.duration_ms ?? null}
      )`;
  } catch (err) {
    console.error("[audit] failed to write audit log:", err);
  }
}

// Wrap a Deno.serve handler to automatically log inbound HTTP requests.
export function withAudit(
  source: string,
  handler: (req: Request) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    if (req.method === "OPTIONS") return handler(req);
    const start = Date.now();
    const url = new URL(req.url);
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || null;
    const ua = req.headers.get("user-agent");

    // Clone to read body without consuming it for the actual handler
    let requestBody: unknown = null;
    let cloned = req;
    try {
      const c = req.clone();
      const ct = c.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        requestBody = await c.json().catch(() => null);
      } else if (ct.includes("text/")) {
        requestBody = await c.text().catch(() => null);
      }
    } catch { /* ignore */ }

    let response: Response;
    let responseBody: unknown = null;
    let error: string | null = null;
    try {
      response = await handler(cloned);
      try {
        const respClone = response.clone();
        const ct = respClone.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          responseBody = await respClone.json().catch(() => null);
        } else if (ct.includes("text/")) {
          responseBody = await respClone.text().catch(() => null);
        }
      } catch { /* ignore */ }
    } catch (e: any) {
      error = e?.message || String(e);
      throw e;
    } finally {
      const status = error ? "error" : String(response!?.status ?? "");
      logAudit({
        category: "http_in",
        action: `${source}.${req.method}${url.pathname.replace(/^\/functions\/v1\//, "/")}`,
        source,
        status,
        ip,
        user_agent: ua,
        request: {
          method: req.method,
          path: url.pathname,
          query: Object.fromEntries(url.searchParams.entries()),
          headers: sanitizeHeaders(req.headers),
          body: requestBody,
        },
        response: { body: responseBody },
        error,
        duration_ms: Date.now() - start,
      });
    }
    return response!;
  };
}
