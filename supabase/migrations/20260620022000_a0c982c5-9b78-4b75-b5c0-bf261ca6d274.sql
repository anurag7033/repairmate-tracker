
ALTER TABLE public.sales_invoice_items
  ADD COLUMN IF NOT EXISTS returned_quantity NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.sales_invoices
  ADD COLUMN IF NOT EXISTS total_returned NUMERIC(12,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.sales_invoice_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.sales_invoices(id) ON DELETE CASCADE,
  refund_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  refund_method TEXT,
  reason TEXT,
  restock BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_invoice_returns TO authenticated;
GRANT SELECT ON public.sales_invoice_returns TO anon;
GRANT ALL ON public.sales_invoice_returns TO service_role;

ALTER TABLE public.sales_invoice_returns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth manage returns" ON public.sales_invoice_returns;
CREATE POLICY "auth manage returns"
  ON public.sales_invoice_returns FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon read returns" ON public.sales_invoice_returns;
CREATE POLICY "anon read returns"
  ON public.sales_invoice_returns FOR SELECT TO anon USING (true);

CREATE TABLE IF NOT EXISTS public.sales_invoice_return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES public.sales_invoice_returns(id) ON DELETE CASCADE,
  invoice_item_id UUID REFERENCES public.sales_invoice_items(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity NUMERIC(12,2) NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  refund_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  restock BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_invoice_return_items TO authenticated;
GRANT SELECT ON public.sales_invoice_return_items TO anon;
GRANT ALL ON public.sales_invoice_return_items TO service_role;

ALTER TABLE public.sales_invoice_return_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth manage return items" ON public.sales_invoice_return_items;
CREATE POLICY "auth manage return items"
  ON public.sales_invoice_return_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon read return items" ON public.sales_invoice_return_items;
CREATE POLICY "anon read return items"
  ON public.sales_invoice_return_items FOR SELECT TO anon USING (true);

CREATE INDEX IF NOT EXISTS idx_return_items_return ON public.sales_invoice_return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_returns_invoice ON public.sales_invoice_returns(invoice_id);

CREATE OR REPLACE FUNCTION public.apply_return_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.restock AND NEW.product_id IS NOT NULL AND NEW.quantity > 0 THEN
    UPDATE public.products
       SET stock_quantity = stock_quantity + NEW.quantity::int,
           updated_at = now()
     WHERE id = NEW.product_id;
  END IF;
  IF NEW.invoice_item_id IS NOT NULL THEN
    UPDATE public.sales_invoice_items
       SET returned_quantity = COALESCE(returned_quantity,0) + NEW.quantity
     WHERE id = NEW.invoice_item_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_return_item ON public.sales_invoice_return_items;
CREATE TRIGGER trg_apply_return_item
  AFTER INSERT ON public.sales_invoice_return_items
  FOR EACH ROW EXECUTE FUNCTION public.apply_return_item();

CREATE OR REPLACE FUNCTION public.apply_return_to_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv RECORD;
  net_total NUMERIC(12,2);
  diff NUMERIC(12,2);
  new_remaining NUMERIC(12,2);
  new_change NUMERIC(12,2);
  new_status TEXT;
BEGIN
  UPDATE public.sales_invoices
     SET total_returned = COALESCE(total_returned,0) + COALESCE(NEW.refund_amount,0),
         updated_at = now()
   WHERE id = NEW.invoice_id;

  SELECT * INTO inv FROM public.sales_invoices WHERE id = NEW.invoice_id;
  net_total := GREATEST(0, COALESCE(inv.grand_total,0) - COALESCE(inv.total_returned,0));
  diff := COALESCE(inv.amount_received,0) - net_total;
  new_change := CASE WHEN diff > 0 THEN diff ELSE 0 END;
  new_remaining := CASE WHEN diff < 0 THEN -diff ELSE 0 END;
  IF net_total <= 0 THEN
    new_status := 'paid';
  ELSIF COALESCE(inv.amount_received,0) >= net_total THEN
    new_status := 'paid';
  ELSIF COALESCE(inv.amount_received,0) > 0 THEN
    new_status := 'partial';
  ELSE
    new_status := 'pending';
  END IF;

  UPDATE public.sales_invoices
     SET change_returned = new_change,
         remaining_amount = new_remaining,
         payment_status = new_status::sales_payment_status
   WHERE id = NEW.invoice_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_return_to_invoice ON public.sales_invoice_returns;
CREATE TRIGGER trg_apply_return_to_invoice
  AFTER INSERT ON public.sales_invoice_returns
  FOR EACH ROW EXECUTE FUNCTION public.apply_return_to_invoice();
