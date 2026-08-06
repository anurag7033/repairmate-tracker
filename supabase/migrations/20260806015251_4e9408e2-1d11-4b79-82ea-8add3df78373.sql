CREATE OR REPLACE FUNCTION public.get_checkout_vouchers_for_phone(p_phone text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ph text;
  order_count int := 0;
  repair_count int := 0;
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
    LIMIT 50
  ) t;

  RETURN jsonb_build_object(
    'valid', true,
    'is_new_customer', (order_count = 0 AND repair_count = 0),
    'order_count', order_count,
    'repair_count', repair_count,
    'vouchers', vs
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_checkout_vouchers_for_phone(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_checkout_vouchers_for_phone(text) TO anon, authenticated, service_role;