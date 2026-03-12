ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_limit numeric DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_terms text DEFAULT 'Net 30';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_used numeric DEFAULT 0;