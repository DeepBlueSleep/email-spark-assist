import { withAudit, logAudit } from "../_shared/audit.ts";
import { corsHeaders } from "../_shared/db.ts";

Deno.serve(withAudit("api-webhook-proxy", async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { webhook_url, payload } = body;

    if (!webhook_url || !payload) {
      return new Response(JSON.stringify({ error: "webhook_url and payload required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const outStart = Date.now();
    let response: Response;
    let responseText = "";
    let outError: string | null = null;
    try {
      response = await fetch(webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      responseText = await response.text();
    } catch (e: any) {
      outError = e?.message || String(e);
      throw e;
    } finally {
      logAudit({
        category: "http_out",
        action: `proxy.POST ${webhook_url}`,
        source: "api-webhook-proxy",
        status: outError ? "error" : String(response!?.status ?? ""),
        request: { url: webhook_url, body: payload },
        response: { body: responseText },
        error: outError,
        duration_ms: Date.now() - outStart,
      });
    }

    return new Response(JSON.stringify({ 
      success: response.ok, 
      status: response.status,
      response: responseText 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook proxy error:", error);
    return new Response(JSON.stringify({ error: error.message || "Proxy error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
