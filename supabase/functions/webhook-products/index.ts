import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const webhookSecret = Deno.env.get("WEBHOOK_SECRET");
    if (webhookSecret) {
      const providedSecret = req.headers.get("x-webhook-secret");
      if (providedSecret !== webhookSecret) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const payload = await req.json();

    await supabase.from("webhook_logs").insert({
      endpoint: "webhook-products",
      payload,
    });

    // Support single product or array of products
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

    // Filter out items without sku_code
    const validProducts = upsertData.filter((p: any) => p.sku_code);

    if (validProducts.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid products found (sku_code required)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await supabase
      .from("products")
      .upsert(validProducts, { onConflict: "sku_code" })
      .select();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, count: data?.length || 0 }),
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
