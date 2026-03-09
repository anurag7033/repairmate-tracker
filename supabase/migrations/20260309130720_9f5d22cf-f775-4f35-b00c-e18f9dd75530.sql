
-- Add discount_amount column to repair_orders
ALTER TABLE public.repair_orders ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;

-- Create vouchers table
CREATE TABLE public.vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id text NOT NULL,
  voucher_code text NOT NULL UNIQUE,
  discount_amount numeric NOT NULL DEFAULT 0,
  is_used boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

-- Public can read vouchers (to apply them)
CREATE POLICY "Anyone can read vouchers" ON public.vouchers FOR SELECT TO public USING (true);

-- Authenticated users can insert/update/delete vouchers
CREATE POLICY "Authenticated users can insert vouchers" ON public.vouchers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update vouchers" ON public.vouchers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete vouchers" ON public.vouchers FOR DELETE TO authenticated USING (true);
