import { getDb, corsHeaders } from "../_shared/db.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sql = getDb();

  try {
    if (req.method === "POST") {
      const body = await req.json();
      const { intents } = body;
      if (intents && Array.isArray(intents)) {
        for (const intent of intents) {
          const existing = await sql`SELECT id FROM intents WHERE key = ${intent.key}`;
          if (existing.length === 0) {
            await sql`INSERT INTO intents (key, display_name, is_active) VALUES (${intent.key}, ${intent.display_name}, ${intent.is_active ?? true})`;
          }
        }
        return new Response(JSON.stringify({ success: true, inserted: intents.length }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "intents array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET handler
    const url = new URL(req.url);
    const active = url.searchParams.get("active");

    let data;
    if (active !== null) {
      data = await sql`SELECT * FROM intents WHERE is_active = ${active !== "false"} ORDER BY display_name`;
    } else {
      data = await sql`SELECT * FROM intents ORDER BY display_name`;
    }

    return new Response(JSON.stringify({ intents: data, count: data?.length || 0 }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Get intents error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
