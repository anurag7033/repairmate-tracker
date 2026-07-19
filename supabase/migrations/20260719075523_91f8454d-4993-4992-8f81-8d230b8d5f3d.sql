GRANT INSERT, SELECT ON public.customer_requirements TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.customer_requirement_seq TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_requirement_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_requirement_id() TO anon, authenticated;