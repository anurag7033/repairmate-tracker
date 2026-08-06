CREATE OR REPLACE FUNCTION public.list_public_vouchers()
RETURNS TABLE(voucher_code text, voucher_name text, discount_type text, discount_amount numeric, discount_percentage numeric, min_order_amount numeric, max_order_amount numeric, expiry_date date)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.voucher_code, v.voucher_name, v.discount_type, v.discount_amount,
         v.discount_percentage, v.min_order_amount, v.max_order_amount, v.expiry_date
  FROM public.vouchers v
  WHERE v.status = 'active'
    AND COALESCE(v.applies_to, 'both') IN ('both','shop')
    AND (v.customer_phone IS NULL OR length(trim(v.customer_phone)) = 0)
    AND (v.expiry_date IS NULL OR v.expiry_date >= CURRENT_DATE)
    AND (v.usage_limit = 0 OR v.used_count < v.usage_limit)
  ORDER BY v.created_at DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.list_public_vouchers() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.apply_voucher_to_order_public(p_order_id text, p_voucher_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o RECORD;
  res jsonb;
  v_discount numeric := 0;
BEGIN
  SELECT * INTO o FROM public.customer_orders WHERE order_id = p_order_id LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF lower(o.payment_status) = 'paid' THEN RAISE EXCEPTION 'This order is already paid.'; END IF;
  IF lower(o.order_status) IN ('cancelled','delivered') THEN
    RAISE EXCEPTION 'Vouchers cannot be applied to this order.';
  END IF;

  res := public.apply_voucher_to_customer_order(p_voucher_code, o.subtotal, o.customer_phone);
  v_discount := COALESCE((res->>'discount_amount')::numeric, 0);

  UPDATE public.customer_orders
     SET voucher_id = (res->>'voucher_id')::uuid,
         voucher_code = res->>'voucher_code',
         discount_amount = v_discount,
         grand_total = GREATEST(0, o.subtotal - v_discount),
         updated_at = now()
   WHERE id = o.id;

  RETURN jsonb_build_object(
    'voucher_code', res->>'voucher_code',
    'voucher_name', res->>'voucher_name',
    'discount_amount', v_discount,
    'grand_total', GREATEST(0, o.subtotal - v_discount)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_voucher_to_order_public(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_customer_order_public(p_order_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o RECORD;
  items jsonb;
  v_name text;
BEGIN
  SELECT * INTO o FROM public.customer_orders WHERE order_id = p_order_id LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(i.*) ORDER BY i.created_at), '[]'::jsonb)
    INTO items
    FROM public.customer_order_items i
   WHERE i.order_id = o.id;

  SELECT v.voucher_name INTO v_name FROM public.vouchers v WHERE v.id = o.voucher_id;

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
    'voucher_name', v_name,
    'admin_notes', NULL,
    'created_at', o.created_at,
    'updated_at', o.updated_at,
    'customer_order_items', items
  );
END;
$$;