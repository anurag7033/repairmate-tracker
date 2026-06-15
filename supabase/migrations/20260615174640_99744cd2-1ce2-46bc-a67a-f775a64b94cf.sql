-- Add purchase price to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Payment method enum
DO $$ BEGIN
  CREATE TYPE public.sales_payment_method AS ENUM ('cash','upi','card','bank_transfer','mixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.sales_payment_status AS ENUM ('paid','partial','pending');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS public.sales_invoice_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_sales_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  yr TEXT := to_char(now(), 'YYYY');
  nxt BIGINT;
BEGIN
  nxt := nextval('public.sales_invoice_seq');
  RETURN 'SI-' || yr || '-' || lpad(nxt::text, 4, '0');
END;
$$;

-- Sales invoices
CREATE TABLE IF NOT EXISTS public.sales_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE DEFAULT public.generate_sales_invoice_number(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_alt_phone TEXT,
  customer_email TEXT,
  customer_address TEXT,
  customer_gst TEXT,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  product_discount_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  invoice_discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
  gst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_received NUMERIC(12,2) NOT NULL DEFAULT 0,
  change_returned NUMERIC(12,2) NOT NULL DEFAULT 0,
  remaining_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_purchase_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_profit NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method public.sales_payment_method NOT NULL DEFAULT 'cash',
  payment_status public.sales_payment_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_invoices TO authenticated;
GRANT SELECT ON public.sales_invoices TO anon;
GRANT ALL ON public.sales_invoices TO service_role;
GRANT USAGE ON SEQUENCE public.sales_invoice_seq TO authenticated, anon, service_role;

ALTER TABLE public.sales_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage sales invoices"
  ON public.sales_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Anon can read sales invoices"
  ON public.sales_invoices FOR SELECT TO anon USING (true);

-- Sales invoice items
CREATE TABLE IF NOT EXISTS public.sales_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.sales_invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  profit_per_unit NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_profit NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_invoice_items TO authenticated;
GRANT SELECT ON public.sales_invoice_items TO anon;
GRANT ALL ON public.sales_invoice_items TO service_role;

ALTER TABLE public.sales_invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage sales invoice items"
  ON public.sales_invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Anon can read sales invoice items"
  ON public.sales_invoice_items FOR SELECT TO anon USING (true);

-- Trigger: decrement stock when invoice item inserted
CREATE OR REPLACE FUNCTION public.decrement_product_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.product_id IS NOT NULL THEN
    UPDATE public.products
       SET stock_quantity = GREATEST(0, stock_quantity - NEW.quantity::int),
           updated_at = now()
     WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_decrement_stock ON public.sales_invoice_items;
CREATE TRIGGER trg_decrement_stock
  AFTER INSERT ON public.sales_invoice_items
  FOR EACH ROW EXECUTE FUNCTION public.decrement_product_stock();

-- Update updated_at trigger on sales_invoices
DROP TRIGGER IF EXISTS trg_sales_invoices_updated ON public.sales_invoices;
CREATE TRIGGER trg_sales_invoices_updated
  BEFORE UPDATE ON public.sales_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_sales_invoices_customer ON public.sales_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_items_invoice ON public.sales_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_items_product ON public.sales_invoice_items(product_id);