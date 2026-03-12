
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Unknown',
  email text NOT NULL UNIQUE,
  phone text,
  company text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE emails ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on customers" ON customers FOR SELECT TO public USING (true);
CREATE POLICY "Allow insert on customers" ON customers FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow update on customers" ON customers FOR UPDATE TO public USING (true);
CREATE POLICY "Allow delete on customers" ON customers FOR DELETE TO public USING (true);

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
