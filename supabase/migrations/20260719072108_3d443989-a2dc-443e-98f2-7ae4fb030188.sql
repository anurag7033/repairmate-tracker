
-- PostgREST needs table-level SELECT for INSERT ... RETURNING to succeed.
-- RLS still prevents anon from reading any rows (no SELECT policy for anon).
GRANT SELECT ON public.customer_requirements TO anon;
GRANT SELECT ON public.customer_orders TO anon;
GRANT SELECT ON public.customer_order_items TO anon;
