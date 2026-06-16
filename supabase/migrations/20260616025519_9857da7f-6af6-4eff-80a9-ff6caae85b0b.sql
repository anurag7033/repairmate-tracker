
CREATE TABLE public.sales_invoice_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.sales_invoices(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  previous_balance NUMERIC(12,2) NOT NULL,
  new_balance NUMERIC(12,2) NOT NULL,
  payment_method TEXT,
  updated_by TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_invoice_payments_invoice ON public.sales_invoice_payments(invoice_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_invoice_payments TO authenticated;
GRANT SELECT ON public.sales_invoice_payments TO anon;
GRANT ALL ON public.sales_invoice_payments TO service_role;

ALTER TABLE public.sales_invoice_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage sales invoice payments"
  ON public.sales_invoice_payments FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Anon can read sales invoice payments"
  ON public.sales_invoice_payments FOR SELECT
  TO anon USING (true);
