CREATE OR REPLACE FUNCTION public.submit_requirement_public(p_customer_name text, p_customer_phone text, p_items jsonb, p_notes text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_row public.customer_requirements;
BEGIN
  IF p_customer_name IS NULL OR btrim(p_customer_name) = '' THEN
    RAISE EXCEPTION 'Name is required';
  END IF;
  IF p_customer_phone IS NULL OR btrim(p_customer_phone) = '' THEN
    RAISE EXCEPTION 'Phone is required';
  END IF;

  INSERT INTO public.customer_requirements (customer_name, customer_phone, items, notes)
  VALUES (
    btrim(p_customer_name),
    btrim(p_customer_phone),
    COALESCE(p_items, '[]'::jsonb),
    NULLIF(btrim(COALESCE(p_notes,'')), '')
  )
  RETURNING * INTO new_row;

  RETURN jsonb_build_object(
    'id', new_row.id,
    'requirement_id', new_row.requirement_id,
    'customer_name', new_row.customer_name,
    'customer_phone', new_row.customer_phone,
    'items', new_row.items,
    'notes', new_row.notes,
    'status', new_row.status,
    'admin_notes', new_row.admin_notes,
    'created_at', new_row.created_at,
    'updated_at', new_row.updated_at
  );
END;
$function$;