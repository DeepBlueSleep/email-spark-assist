import { getDb, corsHeaders } from "../_shared/db.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sql = getDb();

  try {
    const webhookSecret = Deno.env.get("WEBHOOK_SECRET");
    if (webhookSecret) {
      const providedSecret = req.headers.get("x-webhook-secret");
      if (providedSecret !== webhookSecret) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const url = new URL(req.url);
    const category = url.searchParams.get("category");
    const active = url.searchParams.get("active");
    const inStock = url.searchParams.get("in_stock");

    let conditions = "WHERE 1=1";
    if (category) conditions += ` AND category = '${category.replace(/'/g, "''")}'`;
    if (active !== null) conditions += ` AND is_active = ${active !== "false"}`;
    if (inStock !== null && inStock !== "false") conditions += ` AND stock_level > 0`;

    const data = await sql.unsafe(`SELECT * FROM products ${conditions} ORDER BY name`);

    return new Response(JSON.stringify({ products: data, count: data?.length || 0 }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Get products error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
