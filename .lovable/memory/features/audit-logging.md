---
name: Audit Logging System
description: Comprehensive audit log capturing all HTTP in/out, user actions, and webhook events with a dedicated /audit-logs UI
type: feature
---
All edge functions are wrapped with `withAudit(source, handler)` from `supabase/functions/_shared/audit.ts`, which logs every inbound request (method, path, query, sanitized headers, body, response, status, duration) to a NeonDB `audit_logs` table. Sensitive headers (authorization, apikey, x-webhook-secret, cookie) are redacted. Bodies > 32 KB are truncated.

Outbound HTTP calls (e.g. `api-webhook-proxy` → external webhooks) log a separate `http_out` entry with full URL, payload, response, and timing.

Client user actions (approve_and_send_to_autocount, escalate_email, reject_email, etc.) post to `api-audit-logs` (POST) via `src/lib/audit.ts` `logClientAudit()` — fire-and-forget, never blocks UI.

Audit logs are viewable at `/audit-logs` with category filter, search, and expandable rows showing full request/response/metadata. Polls every 15s.

Categories: `user_action`, `http_in`, `http_out`, `webhook`, `system`, `db`. The `audit_logs` table is auto-created idempotently on first write — no migration needed.
