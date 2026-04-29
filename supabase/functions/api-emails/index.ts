import { getDb, corsHeaders } from "../_shared/db.ts";
import { withAudit } from "../_shared/audit.ts";

Deno.serve(withAudit("api-emails", async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const sql = getDb();

  try {
    const url = new URL(req.url);

    if (req.method === "GET") {
      // GET /api-emails - list all emails with order items
      const emails = await sql`SELECT * FROM emails ORDER BY timestamp DESC`;
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
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return new Response(JSON.stringify({ error: "ids array required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Tombstone external_ids so re-ingested Gmail pushes don't resurrect deletions.
      await sql`CREATE TABLE IF NOT EXISTS deleted_emails (
        external_id text PRIMARY KEY,
        deleted_at timestamptz NOT NULL DEFAULT now()
      )`;
      const toTomb = await sql`SELECT external_id FROM emails WHERE id = ANY(${ids}::uuid[]) AND external_id IS NOT NULL`;
      if (toTomb.length > 0) {
        const extIds = toTomb.map((r: any) => r.external_id);
        await sql`INSERT INTO deleted_emails (external_id) SELECT unnest(${extIds}::text[]) ON CONFLICT (external_id) DO NOTHING`;
      }
      // Delete order_items first, then emails
      await sql`DELETE FROM order_items WHERE email_id = ANY(${ids})`;
      await sql`DELETE FROM emails WHERE id = ANY(${ids}::uuid[])`;
      return new Response(JSON.stringify({ success: true, deleted: ids.length }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "PATCH") {
      // PATCH /api-emails - update email fields
      const body = await req.json();
      const { id, ...fields } = body;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!id || !uuidRegex.test(id)) {
        return new Response(JSON.stringify({ error: "id required" }), {
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
        WHERE id = ${id}
      `;

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("API emails error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
