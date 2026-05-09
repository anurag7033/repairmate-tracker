
-- 1) Drop overly permissive public SELECT policies
DROP POLICY IF EXISTS "Anyone can read orders" ON public.repair_orders;
DROP POLICY IF EXISTS "Anyone can read bookings" ON public.bookings;
DROP POLICY IF EXISTS "Anyone can read redemptions" ON public.voucher_redemptions;

-- 2) Add restricted SELECT policies for authenticated admin users
CREATE POLICY "Authenticated users can read orders"
  ON public.repair_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read bookings"
  ON public.bookings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read redemptions"
  ON public.voucher_redemptions FOR SELECT TO authenticated USING (true);

-- 3) Public lookup function for repair tracking — returns only fields needed by the customer page
CREATE OR REPLACE FUNCTION public.get_repair_by_tracking(p_tracking_id text)
RETURNS TABLE (
  id uuid,
  tracking_id text,
  customer_name text,
  mobile_brand text,
  mobile_model text,
  issue_description text,
  repair_details text,
  status repair_status,
  quotation numeric,
  advance_paid numeric,
  discount_amount numeric,
  payment_status payment_status,
  payment_link text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, tracking_id,
         -- Only return first name + masked last name to limit PII exposure
         regexp_replace(customer_name, '(\S+)(\s+\S+)?', '\1') AS customer_name,
         mobile_brand, mobile_model, issue_description, repair_details,
         status, quotation, advance_paid, discount_amount,
         payment_status, payment_link, created_at, updated_at
  FROM public.repair_orders
  WHERE tracking_id ILIKE p_tracking_id
  LIMIT 1;
$$;

-- 4) Public lookup for bookings — returns safe fields only
CREATE OR REPLACE FUNCTION public.get_booking_by_id(p_booking_id text)
RETURNS TABLE (
  id uuid,
  booking_id text,
  customer_name text,
  device_brand text,
  device_model text,
  device_type device_type,
  issue_type text,
  issue_description text,
  service_type service_type,
  preferred_date date,
  preferred_time_slot text,
  city text,
  pincode text,
  status booking_status,
  tracking_id text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, booking_id,
         regexp_replace(customer_name, '(\S+)(\s+\S+)?', '\1') AS customer_name,
         device_brand, device_model, device_type,
         issue_type, issue_description, service_type,
         preferred_date, preferred_time_slot,
         city, pincode, status, tracking_id, created_at, updated_at
  FROM public.bookings
  WHERE booking_id = p_booking_id
  LIMIT 1;
$$;

-- 5) Public voucher application RPC — runs all validation server-side so customer
--    code does NOT need direct read access to repair_orders or voucher_redemptions
CREATE OR REPLACE FUNCTION public.apply_voucher_public(
  p_voucher_code text,
  p_tracking_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v RECORD;
  o RECORD;
  prior_count int;
  redeemed_count int;
  discount_value numeric := 0;
  new_discount numeric;
  final_amount numeric;
  new_used_count int;
  new_status text;
  cur_phone_last10 text;
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

  SELECT * INTO o FROM public.repair_orders WHERE tracking_id = p_tracking_id LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

  -- Private vouchers: tied to original customer
  IF v.voucher_type = 'private' THEN
    IF v.tracking_id = p_tracking_id THEN
      RAISE EXCEPTION 'This voucher can only be used on your next repair, not the current one.';
    END IF;
    IF v.tracking_id IS NOT NULL THEN
      DECLARE orig_phone text;
      BEGIN
        SELECT customer_phone INTO orig_phone FROM public.repair_orders WHERE tracking_id = v.tracking_id LIMIT 1;
        IF right(regexp_replace(coalesce(orig_phone,''), '\D', '', 'g'), 10)
           <> right(regexp_replace(o.customer_phone, '\D', '', 'g'), 10) THEN
          RAISE EXCEPTION 'This voucher is not valid for your account.';
        END IF;
      END;
    END IF;
  END IF;

  -- New customer vouchers: only on first repair
  IF v.voucher_type = 'new_customer' THEN
    cur_phone_last10 := right(regexp_replace(o.customer_phone, '\D', '', 'g'), 10);
    SELECT count(*) INTO prior_count
    FROM public.repair_orders
    WHERE right(regexp_replace(customer_phone, '\D', '', 'g'), 10) = cur_phone_last10
      AND tracking_id <> p_tracking_id;
    IF prior_count > 0 THEN
      RAISE EXCEPTION 'This voucher is only for new customers.';
    END IF;
  END IF;

  -- One voucher per order
  SELECT count(*) INTO redeemed_count FROM public.voucher_redemptions WHERE order_tracking_id = p_tracking_id;
  IF redeemed_count > 0 THEN
    RAISE EXCEPTION 'A voucher is already applied. Remove it first to apply another.';
  END IF;

  -- Min/max
  IF v.min_order_amount > 0 AND o.quotation < v.min_order_amount THEN
    RAISE EXCEPTION 'Minimum order amount is ₹%', v.min_order_amount;
  END IF;
  IF v.max_order_amount > 0 AND o.quotation > v.max_order_amount THEN
    RAISE EXCEPTION 'This voucher is valid for orders up to ₹%', v.max_order_amount;
  END IF;

  IF v.discount_type = 'percentage' THEN
    discount_value := round((o.quotation * v.discount_percentage) / 100);
  ELSE
    discount_value := v.discount_amount;
  END IF;

  new_discount := coalesce(o.discount_amount, 0) + discount_value;
  final_amount := greatest(0, o.quotation - new_discount);

  INSERT INTO public.voucher_redemptions
    (voucher_id, order_tracking_id, customer_name, customer_phone, amount_before, discount_applied, final_amount)
  VALUES
    (v.id, p_tracking_id, o.customer_name, o.customer_phone, o.quotation, discount_value, final_amount);

  new_used_count := coalesce(v.used_count, 0) + 1;
  new_status := CASE WHEN v.usage_limit > 0 AND new_used_count >= v.usage_limit THEN 'exhausted' ELSE 'active' END;

  UPDATE public.vouchers
     SET used_count = new_used_count,
         status = new_status,
         is_used = CASE WHEN v.voucher_type = 'private' THEN true ELSE v.is_used END
   WHERE id = v.id;

  UPDATE public.repair_orders
     SET discount_amount = new_discount
   WHERE tracking_id = p_tracking_id;

  RETURN jsonb_build_object('tracking_id', p_tracking_id, 'discount_amount', discount_value);
END;
$$;

-- 6) Public voucher removal RPC
CREATE OR REPLACE FUNCTION public.remove_voucher_public(p_tracking_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r RECORD; v RECORD; new_count int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.voucher_redemptions WHERE order_tracking_id = p_tracking_id) THEN
    RAISE EXCEPTION 'No voucher applied on this order.';
  END IF;

  UPDATE public.repair_orders SET discount_amount = 0 WHERE tracking_id = p_tracking_id;

  FOR r IN SELECT id, voucher_id FROM public.voucher_redemptions WHERE order_tracking_id = p_tracking_id LOOP
    SELECT used_count, voucher_type INTO v FROM public.vouchers WHERE id = r.voucher_id;
    IF FOUND THEN
      new_count := greatest(0, coalesce(v.used_count,1) - 1);
      UPDATE public.vouchers SET used_count = new_count, status = 'active', is_used = false WHERE id = r.voucher_id;
    END IF;
    DELETE FROM public.voucher_redemptions WHERE id = r.id;
  END LOOP;
END;
$$;

-- 7) Restrict execute to anon+authenticated explicitly (default is fine but make intent clear)
GRANT EXECUTE ON FUNCTION public.get_repair_by_tracking(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_booking_by_id(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_voucher_public(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remove_voucher_public(text) TO anon, authenticated;
