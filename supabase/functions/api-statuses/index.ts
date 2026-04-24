import { getDb, corsHeaders } from "../_shared/db.ts";

const DEFAULT_STATUSES = [
  { key: "new", display_name: "New", sort_order: 1, description: "Newly received email, not yet processed", is_active: true },
  { key: "ai_processed", display_name: "AI Processed", sort_order: 2, description: "AI enrichment complete, ready for human review", is_active: true },
  { key: "awaiting_review", display_name: "Awaiting Review", sort_order: 3, description: "Queued for human review", is_active: true },
  { key: "approved", display_name: "Approved", sort_order: 4, description: "Approved by reviewer", is_active: true },
  { key: "replied", display_name: "Replied", sort_order: 5, description: "Reply has been sent to the customer", is_active: true },
  { key: "escalated", display_name: "Escalated", sort_order: 6, description: "Escalated for manual handling", is_active: true },
  { key: "awaiting_customer", display_name: "Awaiting Customer", sort_order: 7, description: "Waiting for customer to respond", is_active: true },
  { key: "stock_in_process", display_name: "Stock In Process", sort_order: 8, description: "Insufficient stock — pending admin restock review", is_active: true },
];

async function ensureTable(sql: any) {
  try {
    await sql`SELECT 1 FROM statuses LIMIT 1`;
  } catch (e: any) {
    if (e?.code === "42P01") {
      await sql`CREATE TABLE IF NOT EXISTS statuses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        key text NOT NULL UNIQUE,
        display_name text NOT NULL,
        description text,
        sort_order integer NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`;
      for (const s of DEFAULT_STATUSES) {
        await sql`INSERT INTO statuses (key, display_name, description, sort_order, is_active)
          VALUES (${s.key}, ${s.display_name}, ${s.description}, ${s.sort_order}, ${s.is_active})
          ON CONFLICT (key) DO NOTHING`;
      }
      console.log("[api-statuses] Created and seeded statuses table");
    } else {
      throw e;
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const sql = getDb();

  try {
    await ensureTable(sql);

    if (req.method === "GET") {
      const statuses = await sql`SELECT * FROM statuses WHERE is_active = true ORDER BY sort_order ASC`;
      return new Response(JSON.stringify({ statuses }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("API statuses error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
