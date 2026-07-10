-- Fix grants
GRANT INSERT ON public.customer_requirements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_requirements TO authenticated;
GRANT ALL ON public.customer_requirements TO service_role;

-- Add requirement_id
CREATE SEQUENCE IF NOT EXISTS public.customer_requirement_seq START 1;
GRANT USAGE ON SEQUENCE public.customer_requirement_seq TO anon, authenticated, service_role;

ALTER TABLE public.customer_requirements ADD COLUMN IF NOT EXISTS requirement_id text UNIQUE;

CREATE OR REPLACE FUNCTION public.generate_requirement_id()
RETURNS text LANGUAGE plpgsql SET search_path = public AS $$
DECLARE yr text := to_char(now(), 'YYYY'); nxt bigint;
BEGIN
  nxt := nextval('public.customer_requirement_seq');
  RETURN 'REQ-' || yr || '-' || lpad(nxt::text, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.set_requirement_id()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.requirement_id IS NULL THEN
    NEW.requirement_id := public.generate_requirement_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_requirement_id ON public.customer_requirements;
CREATE TRIGGER trg_set_requirement_id BEFORE INSERT ON public.customer_requirements
FOR EACH ROW EXECUTE FUNCTION public.set_requirement_id();

-- Backfill existing rows
UPDATE public.customer_requirements
SET requirement_id = public.generate_requirement_id()
WHERE requirement_id IS NULL;