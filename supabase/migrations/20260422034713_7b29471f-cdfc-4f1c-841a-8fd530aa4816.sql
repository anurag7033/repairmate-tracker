
-- Enums
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.booking_payment_method AS ENUM ('online', 'cash');
CREATE TYPE public.booking_payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE public.device_type AS ENUM ('mobile', 'laptop', 'tablet', 'other');
CREATE TYPE public.service_type AS ENUM ('pickup_drop', 'doorstep', 'visit_shop');

-- Bookings table
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id TEXT NOT NULL UNIQUE,

  -- Customer
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  alternate_phone TEXT DEFAULT '',
  customer_email TEXT DEFAULT '',

  -- Address
  full_address TEXT NOT NULL,
  city TEXT NOT NULL,
  pincode TEXT NOT NULL,

  -- Device
  device_type public.device_type NOT NULL DEFAULT 'mobile',
  device_brand TEXT NOT NULL,
  device_model TEXT NOT NULL,
  imei_serial TEXT DEFAULT '',

  -- Issue
  issue_type TEXT NOT NULL,
  issue_description TEXT NOT NULL,
  image_urls TEXT[] NOT NULL DEFAULT '{}',

  -- Service
  service_type public.service_type NOT NULL DEFAULT 'visit_shop',
  preferred_date DATE,
  preferred_time_slot TEXT DEFAULT '',

  -- Payment
  payment_method public.booking_payment_method NOT NULL DEFAULT 'cash',
  payment_status public.booking_payment_status NOT NULL DEFAULT 'pending',
  razorpay_payment_id TEXT DEFAULT '',
  amount_paid NUMERIC NOT NULL DEFAULT 0,

  -- Workflow
  status public.booking_status NOT NULL DEFAULT 'pending',
  assigned_technician TEXT DEFAULT '',
  internal_notes TEXT DEFAULT '',

  terms_accepted BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_bookings_booking_id ON public.bookings(booking_id);
CREATE INDEX idx_bookings_phone ON public.bookings(customer_phone);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_bookings_created_at ON public.bookings(created_at DESC);

-- Updated_at trigger
CREATE TRIGGER update_bookings_updated_at
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read bookings"
  ON public.bookings FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update bookings"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete bookings"
  ON public.bookings FOR DELETE
  TO authenticated
  USING (true);

-- Storage bucket for booking images
INSERT INTO storage.buckets (id, name, public)
VALUES ('booking-images', 'booking-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Booking images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'booking-images');

CREATE POLICY "Anyone can upload booking images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'booking-images');

CREATE POLICY "Authenticated users can delete booking images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'booking-images');
