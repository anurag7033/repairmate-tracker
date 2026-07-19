-- Restore required schema access for the app roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Admin/back-office access for all current application tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.bookings,
  public.customer_order_items,
  public.customer_orders,
  public.customer_requirements,
  public.customers,
  public.products,
  public.repair_orders,
  public.sales_invoice_items,
  public.sales_invoice_payments,
  public.sales_invoice_return_items,
  public.sales_invoice_returns,
  public.sales_invoices,
  public.voucher_redemptions,
  public.vouchers
TO authenticated;

-- Service role access for edge functions and trusted backend workflows
GRANT ALL ON TABLE
  public.bookings,
  public.customer_order_items,
  public.customer_orders,
  public.customer_requirements,
  public.customers,
  public.products,
  public.repair_orders,
  public.sales_invoice_items,
  public.sales_invoice_payments,
  public.sales_invoice_return_items,
  public.sales_invoice_returns,
  public.sales_invoices,
  public.voucher_redemptions,
  public.vouchers
TO service_role;

-- Public customer-facing access only where existing RLS policies allow it
GRANT SELECT ON TABLE public.products TO anon;
GRANT INSERT ON TABLE public.bookings TO anon;
GRANT INSERT ON TABLE public.customer_requirements TO anon;
GRANT INSERT ON TABLE public.customer_orders TO anon;
GRANT INSERT ON TABLE public.customer_order_items TO anon;

-- Sequence access needed for generated IDs and inserts
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE
  public.customer_order_seq,
  public.customer_requirement_seq
TO anon;

-- Public/customer tracking and order helper functions
GRANT EXECUTE ON FUNCTION public.get_repair_by_tracking(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_received_public(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_booking_by_id(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_customer_order_public(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_voucher_public(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.remove_voucher_public(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_voucher_to_customer_order(text, numeric, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_requirement_by_code(text) TO anon, authenticated, service_role;

-- ID generators and trigger/helper functions required by inserts and admin workflows
GRANT EXECUTE ON FUNCTION public.generate_customer_order_id() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_requirement_id() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_requirement_id() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_sales_invoice_number() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_customers_with_stats() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.normalize_phone(text) TO anon, authenticated, service_role;

-- Backend trigger/helper functions used by existing workflows
GRANT EXECUTE ON FUNCTION public.update_repair_orders_updated_at() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.compute_product_final_price() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decrement_product_stock() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decrement_stock_on_order_item() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_return_item() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_return_to_invoice() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.link_repair_to_customer() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_booking_from_repair_order() TO authenticated, service_role;