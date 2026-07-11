
-- Ensure grants for both anon (submit + read back own row) and authenticated (admin CRUD)
GRANT SELECT, INSERT ON public.customer_requirements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_requirements TO authenticated;
GRANT ALL ON public.customer_requirements TO service_role;

-- Refresh policies to match the requirement-section flow
DROP POLICY IF EXISTS "Anyone can submit a requirement" ON public.customer_requirements;
DROP POLICY IF EXISTS "Authenticated can view requirements" ON public.customer_requirements;
DROP POLICY IF EXISTS "Authenticated can update requirements" ON public.customer_requirements;
DROP POLICY IF EXISTS "Authenticated can delete requirements" ON public.customer_requirements;
DROP POLICY IF EXISTS "Public can read requirements by id" ON public.customer_requirements;

-- Anyone (public form) can submit a requirement
CREATE POLICY "Public can submit requirement"
  ON public.customer_requirements
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Public can read requirements (needed so the form's insert .select() returns the new row,
-- and so customers can look up their requirement by REQ- id)
CREATE POLICY "Public can read requirements"
  ON public.customer_requirements
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admins (authenticated) can update requirements (status, admin notes, mark fulfilled)
CREATE POLICY "Authenticated can update requirements"
  ON public.customer_requirements
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Admins (authenticated) can delete requirements
CREATE POLICY "Authenticated can delete requirements"
  ON public.customer_requirements
  FOR DELETE
  TO authenticated
  USING (true);
