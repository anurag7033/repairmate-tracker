DO $$
DECLARE
    tbl record;
    has_priv boolean;
BEGIN
    FOR tbl IN
        SELECT c.relname AS table_name
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE c.relkind = 'r' AND n.nspname = 'public'
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.role_table_grants
             WHERE grantee = 'authenticated' AND table_schema = 'public' AND table_name = tbl.table_name
               AND privilege_type IN ('SELECT','INSERT','UPDATE','DELETE')
        ) INTO has_priv;
        IF NOT has_priv THEN
            EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl.table_name);
        END IF;

        SELECT EXISTS (
            SELECT 1 FROM information_schema.role_table_grants
             WHERE grantee = 'service_role' AND table_schema = 'public' AND table_name = tbl.table_name
               AND privilege_type IN ('SELECT','INSERT','UPDATE','DELETE')
        ) INTO has_priv;
        IF NOT has_priv THEN
            EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl.table_name);
        END IF;
    END LOOP;
END;
$$;

-- Public-facing tables that need anon read/insert for customer flows
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT ON public.customer_orders TO anon;
GRANT SELECT, INSERT ON public.customer_order_items TO anon;
GRANT SELECT, INSERT ON public.customer_requirements TO anon;
GRANT SELECT, INSERT ON public.bookings TO anon;

-- Sequence usage for anon-inserted rows
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Ensure public RPCs are executable
GRANT EXECUTE ON FUNCTION public.get_repair_by_tracking(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_received_public(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_order_public(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_booking_by_id(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_requirement_by_code(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_voucher_public(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remove_voucher_public(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_voucher_to_customer_order(text, numeric, text) TO anon, authenticated;