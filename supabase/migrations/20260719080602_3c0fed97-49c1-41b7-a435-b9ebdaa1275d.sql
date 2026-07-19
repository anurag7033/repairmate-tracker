CREATE OR REPLACE FUNCTION public.place_customer_order_public(
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_delivery_address text,
  p_payment_method text,
  p_items jsonb,
  p_voucher_id uuid,
  p_voucher_code text,
  p_discount_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_order public.customer_orders;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_grand numeric := 0;
  v_item jsonb;
BEGIN
  IF p_customer_name IS NULL OR btrim(p_customer_name) = '' THEN
    RAISE EXCEPTION 'Name is required';
  END IF;
  IF p_customer_phone IS NULL OR btrim(p_customer_phone) = '' THEN
    RAISE EXCEPTION 'Phone is required';
  END IF;
  IF p_delivery_address IS NULL OR btrim(p_delivery_address) = '' THEN
    RAISE EXCEPTION 'Delivery address is required';
  END IF;
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_subtotal := v_subtotal + (COALESCE((v_item->>'unit_price')::numeric,0) * COALESCE((v_item->>'quantity')::numeric,0));
  END LOOP;

  IF p_payment_method = 'online' THEN
    v_discount := GREATEST(0, COALESCE(p_discount_amount, 0));
  END IF;
  v_grand := GREATEST(0, v_subtotal - v_discount);

  INSERT INTO public.customer_orders (
    customer_name, customer_phone, customer_email, delivery_address,
    payment_method, subtotal, discount_amount, grand_total,
    voucher_id, voucher_code
  ) VALUES (
    btrim(p_customer_name),
    btrim(p_customer_phone),
    NULLIF(btrim(COALESCE(p_customer_email,'')), ''),
    btrim(p_delivery_address),
    p_payment_method,
    v_subtotal,
    v_discount,
    v_grand,
    CASE WHEN p_payment_method = 'online' THEN p_voucher_id ELSE NULL END,
    CASE WHEN p_payment_method = 'online' THEN NULLIF(btrim(COALESCE(p_voucher_code,'')), '') ELSE NULL END
  )
  RETURNING * INTO new_order;

  INSERT INTO public.customer_order_items (
    order_id, product_id, product_code, product_name, unit_price, quantity, line_total
  )
  SELECT
    new_order.id,
    NULLIF(elem->>'product_id','')::uuid,
    elem->>'product_code',
    elem->>'product_name',
    (elem->>'unit_price')::numeric,
    (elem->>'quantity')::numeric,
    COALESCE((elem->>'unit_price')::numeric,0) * COALESCE((elem->>'quantity')::numeric,0)
  FROM jsonb_array_elements(p_items) AS elem;

  RETURN public.get_customer_order_public(new_order.order_id);
END;
$function$;