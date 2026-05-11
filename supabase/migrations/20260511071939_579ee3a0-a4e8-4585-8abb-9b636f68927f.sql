
-- Customers table
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  phone text NOT NULL,
  phone_normalized text NOT NULL,
  email text DEFAULT '',
  address text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX customers_phone_normalized_uq ON public.customers (phone_normalized);
CREATE INDEX customers_name_idx ON public.customers (lower(name));

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read customers" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update customers" ON public.customers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete customers" ON public.customers FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper to normalize phones to last 10 digits
CREATE OR REPLACE FUNCTION public.normalize_phone(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT right(regexp_replace(coalesce(p,''), '\D', '', 'g'), 10);
$$;

-- Add customer_id to repair_orders
ALTER TABLE public.repair_orders
  ADD COLUMN customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;

CREATE INDEX repair_orders_customer_id_idx ON public.repair_orders (customer_id);

-- Backfill customers from existing repair_orders
INSERT INTO public.customers (name, phone, phone_normalized)
SELECT DISTINCT ON (public.normalize_phone(customer_phone))
       customer_name, customer_phone, public.normalize_phone(customer_phone)
FROM public.repair_orders
WHERE coalesce(customer_phone,'') <> ''
  AND public.normalize_phone(customer_phone) <> ''
ORDER BY public.normalize_phone(customer_phone), created_at DESC;

-- Backfill from bookings (only those that don't already exist)
INSERT INTO public.customers (name, phone, phone_normalized, email, address)
SELECT DISTINCT ON (public.normalize_phone(b.customer_phone))
       b.customer_name, b.customer_phone, public.normalize_phone(b.customer_phone),
       coalesce(b.customer_email,''), coalesce(b.full_address,'')
FROM public.bookings b
WHERE coalesce(b.customer_phone,'') <> ''
  AND public.normalize_phone(b.customer_phone) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.phone_normalized = public.normalize_phone(b.customer_phone)
  )
ORDER BY public.normalize_phone(b.customer_phone), b.created_at DESC;

-- Link repair_orders.customer_id
UPDATE public.repair_orders r
SET customer_id = c.id
FROM public.customers c
WHERE r.customer_id IS NULL
  AND c.phone_normalized = public.normalize_phone(r.customer_phone);

-- Trigger: auto-create / link customer on repair_orders insert/update
CREATE OR REPLACE FUNCTION public.link_repair_to_customer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  norm text;
  cust_id uuid;
BEGIN
  norm := public.normalize_phone(NEW.customer_phone);
  IF norm = '' OR norm IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.customer_id IS NULL THEN
    SELECT id INTO cust_id FROM public.customers WHERE phone_normalized = norm LIMIT 1;
    IF cust_id IS NULL THEN
      INSERT INTO public.customers (name, phone, phone_normalized)
      VALUES (NEW.customer_name, NEW.customer_phone, norm)
      ON CONFLICT (phone_normalized) DO UPDATE SET phone = EXCLUDED.phone
      RETURNING id INTO cust_id;
    END IF;
    NEW.customer_id := cust_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_repair_orders_link_customer
  BEFORE INSERT OR UPDATE OF customer_phone, customer_id ON public.repair_orders
  FOR EACH ROW EXECUTE FUNCTION public.link_repair_to_customer();

-- Stats RPC
CREATE OR REPLACE FUNCTION public.get_customers_with_stats()
RETURNS TABLE (
  id uuid,
  name text,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz,
  updated_at timestamptz,
  total_repairs bigint,
  pending_repairs bigint,
  last_visit timestamptz,
  total_spent numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    c.id, c.name, c.phone, c.email, c.address, c.notes, c.created_at, c.updated_at,
    coalesce(s.total_repairs, 0) AS total_repairs,
    coalesce(s.pending_repairs, 0) AS pending_repairs,
    s.last_visit,
    coalesce(s.total_spent, 0) AS total_spent
  FROM public.customers c
  LEFT JOIN (
    SELECT
      customer_id,
      count(*) AS total_repairs,
      count(*) FILTER (WHERE status NOT IN ('delivered','returned')) AS pending_repairs,
      max(created_at) AS last_visit,
      sum(GREATEST(quotation - coalesce(discount_amount,0), 0)) FILTER (WHERE payment_status = 'paid') AS total_spent
    FROM public.repair_orders
    WHERE customer_id IS NOT NULL
    GROUP BY customer_id
  ) s ON s.customer_id = c.id;
$$;
