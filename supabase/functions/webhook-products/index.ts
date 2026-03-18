import { getDb, corsHeaders } from "../_shared/db.ts";
import { syncProductsToVectorStore } from "../_shared/vectorSync.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    const payload = await req.json();
    await sql`INSERT INTO webhook_logs (endpoint, payload) VALUES ('webhook-products', ${JSON.stringify(payload)}::jsonb)`;

    const products = Array.isArray(payload) ? payload : payload.products ? payload.products : [payload];

    const upsertData = products.map((p: any) => ({
      sku_code: p.sku_code || p.sku || p.code,
      name: p.name || p.product_name || p.title || "Unknown Product",
      category: p.category || "",
      subcategory: p.subcategory || p.sub_category || "",
      tags: Array.isArray(p.tags) ? p.tags : p.tags ? p.tags.split(",").map((t: string) => t.trim()) : [],
      color: p.color || p.colour || "",
      size: p.size || "",
      material: p.material || "",
      price: Number(p.price) || 0,
      stock_level: Number(p.stock_level ?? p.stock ?? p.quantity ?? 0),
      description: p.description || "",
      image_url: p.image_url || p.image || "",
      is_active: p.is_active !== undefined ? p.is_active : true,
    }));

    const validProducts = upsertData.filter((p: any) => p.sku_code);

    if (validProducts.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid products found (sku_code required)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const inserted = [];
    for (const p of validProducts) {
      const rows = await sql`
        INSERT INTO products (sku_code, name, category, subcategory, tags, color, size, material, price, stock_level, description, image_url, is_active)
        VALUES (${p.sku_code}, ${p.name}, ${p.category}, ${p.subcategory}, ${p.tags}, ${p.color}, ${p.size}, ${p.material}, ${p.price}, ${p.stock_level}, ${p.description}, ${p.image_url}, ${p.is_active})
        ON CONFLICT (sku_code) DO UPDATE SET
          name = EXCLUDED.name, category = EXCLUDED.category, subcategory = EXCLUDED.subcategory,
          tags = EXCLUDED.tags, color = EXCLUDED.color, size = EXCLUDED.size, material = EXCLUDED.material,
          price = EXCLUDED.price, stock_level = EXCLUDED.stock_level, description = EXCLUDED.description,
          image_url = EXCLUDED.image_url, is_active = EXCLUDED.is_active, updated_at = now()
        RETURNING *
      `;
      inserted.push(...rows);
    }

    // Sync to vector store
    try {
      await syncProductsToVectorStore(inserted);
    } catch (e) {
      console.error("Vector store sync error:", e);
    }

    return new Response(
      JSON.stringify({ success: true, count: inserted.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Products webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
