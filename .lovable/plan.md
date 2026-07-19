## Fix: Public requirement submission blocked by RLS grants

The homepage requirement form posts as the `anon` role, but `customer_requirements` currently has no table-level `INSERT`/`SELECT` grant for `anon` (today's revert stripped it), so PostgREST returns `42501 permission denied`.

### Migration
- `GRANT INSERT ON public.customer_requirements TO anon;` (needed for the form submit)
- `GRANT SELECT ON public.customer_requirements TO anon;` (needed to return the inserted row via `.select()` and to look up by `requirement_id` in the customer picker)
- `GRANT USAGE, SELECT ON SEQUENCE public.customer_requirement_seq TO anon;` (needed by the `set_requirement_id` trigger / `generate_requirement_id`)
- `GRANT EXECUTE ON FUNCTION public.generate_requirement_id(), public.set_requirement_id() TO anon;`
- Keep existing admin-only `UPDATE`/`DELETE` policies intact (RLS still restricts row visibility/mutation as before).

No code or data changes; existing records untouched.