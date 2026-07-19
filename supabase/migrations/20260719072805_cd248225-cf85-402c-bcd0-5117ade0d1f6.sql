GRANT EXECUTE ON FUNCTION public.generate_customer_order_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_requirement_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_sales_invoice_number() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_requirement_id() TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;