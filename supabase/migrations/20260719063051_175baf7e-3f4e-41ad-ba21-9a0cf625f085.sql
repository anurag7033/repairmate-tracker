
-- 1) Sales invoice family: remove anon SELECT
DROP POLICY IF EXISTS "Anon can read sales invoices" ON public.sales_invoices;
DROP POLICY IF EXISTS "Anon can read sales invoice items" ON public.sales_invoice_items;
DROP POLICY IF EXISTS "Anon can read sales invoice payments" ON public.sales_invoice_payments;
DROP POLICY IF EXISTS "anon read returns" ON public.sales_invoice_returns;
DROP POLICY IF EXISTS "anon read return items" ON public.sales_invoice_return_items;

-- 2) Customer orders: restrict SELECT to authenticated
DROP POLICY IF EXISTS "Anyone can view orders" ON public.customer_orders;
DROP POLICY IF EXISTS "Anyone can view order items" ON public.customer_order_items;

CREATE POLICY "Authenticated can view orders" ON public.customer_orders
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can view order items" ON public.customer_order_items
  FOR SELECT TO authenticated USING (true);

-- Revoke anon SELECT grants (INSERT policy still needs INSERT grant)
REVOKE SELECT ON public.customer_orders FROM anon;
REVOKE SELECT ON public.customer_order_items FROM anon;
REVOKE SELECT ON public.sales_invoices FROM anon;
REVOKE SELECT ON public.sales_invoice_items FROM anon;
REVOKE SELECT ON public.sales_invoice_payments FROM anon;
REVOKE SELECT ON public.sales_invoice_returns FROM anon;
REVOKE SELECT ON public.sales_invoice_return_items FROM anon;

-- 3) Public RPC: fetch a single customer order (with items) by order_id for tracking
CREATE OR REPLACE FUNCTION public.get_customer_order_public(p_order_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o RECORD;
  items jsonb;
BEGIN
  SELECT * INTO o FROM public.customer_orders WHERE order_id = p_order_id LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(i.*) ORDER BY i.created_at), '[]'::jsonb)
    INTO items
    FROM public.customer_order_items i
   WHERE i.order_id = o.id;

  RETURN jsonb_build_object(
    'id', o.id,
    'order_id', o.order_id,
    'customer_name', regexp_replace(o.customer_name, '(\S+)(\s+\S+)?', '\1'),
    'customer_phone', right(regexp_replace(coalesce(o.customer_phone,''),'\D','','g'),10),
    'customer_email', NULL,
    'delivery_address', o.delivery_address,
    'payment_method', o.payment_method,
    'payment_status', o.payment_status,
    'order_status', o.order_status,
    'subtotal', o.subtotal,
    'discount_amount', o.discount_amount,
    'grand_total', o.grand_total,
    'voucher_id', o.voucher_id,
    'voucher_code', o.voucher_code,
    'admin_notes', NULL,
    'created_at', o.created_at,
    'updated_at', o.updated_at,
    'customer_order_items', items
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_customer_order_public(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_customer_order_public(text) TO anon, authenticated;

-- 4) Revoke EXECUTE on internal SECURITY DEFINER helpers (triggers / generators)
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.update_repair_orders_updated_at()',
    'public.sync_booking_from_repair_order()',
    'public.update_updated_at_column()',
    'public.compute_product_final_price()',
    'public.decrement_product_stock()',
    'public.decrement_stock_on_order_item()',
    'public.set_requirement_id()',
    'public.link_repair_to_customer()',
    'public.apply_return_item()',
    'public.apply_return_to_invoice()',
    'public.generate_sales_invoice_number()',
    'public.generate_customer_order_id()',
    'public.generate_requirement_id()'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;

-- 5) Storage: prevent bucket listing by restricting SELECT on storage.objects
-- Public URLs for booking-images still work via the CDN regardless of RLS.
DROP POLICY IF EXISTS "Booking images are publicly accessible" ON storage.objects;
CREATE POLICY "Authenticated can list booking images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'booking-images');
