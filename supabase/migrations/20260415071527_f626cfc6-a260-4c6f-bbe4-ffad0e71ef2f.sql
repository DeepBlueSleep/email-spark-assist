
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address_1 text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address_2 text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address_3 text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS fax text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS attention text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS discount text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS agent text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS delivery_address_1 text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS delivery_address_2 text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS delivery_address_3 text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS delivery_address_4 text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS is_boxx boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_code ON public.customers (code) WHERE code IS NOT NULL;
