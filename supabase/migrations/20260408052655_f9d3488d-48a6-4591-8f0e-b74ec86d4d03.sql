
-- Add new columns to vouchers table
ALTER TABLE public.vouchers 
ADD COLUMN IF NOT EXISTS voucher_type text NOT NULL DEFAULT 'private',
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS expiry_date date DEFAULT NULL,
ADD COLUMN IF NOT EXISTS usage_limit integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS used_count integer NOT NULL DEFAULT 0;

-- Update existing vouchers: mark is_used ones as 'used' status
UPDATE public.vouchers SET status = 'exhausted' WHERE is_used = true;

-- Create voucher_redemptions table
CREATE TABLE public.voucher_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id uuid NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
  order_tracking_id text NOT NULL,
  customer_name text NOT NULL DEFAULT '',
  customer_phone text NOT NULL DEFAULT '',
  amount_before numeric NOT NULL DEFAULT 0,
  discount_applied numeric NOT NULL DEFAULT 0,
  final_amount numeric NOT NULL DEFAULT 0,
  redeemed_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voucher_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for voucher_redemptions
CREATE POLICY "Anyone can read redemptions"
ON public.voucher_redemptions FOR SELECT TO public
USING (true);

CREATE POLICY "Authenticated users can insert redemptions"
ON public.voucher_redemptions FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete redemptions"
ON public.voucher_redemptions FOR DELETE TO authenticated
USING (true);
