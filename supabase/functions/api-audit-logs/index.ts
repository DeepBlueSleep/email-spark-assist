import { getDb, corsHeaders } from "../_shared/db.ts";
import { logAudit } from "../_shared/audit.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sql = getDb();

  try {
    // Ensure table exists (idempotent — also created by audit logger on first write)
    await sql`CREATE TABLE IF NOT EXISTS audit_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at timestamptz NOT NULL DEFAULT now(),
      category text NOT NULL,
      action text NOT NULL,
      actor text,
      target_type text,
      target_id text,
      status text,
      source text,
      ip text,
      user_agent text,
      request jsonb,
      response jsonb,
      metadata jsonb,
      error text,
      duration_ms integer
    )`;

    const url = new URL(req.url);

    if (req.method === "GET") {
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "200", 10) || 200, 1000);
      const category = url.searchParams.get("category");
      const targetId = url.searchParams.get("target_id");
      const search = url.searchParams.get("search");

      // Build dynamic but parameterized query using neon's tagged template
      let rows: any[];
      if (category && targetId) {
        rows = await sql`SELECT * FROM audit_logs WHERE category = ${category} AND target_id = ${targetId} ORDER BY created_at DESC LIMIT ${limit}`;
      } else if (category) {
        rows = await sql`SELECT * FROM audit_logs WHERE category = ${category} ORDER BY created_at DESC LIMIT ${limit}`;
      } else if (targetId) {
        rows = await sql`SELECT * FROM audit_logs WHERE target_id = ${targetId} ORDER BY created_at DESC LIMIT ${limit}`;
      } else if (search) {
        const like = `%${search}%`;
        rows = await sql`SELECT * FROM audit_logs WHERE action ILIKE ${like} OR actor ILIKE ${like} OR error ILIKE ${like} ORDER BY created_at DESC LIMIT ${limit}`;
      } else {
        rows = await sql`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ${limit}`;
      }

      return new Response(JSON.stringify({ logs: rows }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      // Client-side action logging
      const body = await req.json().catch(() => ({}));
      const ip = req.headers.get("x-forwarded-for") || null;
      const ua = req.headers.get("user-agent") || null;
      await logAudit({
        category: body.category || "user_action",
        action: body.action || "unknown",
        actor: body.actor ?? null,
        target_type: body.target_type ?? null,
        target_id: body.target_id ?? null,
        status: body.status ?? "success",
        source: body.source ?? "client",
        ip,
        user_agent: ua,
        request: body.request ?? null,
        response: body.response ?? null,
        metadata: body.metadata ?? null,
        error: body.error ?? null,
        duration_ms: body.duration_ms ?? null,
      });
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("api-audit-logs error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
