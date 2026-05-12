CREATE OR REPLACE FUNCTION public.mark_received_public(p_tracking_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  o RECORD;
BEGIN
  SELECT id, status INTO o FROM public.repair_orders WHERE tracking_id ILIKE p_tracking_id LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  IF o.status = 'delivered' THEN
    RETURN jsonb_build_object('ok', true, 'already', true);
  END IF;
  IF o.status <> 'completed' THEN
    RAISE EXCEPTION 'Repair is not yet completed. Cannot mark as received.';
  END IF;
  UPDATE public.repair_orders SET status = 'delivered', updated_at = now() WHERE id = o.id;
  RETURN jsonb_build_object('ok', true);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.mark_received_public(text) TO anon, authenticated;