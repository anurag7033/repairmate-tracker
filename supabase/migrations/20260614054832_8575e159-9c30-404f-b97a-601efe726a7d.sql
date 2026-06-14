
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  brand TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  selling_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_type TEXT NOT NULL DEFAULT 'amount' CHECK (discount_type IN ('amount','percentage')),
  discount_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  final_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read products" ON public.products
  FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can insert products" ON public.products
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update products" ON public.products
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete products" ON public.products
  FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.compute_product_final_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  fp NUMERIC(12,2);
BEGIN
  IF NEW.discount_type = 'percentage' THEN
    fp := NEW.selling_price - (NEW.selling_price * COALESCE(NEW.discount_value,0) / 100.0);
  ELSE
    fp := NEW.selling_price - COALESCE(NEW.discount_value,0);
  END IF;
  IF fp < 0 THEN fp := 0; END IF;
  NEW.final_price := round(fp::numeric, 2);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER products_compute_price
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.compute_product_final_price();

CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_brand ON public.products(brand);
CREATE INDEX idx_products_status ON public.products(status);
