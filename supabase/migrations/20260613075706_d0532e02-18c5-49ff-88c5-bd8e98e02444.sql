
ALTER TABLE public.repair_orders
  ADD COLUMN IF NOT EXISTS admin_discount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pending_payment_received numeric NOT NULL DEFAULT 0;

-- Update the public RPC used by tracking + invoice to surface new fields
DROP FUNCTION IF EXISTS public.get_repair_by_tracking(text);
CREATE OR REPLACE FUNCTION public.get_repair_by_tracking(p_tracking_id text)
 RETURNS TABLE(id uuid, tracking_id text, customer_name text, mobile_brand text, mobile_model text, issue_description text, repair_details text, status repair_status, quotation numeric, advance_paid numeric, discount_amount numeric, admin_discount numeric, pending_payment_received numeric, payment_status payment_status, payment_link text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id, tracking_id,
         regexp_replace(customer_name, '(\S+)(\s+\S+)?', '\1') AS customer_name,
         mobile_brand, mobile_model, issue_description, repair_details,
         status, quotation, advance_paid, discount_amount, admin_discount, pending_payment_received,
         payment_status, payment_link, created_at, updated_at
  FROM public.repair_orders
  WHERE tracking_id ILIKE p_tracking_id
  LIMIT 1;
$function$;
