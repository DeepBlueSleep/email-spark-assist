import { getDb, corsHeaders } from "../_shared/db.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const sql = getDb();

  try {
    if (req.method === "GET") {
      const customers = await sql`SELECT * FROM customers ORDER BY name ASC`;
      return new Response(JSON.stringify({ customers }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { name, email, phone, company, notes, credit_limit, credit_terms, credit_used } = body;
      if (!email) {
        return new Response(JSON.stringify({ error: "email is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const rows = await sql`
        INSERT INTO customers (name, email, phone, company, notes, credit_limit, credit_terms, credit_used)
        VALUES (${name || "Unknown"}, ${email}, ${phone || null}, ${company || null}, ${notes || null}, ${credit_limit ?? 0}, ${credit_terms || "Net 30"}, ${credit_used ?? 0})
        ON CONFLICT (email) DO UPDATE SET
          name = COALESCE(NULLIF(EXCLUDED.name, 'Unknown'), customers.name),
          phone = COALESCE(EXCLUDED.phone, customers.phone),
          company = COALESCE(EXCLUDED.company, customers.company),
          notes = COALESCE(EXCLUDED.notes, customers.notes),
          credit_limit = COALESCE(EXCLUDED.credit_limit, customers.credit_limit),
          credit_terms = COALESCE(EXCLUDED.credit_terms, customers.credit_terms),
          credit_used = COALESCE(EXCLUDED.credit_used, customers.credit_used),
          updated_at = now()
        RETURNING *
      `;
      return new Response(JSON.stringify({ customer: rows[0] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "PATCH") {
      const body = await req.json();
      const { id, ...fields } = body;
      if (!id) {
        return new Response(JSON.stringify({ error: "id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const setClauses: string[] = [];
      if (fields.name !== undefined) setClauses.push(`name = '${fields.name.replace(/'/g, "''")}'`);
      if (fields.phone !== undefined) setClauses.push(`phone = '${(fields.phone || "").replace(/'/g, "''")}'`);
      if (fields.company !== undefined) setClauses.push(`company = '${(fields.company || "").replace(/'/g, "''")}'`);
      if (fields.notes !== undefined) setClauses.push(`notes = '${(fields.notes || "").replace(/'/g, "''")}'`);
      if (fields.credit_limit !== undefined) setClauses.push(`credit_limit = ${Number(fields.credit_limit)}`);
      if (fields.credit_terms !== undefined) setClauses.push(`credit_terms = '${(fields.credit_terms || "").replace(/'/g, "''")}'`);
      if (fields.credit_used !== undefined) setClauses.push(`credit_used = ${Number(fields.credit_used)}`);
      setClauses.push("updated_at = now()");

      await sql.unsafe(`UPDATE customers SET ${setClauses.join(", ")} WHERE id = '${id}'`);
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("API customers error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
