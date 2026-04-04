
-- Make tracking_id nullable for standalone vouchers
ALTER TABLE public.vouchers ALTER COLUMN tracking_id DROP NOT NULL;

-- Add new columns
ALTER TABLE public.vouchers 
  ADD COLUMN discount_type text NOT NULL DEFAULT 'amount',
  ADD COLUMN discount_percentage numeric NOT NULL DEFAULT 0,
  ADD COLUMN min_order_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN max_order_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN voucher_name text NOT NULL DEFAULT '';
