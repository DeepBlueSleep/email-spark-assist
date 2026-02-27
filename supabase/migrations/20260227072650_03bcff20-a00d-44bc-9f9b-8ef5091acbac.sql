
-- Create emails table
CREATE TABLE public.emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id TEXT UNIQUE,
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sentiment TEXT DEFAULT 'Neutral',
  sentiment_confidence NUMERIC DEFAULT 0,
  intent TEXT DEFAULT 'General Question',
  intent_confidence NUMERIC DEFAULT 0,
  ai_reply_draft TEXT DEFAULT '',
  status TEXT DEFAULT 'New',
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id UUID NOT NULL REFERENCES public.emails(id) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit TEXT DEFAULT 'units',
  delivery_date TEXT DEFAULT '',
  delivery_address TEXT DEFAULT '',
  remarks TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create recommended_skus table
CREATE TABLE public.recommended_skus (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id UUID NOT NULL REFERENCES public.emails(id) ON DELETE CASCADE,
  sku_code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT '',
  color TEXT DEFAULT '',
  size TEXT DEFAULT '',
  price NUMERIC DEFAULT 0,
  stock_level INTEGER DEFAULT 0,
  match_reason TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create webhook_logs table for tracking incoming webhooks
CREATE TABLE public.webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'received',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommended_skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Public read policies (internal admin tool, no auth required for now)
CREATE POLICY "Allow public read on emails" ON public.emails FOR SELECT USING (true);
CREATE POLICY "Allow public read on order_items" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "Allow public read on recommended_skus" ON public.recommended_skus FOR SELECT USING (true);
CREATE POLICY "Allow public read on webhook_logs" ON public.webhook_logs FOR SELECT USING (true);

-- Insert policies for edge functions (using service role, but also allow anon for webhooks)
CREATE POLICY "Allow insert on emails" ON public.emails FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert on order_items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert on recommended_skus" ON public.recommended_skus FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert on webhook_logs" ON public.webhook_logs FOR INSERT WITH CHECK (true);

-- Update policies
CREATE POLICY "Allow update on emails" ON public.emails FOR UPDATE USING (true);
CREATE POLICY "Allow update on order_items" ON public.order_items FOR UPDATE USING (true);

-- Delete policy for order items
CREATE POLICY "Allow delete on order_items" ON public.order_items FOR DELETE USING (true);

-- Enable realtime for emails table
ALTER PUBLICATION supabase_realtime ADD TABLE public.emails;

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_emails_updated_at
  BEFORE UPDATE ON public.emails
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
