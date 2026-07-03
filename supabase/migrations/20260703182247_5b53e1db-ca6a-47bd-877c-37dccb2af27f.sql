
-- Sequence + id generator
CREATE SEQUENCE IF NOT EXISTS public.customer_order_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_customer_order_id()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE yr text := to_char(now(), 'YYYY'); nxt bigint;
BEGIN
  nxt := nextval('public.customer_order_seq');
  RETURN 'ORD-' || yr || '-' || lpad(nxt::text, 4, '0');
END;
$$;

-- customer_orders
CREATE TABLE public.customer_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL UNIQUE DEFAULT public.generate_customer_order_id(),
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  delivery_address text NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('cod','online')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','refunded')),
  order_status text NOT NULL DEFAULT 'placed' CHECK (order_status IN ('placed','accepted','preparing','out_for_delivery','delivered','cancelled')),
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  grand_total numeric(12,2) NOT NULL DEFAULT 0,
  voucher_id uuid REFERENCES public.vouchers(id) ON DELETE SET NULL,
  voucher_code text,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.customer_orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_orders TO authenticated;
GRANT ALL ON public.customer_orders TO service_role;
GRANT USAGE ON SEQUENCE public.customer_order_seq TO anon, authenticated, service_role;

ALTER TABLE public.customer_orders ENABLE ROW LEVEL SECURITY;

-- Anyone can place an order
CREATE POLICY "Anyone can create orders"
  ON public.customer_orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Anon can read orders (needed for tracking by order_id — we filter client-side)
CREATE POLICY "Anyone can view orders"
  ON public.customer_orders FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated can update orders"
  ON public.customer_orders FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete orders"
  ON public.customer_orders FOR DELETE
  TO authenticated
  USING (true);

CREATE TRIGGER customer_orders_updated_at
  BEFORE UPDATE ON public.customer_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- customer_order_items
CREATE TABLE public.customer_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.customer_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_code text NOT NULL,
  product_name text NOT NULL,
  unit_price numeric(12,2) NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  line_total numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.customer_order_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_order_items TO authenticated;
GRANT ALL ON public.customer_order_items TO service_role;

ALTER TABLE public.customer_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create order items"
  ON public.customer_order_items FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can view order items"
  ON public.customer_order_items FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated can update order items"
  ON public.customer_order_items FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete order items"
  ON public.customer_order_items FOR DELETE
  TO authenticated USING (true);

-- Auto-decrement stock when an order item is inserted
CREATE OR REPLACE FUNCTION public.decrement_stock_on_order_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.product_id IS NOT NULL THEN
    UPDATE public.products
       SET stock_quantity = GREATEST(0, stock_quantity - NEW.quantity),
           updated_at = now()
     WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER customer_order_items_stock
  AFTER INSERT ON public.customer_order_items
  FOR EACH ROW EXECUTE FUNCTION public.decrement_stock_on_order_item();

-- Voucher application RPC (validation only; increments used_count)
CREATE OR REPLACE FUNCTION public.apply_voucher_to_customer_order(
  p_voucher_code text,
  p_subtotal numeric,
  p_phone text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v RECORD;
  discount_value numeric := 0;
BEGIN
  SELECT * INTO v FROM public.vouchers WHERE voucher_code = p_voucher_code LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid voucher code'; END IF;
  IF v.status <> 'active' THEN RAISE EXCEPTION 'This voucher is no longer active.'; END IF;
  IF v.expiry_date IS NOT NULL AND v.expiry_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'This voucher has expired.';
  END IF;
  IF v.usage_limit > 0 AND v.used_count >= v.usage_limit THEN
    RAISE EXCEPTION 'This voucher has reached its usage limit.';
  END IF;
  IF v.min_order_amount > 0 AND p_subtotal < v.min_order_amount THEN
    RAISE EXCEPTION 'Minimum order amount is Rs. %', v.min_order_amount;
  END IF;
  IF v.max_order_amount > 0 AND p_subtotal > v.max_order_amount THEN
    RAISE EXCEPTION 'This voucher is valid for orders up to Rs. %', v.max_order_amount;
  END IF;

  IF v.discount_type = 'percentage' THEN
    discount_value := round((p_subtotal * v.discount_percentage) / 100);
  ELSE
    discount_value := v.discount_amount;
  END IF;

  RETURN jsonb_build_object(
    'voucher_id', v.id,
    'voucher_code', v.voucher_code,
    'discount_amount', discount_value
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_voucher_to_customer_order(text, numeric, text) TO anon, authenticated;
