-- Total in-person Pass connections for the calling user — counted
-- symmetrically (either direction in pass_handoffs), since scanning
-- someone's code or having your own code scanned both represent the same
-- real-world event: two people connected. Previously nothing surfaced
-- pass_handoffs to the app at all, so a real connection (e.g. scanning a
-- friend's code) showed up nowhere on the dashboard.
CREATE OR REPLACE FUNCTION public.my_connections_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT count(DISTINCT other_id)
  FROM (
    SELECT to_user_id AS other_id FROM public.pass_handoffs WHERE from_user_id = auth.uid()
    UNION
    SELECT from_user_id AS other_id FROM public.pass_handoffs WHERE to_user_id = auth.uid()
  ) connections;
$$;

REVOKE ALL ON FUNCTION public.my_connections_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_connections_count() TO authenticated;
