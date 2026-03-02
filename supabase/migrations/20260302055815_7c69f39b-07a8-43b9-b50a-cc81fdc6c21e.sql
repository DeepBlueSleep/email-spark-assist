
-- Products knowledge base table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sku_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  subcategory TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  color TEXT DEFAULT '',
  size TEXT DEFAULT '',
  material TEXT DEFAULT '',
  price NUMERIC DEFAULT 0,
  stock_level INTEGER DEFAULT 0,
  description TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- AI reply drafts table (one per tone per email)
CREATE TABLE public.ai_reply_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id UUID NOT NULL REFERENCES public.emails(id) ON DELETE CASCADE,
  tone TEXT NOT NULL DEFAULT 'Professional',
  draft TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(email_id, tone)
);

-- RLS for products (public read, insert, update, delete for webhook/admin)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow insert on products" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on products" ON public.products FOR UPDATE USING (true);
CREATE POLICY "Allow delete on products" ON public.products FOR DELETE USING (true);

-- RLS for ai_reply_drafts
ALTER TABLE public.ai_reply_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on ai_reply_drafts" ON public.ai_reply_drafts FOR SELECT USING (true);
CREATE POLICY "Allow insert on ai_reply_drafts" ON public.ai_reply_drafts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on ai_reply_drafts" ON public.ai_reply_drafts FOR UPDATE USING (true);
CREATE POLICY "Allow delete on ai_reply_drafts" ON public.ai_reply_drafts FOR DELETE USING (true);

-- Trigger for products updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for products
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_reply_drafts;
