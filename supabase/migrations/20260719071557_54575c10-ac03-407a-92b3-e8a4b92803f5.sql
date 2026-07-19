
-- Lock down customer_requirements: remove public SELECT, expose safe lookup RPC
DROP POLICY IF EXISTS "Public can read requirements" ON public.customer_requirements;

CREATE POLICY "Authenticated can read requirements"
  ON public.customer_requirements
  FOR SELECT
  TO authenticated
  USING (true);

REVOKE SELECT ON public.customer_requirements FROM anon;

CREATE OR REPLACE FUNCTION public.get_requirement_by_code(p_code text)
RETURNS TABLE(
  id uuid,
  requirement_id text,
  customer_name text,
  customer_phone text,
  items jsonb,
  notes text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, requirement_id,
         regexp_replace(customer_name, '(\S+)(\s+\S+)?', '\1') AS customer_name,
         right(regexp_replace(coalesce(customer_phone,''),'\D','','g'), 10) AS customer_phone,
         to_jsonb(items) AS items,
         notes,
         status::text,
         created_at,
         updated_at
  FROM public.customer_requirements
  WHERE requirement_id ILIKE p_code
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_requirement_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_requirement_by_code(text) TO anon, authenticated;
