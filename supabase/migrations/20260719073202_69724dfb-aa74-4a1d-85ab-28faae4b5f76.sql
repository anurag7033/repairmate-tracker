-- Revert anon grants added today
REVOKE SELECT ON public.products FROM anon;
REVOKE SELECT, INSERT ON public.customer_orders FROM anon;
REVOKE SELECT, INSERT ON public.customer_order_items FROM anon;
REVOKE SELECT, INSERT ON public.customer_requirements FROM anon;
REVOKE SELECT, INSERT ON public.bookings FROM anon;

-- Revert sequence grants added today
REVOKE USAGE ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM service_role;

-- Revert execute grants on RPCs added today
REVOKE EXECUTE ON FUNCTION public.get_repair_by_tracking(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_received_public(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_customer_order_public(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_booking_by_id(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_requirement_by_code(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_voucher_public(text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.remove_voucher_public(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_voucher_to_customer_order(text, numeric, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_customer_order_id() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_requirement_id() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_sales_invoice_number() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_requirement_id() FROM anon, authenticated;