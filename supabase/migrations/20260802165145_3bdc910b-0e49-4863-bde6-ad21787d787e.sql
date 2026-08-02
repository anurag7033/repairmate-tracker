ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_trending boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;

ALTER TABLE public.vouchers
  ADD COLUMN IF NOT EXISTS applies_to text NOT NULL DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS customer_phone text;

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
  SELECT * INTO v FROM public.vouchers WHERE upper(voucher_code) = upper(trim(p_voucher_code)) LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid voucher code'; END IF;
  IF v.status <> 'active' THEN RAISE EXCEPTION 'This voucher is no longer active.'; END IF;
  IF COALESCE(v.applies_to, 'both') NOT IN ('both', 'shop') THEN
    RAISE EXCEPTION 'This voucher cannot be used for online orders.';
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

GRANT EXECUTE ON FUNCTION public.apply_voucher_to_customer_order(text, numeric, text) TO anon, authenticated, service_role;