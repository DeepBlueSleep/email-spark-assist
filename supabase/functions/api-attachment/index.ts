import { getDb, corsHeaders } from "../_shared/db.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const sql = getDb();

  try {
    const url = new URL(req.url);
    const attachmentId = url.searchParams.get("id");

    if (!attachmentId) {
      return new Response(JSON.stringify({ error: "id parameter required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows = await sql`SELECT * FROM email_attachments WHERE id = ${attachmentId}`;
    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: "Attachment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(rows[0]), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("API attachment error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});