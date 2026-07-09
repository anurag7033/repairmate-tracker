CREATE TABLE public.customer_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.customer_requirements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_requirements TO authenticated;
GRANT ALL ON public.customer_requirements TO service_role;

ALTER TABLE public.customer_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a requirement"
  ON public.customer_requirements FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can view requirements"
  ON public.customer_requirements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can update requirements"
  ON public.customer_requirements FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete requirements"
  ON public.customer_requirements FOR DELETE
  TO authenticated
  USING (true);

CREATE TRIGGER update_customer_requirements_updated_at
  BEFORE UPDATE ON public.customer_requirements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_customer_requirements_status ON public.customer_requirements(status);
CREATE INDEX idx_customer_requirements_created ON public.customer_requirements(created_at DESC);