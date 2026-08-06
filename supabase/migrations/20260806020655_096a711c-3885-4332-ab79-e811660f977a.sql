
CREATE OR REPLACE FUNCTION public.is_returning_customer(p_phone text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE ph text; c int := 0;
BEGIN
  ph := right(regexp_replace(coalesce(p_phone,''), '\D', '', 'g'), 10);
  IF length(ph) < 10 THEN RETURN false; END IF;
  SELECT count(*) INTO c FROM public.customer_orders
   WHERE right(regexp_replace(coalesce(customer_phone,''), '\D', '', 'g'), 10) = ph;
  IF c > 0 THEN RETURN true; END IF;
  SELECT count(*) INTO c FROM public.repair_orders
   WHERE right(regexp_replace(coalesce(customer_phone,''), '\D', '', 'g'), 10) = ph;
  RETURN c > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.is_returning_customer(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_returning_customer(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_checkout_vouchers_for_phone(p_phone text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ph text;
  order_count int := 0;
  repair_count int := 0;
  is_new boolean;
  vs jsonb;
BEGIN
  ph := right(regexp_replace(coalesce(p_phone,''), '\D', '', 'g'), 10);
  IF length(ph) < 10 THEN
    RETURN jsonb_build_object('valid', false, 'is_new_customer', true, 'order_count', 0, 'repair_count', 0, 'vouchers', '[]'::jsonb);
  END IF;

  SELECT count(*) INTO order_count FROM public.customer_orders
   WHERE right(regexp_replace(coalesce(customer_phone,''), '\D', '', 'g'), 10) = ph;

  SELECT count(*) INTO repair_count FROM public.repair_orders
   WHERE right(regexp_replace(coalesce(customer_phone,''), '\D', '', 'g'), 10) = ph;

  is_new := (order_count = 0 AND repair_count = 0);

  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'personal' DESC), '[]'::jsonb) INTO vs
  FROM (
    SELECT jsonb_build_object(
             'voucher_code', v.voucher_code,
             'voucher_name', v.voucher_name,
             'discount_type', v.discount_type,
             'discount_amount', v.discount_amount,
             'discount_percentage', v.discount_percentage,
             'min_order_amount', v.min_order_amount,
             'max_order_amount', v.max_order_amount,
             'expiry_date', v.expiry_date,
             'voucher_type', v.voucher_type,
             'personal', (v.customer_phone IS NOT NULL AND length(trim(v.customer_phone)) > 0)
           ) AS x
    FROM public.vouchers v
    WHERE v.status = 'active'
      AND COALESCE(v.applies_to, 'both') IN ('both','shop')
      AND (v.expiry_date IS NULL OR v.expiry_date >= CURRENT_DATE)
      AND (v.usage_limit = 0 OR v.used_count < v.usage_limit)
      AND (
        v.customer_phone IS NULL
        OR length(trim(v.customer_phone)) = 0
        OR right(regexp_replace(v.customer_phone, '\D', '', 'g'), 10) = ph
      )
      AND (is_new OR COALESCE(v.voucher_type, 'public') <> 'new_customer')
    LIMIT 50
  ) t;

  RETURN jsonb_build_object(
    'valid', true,
    'is_new_customer', is_new,
    'order_count', order_count,
    'repair_count', repair_count,
    'vouchers', vs
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_voucher_to_customer_order(p_voucher_code text, p_subtotal numeric, p_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v RECORD;
  discount_value numeric := 0;
BEGIN
  SELECT * INTO v FROM public.vouchers WHERE upper(voucher_code) = upper(trim(p_voucher_code)) LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid voucher code'; END IF;
  IF v.status <> 'active' THEN RAISE EXCEPTION 'This voucher is no longer active.'; END IF;
  IF COALESCE(v.applies_to, 'both') NOT IN ('both', 'shop') THEN
    RAISE EXCEPTION 'This voucher cannot be used for online orders.';
  END IF;
  IF COALESCE(v.voucher_type, 'public') = 'new_customer'
     AND public.is_returning_customer(p_phone) THEN
    RAISE EXCEPTION 'This offer is only for first-time customers.';
  END IF;
  IF v.customer_phone IS NOT NULL AND length(trim(v.customer_phone)) > 0 THEN
    IF p_phone IS NULL OR right(regexp_replace(p_phone, '[^0-9]', '', 'g'), 10)
       <> right(regexp_replace(v.customer_phone, '[^0-9]', '', 'g'), 10) THEN
      RAISE EXCEPTION 'This voucher is reserved for another customer.';
    END IF;
  END IF;
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
  IF discount_value > p_subtotal THEN discount_value := p_subtotal; END IF;

  RETURN jsonb_build_object(
    'voucher_id', v.id,
    'voucher_code', v.voucher_code,
    'voucher_name', v.voucher_name,
    'discount_amount', discount_value
  );
END;
$$;
