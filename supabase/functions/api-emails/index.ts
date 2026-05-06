import { getDb, corsHeaders } from "../_shared/db.ts";
import { withAudit } from "../_shared/audit.ts";

Deno.serve(withAudit("api-emails", async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const sql = getDb();

  try {
    if (req.method === "GET") {
      // GET /api-emails - list all messages with order items.
      // The app no longer uses archive/delete; everything is shown,
      // partitioned only by the is_relevant flag in the UI.
      const emails = await sql`
        SELECT e.*
        FROM emails e
        ORDER BY e.timestamp DESC
      `;
      const emailIds = emails.map((e: any) => e.id);

      let orderItems: any[] = [];
      let emailAttachments: any[] = [];
      if (emailIds.length > 0) {
        orderItems = await sql`SELECT * FROM order_items WHERE email_id = ANY(${emailIds})`;
        try {
          emailAttachments = await sql`SELECT id, email_id, filename, mime_type, size_bytes, created_at FROM email_attachments WHERE email_id = ANY(${emailIds})`;
        } catch (e: any) {
          if (e?.code === "42P01") {
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

      const products: any[] = [];

      const customerIds = [...new Set(emails.map((e: any) => e.customer_id).filter(Boolean))];
      let customers: any[] = [];
      if (customerIds.length > 0) {
        customers = await sql`SELECT * FROM customers WHERE id = ANY(${customerIds})`;
      }

      return new Response(JSON.stringify({ emails, order_items: orderItems, products, email_attachments: emailAttachments, customers }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "PATCH") {
      const body = await req.json();
      const { id, ids: rawIds, ...fields } = body;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const ids = Array.isArray(rawIds) ? rawIds : id ? [id] : [];
      if (ids.length === 0 || ids.some((value: unknown) => typeof value !== "string" || !uuidRegex.test(value))) {
        return new Response(JSON.stringify({ error: "id or ids array required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Ensure relevance column exists in NeonDB (idempotent guard)
      await sql`ALTER TABLE emails ADD COLUMN IF NOT EXISTS is_relevant boolean NOT NULL DEFAULT true`;

      const status = fields.status ?? null;
      const aiReplyDraft = fields.ai_reply_draft ?? null;
      const isRelevant = typeof fields.is_relevant === "boolean" ? fields.is_relevant : null;

      await sql`
        UPDATE emails SET
          status = COALESCE(${status}, status),
          ai_reply_draft = COALESCE(${aiReplyDraft}, ai_reply_draft),
          is_relevant = COALESCE(${isRelevant}, is_relevant),
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
