import { getDb, corsHeaders } from "../_shared/db.ts";
import { withAudit } from "../_shared/audit.ts";

async function ensureDeletionSchema(sql: any) {
  await sql`ALTER TABLE emails ADD COLUMN IF NOT EXISTS deleted_at timestamptz`;
  await sql`CREATE TABLE IF NOT EXISTS deleted_emails (
    external_id text PRIMARY KEY,
    email text,
    subject text,
    body_hash text,
    message_timestamp timestamptz,
    deleted_at timestamptz NOT NULL DEFAULT now()
  )`;
  await sql`ALTER TABLE deleted_emails ADD COLUMN IF NOT EXISTS email text`;
  await sql`ALTER TABLE deleted_emails ADD COLUMN IF NOT EXISTS subject text`;
  await sql`ALTER TABLE deleted_emails ADD COLUMN IF NOT EXISTS body_hash text`;
  await sql`ALTER TABLE deleted_emails ADD COLUMN IF NOT EXISTS message_timestamp timestamptz`;
}

Deno.serve(withAudit("api-emails", async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const sql = getDb();

  try {
    const url = new URL(req.url);

    if (req.method === "GET") {
      // GET /api-emails - list all emails with order items
      await ensureDeletionSchema(sql);
      const emails = await sql`
        SELECT e.*
        FROM emails e
        LEFT JOIN deleted_emails d ON d.external_id = e.external_id
        WHERE e.deleted_at IS NULL AND d.external_id IS NULL
        ORDER BY e.timestamp DESC
      `;
      const emailIds = emails.map((e: any) => e.id);

      let orderItems: any[] = [];
      let emailAttachments: any[] = [];
      if (emailIds.length > 0) {
        orderItems = await sql`SELECT * FROM order_items WHERE email_id = ANY(${emailIds})`;
        // Fetch attachment metadata - gracefully handle if table doesn't exist yet
        try {
          emailAttachments = await sql`SELECT id, email_id, filename, mime_type, size_bytes, created_at FROM email_attachments WHERE email_id = ANY(${emailIds})`;
        } catch (e: any) {
          if (e?.code === "42P01") {
            // Table doesn't exist yet — create it
            await sql`CREATE TABLE IF NOT EXISTS email_attachments (
              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
              email_id uuid NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
              filename text NOT NULL DEFAULT 'unnamed',
              mime_type text NOT NULL DEFAULT 'application/octet-stream',
              content_base64 text NOT NULL DEFAULT '',
              size_bytes integer DEFAULT 0,
              created_at timestamptz NOT NULL DEFAULT now()
            )`;
            console.log("[api-emails] Created email_attachments table in NeonDB");
          } else {
            throw e;
          }
        }
      }

      // Product lookups are now handled client-side via productService
      const products: any[] = [];

      // Fetch customers for mapping
      const customerIds = [...new Set(emails.map((e: any) => e.customer_id).filter(Boolean))];
      let customers: any[] = [];
      if (customerIds.length > 0) {
        customers = await sql`SELECT * FROM customers WHERE id = ANY(${customerIds})`;
      }

      return new Response(JSON.stringify({ emails, order_items: orderItems, products, email_attachments: emailAttachments, customers }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "DELETE") {
      let body: any;
      try {
        body = await req.json();
      } catch {
        // Try reading from URL params
        const idsParam = url.searchParams.get("ids");
        body = idsParam ? { ids: idsParam.split(",") } : {};
      }
      const { ids } = body;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return new Response(JSON.stringify({ error: "ids array required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (ids.some((value: unknown) => typeof value !== "string" || !uuidRegex.test(value))) {
        return new Response(JSON.stringify({ error: "valid uuid ids required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Permanent UI delete: soft-delete the row and tombstone its source identity.
      // This keeps later Gmail/n8n replays from recreating or re-showing the message.
      await ensureDeletionSchema(sql);
      await sql`
        INSERT INTO deleted_emails (external_id, email, subject, body_hash, message_timestamp, deleted_at)
        SELECT external_id, email, subject, md5(COALESCE(body, '')), timestamp, now()
        FROM emails
        WHERE id = ANY(${ids}::uuid[]) AND external_id IS NOT NULL
        ON CONFLICT (external_id) DO UPDATE SET
          email = COALESCE(EXCLUDED.email, deleted_emails.email),
          subject = COALESCE(EXCLUDED.subject, deleted_emails.subject),
          body_hash = COALESCE(EXCLUDED.body_hash, deleted_emails.body_hash),
          message_timestamp = COALESCE(EXCLUDED.message_timestamp, deleted_emails.message_timestamp),
          deleted_at = now()
      `;
      await sql`UPDATE emails SET deleted_at = now(), is_archived = true, updated_at = now() WHERE id = ANY(${ids}::uuid[])`;

      try { await sql`DELETE FROM order_items WHERE email_id = ANY(${ids}::uuid[])`; } catch (cleanupError) { console.warn("[api-emails] order_items cleanup skipped", cleanupError); }
      try { await sql`DELETE FROM email_attachments WHERE email_id = ANY(${ids}::uuid[])`; } catch (cleanupError) { console.warn("[api-emails] email_attachments cleanup skipped", cleanupError); }
      try { await sql`DELETE FROM ai_reply_drafts WHERE email_id = ANY(${ids}::uuid[])`; } catch (cleanupError) { console.warn("[api-emails] ai_reply_drafts cleanup skipped", cleanupError); }

      return new Response(JSON.stringify({ success: true, deleted: ids.length }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "PATCH") {
      // PATCH /api-emails - update email fields
      const body = await req.json();
      const { id, ids: rawIds, ...fields } = body;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const ids = Array.isArray(rawIds) ? rawIds : id ? [id] : [];
      if (ids.length === 0 || ids.some((value: unknown) => typeof value !== "string" || !uuidRegex.test(value))) {
        return new Response(JSON.stringify({ error: "id or ids array required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Ensure read/archive columns exist in NeonDB (idempotent guard)
      await sql`ALTER TABLE emails ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false`;
      await sql`ALTER TABLE emails ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false`;

      const status = fields.status ?? null;
      const aiReplyDraft = fields.ai_reply_draft ?? null;
      const isRead = typeof fields.is_read === "boolean" ? fields.is_read : null;
      const isArchived = typeof fields.is_archived === "boolean" ? fields.is_archived : null;

      await sql`
        UPDATE emails SET
          status = COALESCE(${status}, status),
          ai_reply_draft = COALESCE(${aiReplyDraft}, ai_reply_draft),
          is_read = COALESCE(${isRead}, is_read),
          is_archived = COALESCE(${isArchived}, is_archived),
          updated_at = now()
        WHERE id = ANY(${ids}::uuid[])
      `;

      return new Response(JSON.stringify({ success: true, updated: ids.length }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("API emails error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
