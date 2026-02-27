ALTER TABLE public.emails ALTER COLUMN customer_name SET DEFAULT 'Unknown Sender';
ALTER TABLE public.emails ALTER COLUMN email SET DEFAULT '';
ALTER TABLE public.emails ALTER COLUMN subject SET DEFAULT '(No Subject)';
ALTER TABLE public.emails ALTER COLUMN body SET DEFAULT '';