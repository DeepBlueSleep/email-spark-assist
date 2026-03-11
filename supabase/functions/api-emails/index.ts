import { getDb, corsHeaders } from "../_shared/db.ts";

Deno.serve(async (req) => {
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
      if (emailIds.length > 0) {
        orderItems = await sql`SELECT * FROM order_items WHERE email_id = ANY(${emailIds})`;
      }

      // Get recommended SKU product details
      const allSkuCodes: string[] = [];
      for (const e of emails) {
        const refs = e.recommended_sku_codes as any[];
        if (refs && Array.isArray(refs)) {
          for (const r of refs) allSkuCodes.push(r.sku_code);
        }
      }
      const uniqueSkuCodes = [...new Set(allSkuCodes)];

      let products: any[] = [];
      if (uniqueSkuCodes.length > 0) {
        products = await sql`SELECT * FROM products WHERE sku_code = ANY(${uniqueSkuCodes})`;
      }

      return new Response(JSON.stringify({ emails, order_items: orderItems, products }), {
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

      const setClauses: string[] = [];
      if (fields.status !== undefined) setClauses.push(`status = '${fields.status.replace(/'/g, "''")}'`);
      if (fields.ai_reply_draft !== undefined) setClauses.push(`ai_reply_draft = '${fields.ai_reply_draft.replace(/'/g, "''")}'`);
      setClauses.push("updated_at = now()");

      await sql.unsafe(`UPDATE emails SET ${setClauses.join(", ")} WHERE id = '${id}'`);

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
});
