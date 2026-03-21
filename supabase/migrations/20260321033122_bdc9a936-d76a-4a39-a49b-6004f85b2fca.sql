
CREATE OR REPLACE FUNCTION public.update_repair_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_update_repair_orders_updated_at
BEFORE UPDATE ON public.repair_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_repair_orders_updated_at();
