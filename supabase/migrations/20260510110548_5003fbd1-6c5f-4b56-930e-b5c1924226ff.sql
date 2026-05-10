-- Add 'returned' to the repair_status enum
ALTER TYPE public.repair_status ADD VALUE IF NOT EXISTS 'returned';

-- Update sync function to handle returned + delivered properly
CREATE OR REPLACE FUNCTION public.sync_booking_from_repair_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_booking_status public.booking_status;
BEGIN
  IF NEW.status = 'delivered' THEN
    new_booking_status := 'completed';
  ELSIF NEW.status = 'returned' THEN
    new_booking_status := 'cancelled';
  ELSIF NEW.status IN ('received', 'diagnosing', 'waiting_for_parts', 'repairing', 'testing', 'completed') THEN
    new_booking_status := 'in_progress';
  ELSE
    RETURN NEW;
  END IF;

  UPDATE public.bookings
     SET status = new_booking_status,
         updated_at = now()
   WHERE tracking_id = NEW.tracking_id
     AND status <> new_booking_status;

  RETURN NEW;
END;
$function$;