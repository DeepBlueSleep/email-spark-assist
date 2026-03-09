import { getDb, corsHeaders } from "../_shared/db.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const sql = getDb();

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const search = url.searchParams.get("search");

      let data;
      if (search) {
        const pattern = `%${search}%`;
        data = await sql`SELECT * FROM products WHERE name ILIKE ${pattern} OR sku_code ILIKE ${pattern} OR category ILIKE ${pattern} ORDER BY created_at DESC`;
      } else {
        data = await sql`SELECT * FROM products ORDER BY created_at DESC`;
      }

      return new Response(JSON.stringify({ products: data }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const p = body;
      const rows = await sql`
        INSERT INTO products (sku_code, name, category, subcategory, tags, color, size, material, price, stock_level, description, image_url, is_active)
        VALUES (${p.sku_code}, ${p.name}, ${p.category}, ${p.subcategory || ""}, ${p.tags || []}, ${p.color || ""}, ${p.size || ""}, ${p.material || ""}, ${p.price || 0}, ${p.stock_level || 0}, ${p.description || ""}, ${p.image_url || ""}, ${p.is_active !== undefined ? p.is_active : true})
        RETURNING *
      `;
      return new Response(JSON.stringify({ product: rows[0] }), {
        status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
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

      // Build SET dynamically
      const setClauses: string[] = [];
      const safeStr = (v: string) => v.replace(/'/g, "''");

      if (fields.sku_code !== undefined) setClauses.push(`sku_code = '${safeStr(fields.sku_code)}'`);
      if (fields.name !== undefined) setClauses.push(`name = '${safeStr(fields.name)}'`);
      if (fields.category !== undefined) setClauses.push(`category = '${safeStr(fields.category)}'`);
      if (fields.subcategory !== undefined) setClauses.push(`subcategory = '${safeStr(fields.subcategory)}'`);
      if (fields.color !== undefined) setClauses.push(`color = '${safeStr(fields.color)}'`);
      if (fields.size !== undefined) setClauses.push(`size = '${safeStr(fields.size)}'`);
      if (fields.material !== undefined) setClauses.push(`material = '${safeStr(fields.material)}'`);
      if (fields.price !== undefined) setClauses.push(`price = ${Number(fields.price)}`);
      if (fields.stock_level !== undefined) setClauses.push(`stock_level = ${Number(fields.stock_level)}`);
      if (fields.description !== undefined) setClauses.push(`description = '${safeStr(fields.description)}'`);
      if (fields.image_url !== undefined) setClauses.push(`image_url = '${safeStr(fields.image_url)}'`);
      if (fields.is_active !== undefined) setClauses.push(`is_active = ${fields.is_active}`);
      if (fields.tags !== undefined) setClauses.push(`tags = ARRAY[${(fields.tags || []).map((t: string) => `'${safeStr(t)}'`).join(",")}]::text[]`);
      setClauses.push("updated_at = now()");

      await sql.unsafe(`UPDATE products SET ${setClauses.join(", ")} WHERE id = '${id}'`);

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "DELETE") {
      const body = await req.json();
      if (!body.id) {
        return new Response(JSON.stringify({ error: "id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await sql`DELETE FROM products WHERE id = ${body.id}`;
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("API products error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
