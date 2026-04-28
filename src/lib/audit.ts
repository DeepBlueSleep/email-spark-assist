// Client-side audit logger. Fire-and-forget — never blocks UI.
import { invokeFunction } from "@/lib/api";

export interface ClientAuditEntry {
  action: string;
  category?: "user_action" | "http_out" | "system";
  actor?: string | null;
  target_type?: string | null;
  target_id?: string | null;
  status?: string;
  request?: unknown;
  response?: unknown;
  metadata?: Record<string, unknown>;
  error?: string | null;
  duration_ms?: number | null;
}

export function logClientAudit(entry: ClientAuditEntry): void {
  try {
    invokeFunction("api-audit-logs", {
      method: "POST",
      body: {
        category: entry.category || "user_action",
        source: "web-client",
        actor: entry.actor ?? "operator",
        ...entry,
      },
    }).catch(() => { /* swallow */ });
  } catch { /* swallow */ }
}
