-- The list behind my_connections_count(): one row per distinct person the
-- calling user has connected with via Pass (either direction), with their
-- name and the most recent time they connected. SECURITY DEFINER for the
-- same reason log_pass_handoff() is - profiles is owner-only SELECT, and
-- the caller needs the other person's name, not just their id.
CREATE OR REPLACE FUNCTION public.my_connections()
RETURNS TABLE(user_id uuid, name text, connected_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.user_id,
    COALESCE(NULLIF(trim(p.first_name), ''), NULLIF(trim(p.display_name), ''), 'a fellow member'),
    agg.last_connected
  FROM (
    SELECT id, max(connected_at) AS last_connected
    FROM (
      SELECT to_user_id AS id, created_at AS connected_at
        FROM public.pass_handoffs WHERE from_user_id = auth.uid()
      UNION ALL
      SELECT from_user_id AS id, created_at AS connected_at
        FROM public.pass_handoffs WHERE to_user_id = auth.uid()
    ) x
    GROUP BY id
  ) agg
  JOIN public.profiles p ON p.user_id = agg.id
  ORDER BY agg.last_connected DESC;
$$;

REVOKE ALL ON FUNCTION public.my_connections() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_connections() TO authenticated;
