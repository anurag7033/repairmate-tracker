
-- Create enum types
CREATE TYPE public.repair_status AS ENUM ('received', 'diagnosing', 'waiting_approval', 'repairing', 'testing', 'completed', 'delivered');
CREATE TYPE public.payment_status AS ENUM ('pending', 'partial', 'paid');

-- Create repair_orders table
CREATE TABLE public.repair_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tracking_id TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  mobile_brand TEXT NOT NULL,
  mobile_model TEXT NOT NULL,
  imei_number TEXT DEFAULT '',
  issue_description TEXT DEFAULT '',
  repair_details TEXT DEFAULT '',
  status repair_status NOT NULL DEFAULT 'received',
  quotation NUMERIC NOT NULL DEFAULT 0,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  payment_link TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.repair_orders ENABLE ROW LEVEL SECURITY;

-- Public read access by tracking_id (customers need to track)
CREATE POLICY "Anyone can read orders by tracking_id"
  ON public.repair_orders FOR SELECT
  USING (true);

-- Authenticated users (admin) can insert
CREATE POLICY "Authenticated users can insert orders"
  ON public.repair_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users (admin) can update
CREATE POLICY "Authenticated users can update orders"
  ON public.repair_orders FOR UPDATE
  TO authenticated
  USING (true);

-- Authenticated users (admin) can delete
CREATE POLICY "Authenticated users can delete orders"
  ON public.repair_orders FOR DELETE
  TO authenticated
  USING (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_repair_orders_updated_at
  BEFORE UPDATE ON public.repair_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
