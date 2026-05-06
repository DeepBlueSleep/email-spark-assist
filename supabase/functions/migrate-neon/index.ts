import { neon } from "https://esm.sh/@neondatabase/serverless@0.10.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tables to migrate (skip logs: webhook_logs, audit_logs, http_logs, etc.)
const TABLES = [
  "customers",
  "products",
  "intents",
  "statuses",
  "emails",
  "order_items",
  "ai_reply_drafts",
  "email_attachments",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const oldUrl = Deno.env.get("NEON_DATABASE_URL");
  const newUrl = Deno.env.get("NEON_DATABASE_URL_NEW");
  if (!oldUrl || !newUrl) {
    return new Response(JSON.stringify({ error: "Missing NEON_DATABASE_URL or NEON_DATABASE_URL_NEW" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const src = neon(oldUrl);
  const dst = neon(newUrl);
  const results: Record<string, any> = {};

  const url = new URL(req.url);
  const onlyTable = url.searchParams.get("table");
  const tablesToRun = onlyTable ? [onlyTable] : TABLES;

  try {
    for (const table of tablesToRun) {
      try {
        // Fetch source schema (column list, ordered)
        const cols = await src`
          SELECT column_name FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = ${table}
          ORDER BY ordinal_position
        ` as any[];

        if (cols.length === 0) {
          results[table] = { skipped: "table not in source" };
          continue;
        }

        // Ensure destination has the table (use src DDL via pg_dump-ish CREATE TABLE LIKE workaround).
        // Simplest: read DDL by querying information_schema and recreate columns.
        const colDefs = await src`
          SELECT column_name, data_type, udt_name, is_nullable, column_default, character_maximum_length
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = ${table}
          ORDER BY ordinal_position
        ` as any[];

        const ddlCols = colDefs.map((c) => {
          let type = c.data_type;
          if (type === "ARRAY") type = `${c.udt_name.replace(/^_/, "")}[]`;
          if (type === "USER-DEFINED") type = c.udt_name;
          if (type === "character varying" && c.character_maximum_length) type = `varchar(${c.character_maximum_length})`;
          const nn = c.is_nullable === "NO" ? " NOT NULL" : "";
          const def = c.column_default ? ` DEFAULT ${c.column_default}` : "";
          return `"${c.column_name}" ${type}${nn}${def}`;
        }).join(", ");

        await dst.query(`CREATE TABLE IF NOT EXISTS "${table}" (${ddlCols})`);

        // Read all rows from source
        const rows = await src.query(`SELECT * FROM "${table}"`) as any[];

        if (rows.length === 0) {
          results[table] = { rows: 0, inserted: 0 };
          continue;
        }

        const colNames = cols.map((c) => c.column_name);
        const quotedCols = colNames.map((c) => `"${c}"`).join(", ");

        // Batch insert in chunks of 100
        const chunkSize = 100;
        let inserted = 0;
        for (let i = 0; i < rows.length; i += chunkSize) {
          const chunk = rows.slice(i, i + chunkSize);
          const params: any[] = [];
          const valueRows: string[] = [];
          chunk.forEach((row) => {
            const placeholders: string[] = [];
            colNames.forEach((cn) => {
              params.push(row[cn] ?? null);
              placeholders.push(`$${params.length}`);
            });
            valueRows.push(`(${placeholders.join(", ")})`);
          });
          const q = `INSERT INTO "${table}" (${quotedCols}) VALUES ${valueRows.join(", ")} ON CONFLICT DO NOTHING`;
          await dst.query(q, params);
          inserted += chunk.length;
        }

        results[table] = { rows: rows.length, inserted };
      } catch (e: any) {
        results[table] = { error: e.message };
      }
    }

    return new Response(JSON.stringify({ ok: true, results }, null, 2), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message, results }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
