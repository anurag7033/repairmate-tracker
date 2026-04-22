-- Link bookings to repair_orders via tracking_id
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS tracking_id text;
CREATE INDEX IF NOT EXISTS idx_bookings_tracking_id ON public.bookings(tracking_id);

-- Trigger function: sync booking status when its linked repair_order status changes
CREATE OR REPLACE FUNCTION public.sync_booking_from_repair_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_booking_status public.booking_status;
BEGIN
  IF NEW.status = 'delivered' THEN
    new_booking_status := 'completed';
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
$$;

DROP TRIGGER IF EXISTS trg_sync_booking_from_repair_order ON public.repair_orders;
CREATE TRIGGER trg_sync_booking_from_repair_order
AFTER INSERT OR UPDATE OF status ON public.repair_orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_booking_from_repair_order();