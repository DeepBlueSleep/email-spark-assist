import { neon } from "https://esm.sh/@neondatabase/serverless@0.10.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const sql = neon(Deno.env.get("NEON_DATABASE_URL")!);
  const out: any = {};

  try {
    await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;

    await sql`CREATE TABLE IF NOT EXISTS customers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code text, name text NOT NULL DEFAULT 'Unknown',
      email text NOT NULL DEFAULT '', phone text, company text, notes text,
      address_1 text, address_2 text, address_3 text, fax text, attention text,
      discount text, agent text,
      delivery_address_1 text, delivery_address_2 text, delivery_address_3 text, delivery_address_4 text,
      credit_limit numeric DEFAULT 0, credit_terms text DEFAULT 'Net 30', credit_used numeric DEFAULT 0,
      is_boxx boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS products (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      sku_code text NOT NULL, name text NOT NULL,
      category text NOT NULL DEFAULT '', subcategory text DEFAULT '',
      tags text[] DEFAULT '{}', color text DEFAULT '', size text DEFAULT '', material text DEFAULT '',
      price numeric DEFAULT 0, stock_level integer DEFAULT 0,
      description text DEFAULT '', image_url text DEFAULT '',
      is_active boolean DEFAULT true,
      alt_code text, base_uom text, similar_code text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS intents (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      key text NOT NULL, display_name text NOT NULL, description text,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS statuses (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      key text NOT NULL, display_name text NOT NULL,
      sort_order integer DEFAULT 0,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS emails (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      external_id text,
      customer_id uuid,
      customer_name text NOT NULL DEFAULT 'Unknown Sender',
      email text NOT NULL DEFAULT '',
      subject text NOT NULL DEFAULT '(No Subject)',
      body text NOT NULL DEFAULT '',
      sentiment text DEFAULT 'Neutral', sentiment_confidence numeric DEFAULT 0,
      intent text DEFAULT 'General Question', intent_confidence numeric DEFAULT 0,
      ai_reply_draft text DEFAULT '', status text DEFAULT 'New',
      attachments text[] DEFAULT '{}',
      recommended_sku_codes jsonb DEFAULT '[]'::jsonb,
      is_relevant boolean NOT NULL DEFAULT true,
      relevance_reason text DEFAULT '',
      is_read boolean NOT NULL DEFAULT false,
      is_archived boolean NOT NULL DEFAULT false,
      timestamp timestamptz NOT NULL DEFAULT now(),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS order_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email_id uuid NOT NULL,
      item_code text NOT NULL, item_name text NOT NULL,
      quantity integer DEFAULT 1, unit text DEFAULT 'units',
      delivery_date text DEFAULT '', delivery_address text DEFAULT '', remarks text DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS ai_reply_drafts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email_id uuid NOT NULL,
      tone text NOT NULL DEFAULT 'Professional',
      draft text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now()
    )`;

    await sql`CREATE TABLE IF NOT EXISTS email_attachments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email_id uuid NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
      filename text NOT NULL DEFAULT 'unnamed',
      mime_type text NOT NULL DEFAULT 'application/octet-stream',
      content_base64 text NOT NULL DEFAULT '',
      size_bytes integer DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now()
    )`;

    // Verify read/write
    const testCust = await sql`INSERT INTO customers (name, email) VALUES ('__bootstrap_test__', 'bootstrap@test.local') RETURNING id`;
    const id = (testCust as any)[0].id;
    const readBack = await sql`SELECT id, name FROM customers WHERE id = ${id}`;
    await sql`DELETE FROM customers WHERE id = ${id}`;

    out.tables_created = true;
    out.write_test = readBack;
    return new Response(JSON.stringify({ ok: true, ...out }, null, 2), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message, ...out }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
