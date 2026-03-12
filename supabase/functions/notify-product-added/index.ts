import { corsHeaders } from "../_shared/db.ts";

const NOTIFICATION_URL =
  "https://n8n.srv1031900.hstgr.cloud/webhook/a2647686-dd8d-492b-b418-dae2c37045e8";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const products = Array.isArray(body) ? body : [body];
    const results = [];

    for (const product of products) {
      const response = await fetch(NOTIFICATION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      });
      results.push({
        sku_code: product.sku_code,
        status: response.status,
        response: await response.text(),
      });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Notify product error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to notify" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
