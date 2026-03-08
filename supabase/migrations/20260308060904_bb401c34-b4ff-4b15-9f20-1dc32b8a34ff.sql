
-- Drop all existing restrictive policies
DROP POLICY IF EXISTS "Anyone can read orders by tracking_id" ON public.repair_orders;
DROP POLICY IF EXISTS "Authenticated users can delete orders" ON public.repair_orders;
DROP POLICY IF EXISTS "Authenticated users can insert orders" ON public.repair_orders;
DROP POLICY IF EXISTS "Authenticated users can update orders" ON public.repair_orders;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Anyone can read orders"
  ON public.repair_orders FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert orders"
  ON public.repair_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update orders"
  ON public.repair_orders FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete orders"
  ON public.repair_orders FOR DELETE
  TO authenticated
  USING (true);
