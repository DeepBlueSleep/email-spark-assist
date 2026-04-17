ALTER TABLE public.emails
  ADD COLUMN IF NOT EXISTS is_relevant boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS relevance_reason text DEFAULT '';