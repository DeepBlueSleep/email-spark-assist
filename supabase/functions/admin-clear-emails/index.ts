import { getDb, corsHeaders } from "../_shared/db.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const sql = getDb();
  await sql`DELETE FROM email_attachments`;
  await sql`DELETE FROM order_items`;
  await sql`DELETE FROM ai_reply_drafts`;
  const r = await sql`DELETE FROM emails RETURNING id`;
  return new Response(JSON.stringify({ deleted: r.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
