import { withAudit } from "../_shared/audit.ts";
import { getDb, corsHeaders } from "../_shared/db.ts";

Deno.serve(withAudit("api-customers", async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const sql = getDb();

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const id = url.searchParams.get("id");
      const email = url.searchParams.get("email");
      const code = url.searchParams.get("code");
      const search = url.searchParams.get("search");

      let customers;
      if (id) {
        customers = await sql`SELECT * FROM customers WHERE id = ${id}`;
      } else if (email) {
        customers = await sql`SELECT * FROM customers WHERE email = ${email}`;
      } else if (code) {
        customers = await sql`SELECT * FROM customers WHERE code = ${code}`;
      } else if (search) {
        const pattern = `%${search}%`;
        customers = await sql`SELECT * FROM customers WHERE name ILIKE ${pattern} OR email ILIKE ${pattern} OR company ILIKE ${pattern} OR code ILIKE ${pattern} ORDER BY name ASC`;
      } else {
        customers = await sql`SELECT * FROM customers ORDER BY name ASC`;
      }
      return new Response(JSON.stringify({ customers }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const id = url.searchParams.get("id");
      if (!id) {
        return new Response(JSON.stringify({ error: "id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await sql`DELETE FROM customers WHERE id = ${id}`;
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const {
        name, email, phone, company, notes, credit_limit, credit_terms, credit_used,
        code, address_1, address_2, address_3, fax, attention, discount, agent,
        delivery_address_1, delivery_address_2, delivery_address_3, delivery_address_4, is_boxx
      } = body;
      if (!email) {
        return new Response(JSON.stringify({ error: "email is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const rows = await sql`
        INSERT INTO customers (name, email, phone, company, notes, credit_limit, credit_terms, credit_used,
          code, address_1, address_2, address_3, fax, attention, discount, agent,
          delivery_address_1, delivery_address_2, delivery_address_3, delivery_address_4, is_boxx)
        VALUES (${name || "Unknown"}, ${email}, ${phone || null}, ${company || null}, ${notes || null},
          ${credit_limit ?? 0}, ${credit_terms || "Net 30"}, ${credit_used ?? 0},
          ${code || null}, ${address_1 || null}, ${address_2 || null}, ${address_3 || null},
          ${fax || null}, ${attention || null}, ${discount || null}, ${agent || null},
          ${delivery_address_1 || null}, ${delivery_address_2 || null}, ${delivery_address_3 || null}, ${delivery_address_4 || null},
          ${is_boxx ?? false})
        ON CONFLICT (email) DO UPDATE SET
          name = COALESCE(NULLIF(EXCLUDED.name, 'Unknown'), customers.name),
          phone = COALESCE(EXCLUDED.phone, customers.phone),
          company = COALESCE(EXCLUDED.company, customers.company),
          notes = COALESCE(EXCLUDED.notes, customers.notes),
          credit_limit = COALESCE(EXCLUDED.credit_limit, customers.credit_limit),
          credit_terms = COALESCE(EXCLUDED.credit_terms, customers.credit_terms),
          credit_used = COALESCE(EXCLUDED.credit_used, customers.credit_used),
          code = COALESCE(EXCLUDED.code, customers.code),
          address_1 = COALESCE(EXCLUDED.address_1, customers.address_1),
          address_2 = COALESCE(EXCLUDED.address_2, customers.address_2),
          address_3 = COALESCE(EXCLUDED.address_3, customers.address_3),
          fax = COALESCE(EXCLUDED.fax, customers.fax),
          attention = COALESCE(EXCLUDED.attention, customers.attention),
          discount = COALESCE(EXCLUDED.discount, customers.discount),
          agent = COALESCE(EXCLUDED.agent, customers.agent),
          delivery_address_1 = COALESCE(EXCLUDED.delivery_address_1, customers.delivery_address_1),
          delivery_address_2 = COALESCE(EXCLUDED.delivery_address_2, customers.delivery_address_2),
          delivery_address_3 = COALESCE(EXCLUDED.delivery_address_3, customers.delivery_address_3),
          delivery_address_4 = COALESCE(EXCLUDED.delivery_address_4, customers.delivery_address_4),
          is_boxx = COALESCE(EXCLUDED.is_boxx, customers.is_boxx),
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

      // Build parameterized SET clauses
      const updates: string[] = [];
      const values: any[] = [];
      let paramIdx = 1;

      const allowedFields = [
        'name', 'phone', 'company', 'notes', 'credit_limit', 'credit_terms', 'credit_used',
        'code', 'address_1', 'address_2', 'address_3', 'fax', 'attention', 'discount', 'agent',
        'delivery_address_1', 'delivery_address_2', 'delivery_address_3', 'delivery_address_4', 'is_boxx'
      ];

      for (const field of allowedFields) {
        if (fields[field] !== undefined) {
          updates.push(`${field} = $${paramIdx++}`);
          values.push(fields[field]);
        }
      }

      updates.push("updated_at = now()");
      values.push(id);

      const query = `UPDATE customers SET ${updates.join(", ")} WHERE id = $${paramIdx} RETURNING *`;
      const rows = await sql.unsafe(query, values);

      return new Response(JSON.stringify({ success: true, customer: rows[0] }), {
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
}));
