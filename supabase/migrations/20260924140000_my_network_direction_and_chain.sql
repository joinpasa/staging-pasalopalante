-- Phase 7 (My Network screen): extends my_connections() with the two
-- pieces of context the redesigned screen needs per connection — which
-- direction the kindness moved (did I pass to them, or did I receive from
-- them, via pass_handoffs' from_user_id = "code owner" / to_user_id =
-- "scanner"), and their country, so the screen can group/count without a
-- second round trip. Return shape changes, so the function is dropped and
-- recreated rather than CREATE OR REPLACE'd (Postgres won't let you change
-- a function's RETURNS TABLE columns in place).
DROP FUNCTION IF EXISTS public.my_connections();

CREATE FUNCTION public.my_connections()
RETURNS TABLE(user_id uuid, name text, connected_at timestamptz, country text, direction text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.user_id,
    COALESCE(NULLIF(trim(p.first_name), ''), NULLIF(trim(p.display_name), ''), 'a fellow member'),
    agg.last_connected,
    NULLIF(trim(p.country), ''),
    CASE
      WHEN agg.passed_to AND agg.received_from THEN 'both'
      WHEN agg.passed_to THEN 'passed_to'
      ELSE 'received_from'
    END
  FROM (
    SELECT
      id,
      max(connected_at) AS last_connected,
      bool_or(is_passed_to) AS passed_to,
      bool_or(NOT is_passed_to) AS received_from
    FROM (
      SELECT to_user_id AS id, created_at AS connected_at, true AS is_passed_to
        FROM public.pass_handoffs WHERE from_user_id = auth.uid()
      UNION ALL
      SELECT from_user_id AS id, created_at AS connected_at, false AS is_passed_to
        FROM public.pass_handoffs WHERE to_user_id = auth.uid()
    ) x
    GROUP BY id
  ) agg
  JOIN public.profiles p ON p.user_id = agg.id
  ORDER BY agg.last_connected DESC;
$$;

REVOKE ALL ON FUNCTION public.my_connections() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_connections() TO authenticated;

-- The "longest chain" stat on My Network: how many hops of hand-offs the
-- calling user sits within, counting both directions (hand-offs leading
-- up to them, plus hand-offs leading onward from them) as one continuous
-- chain. Two independent simple-path traversals of the pass_handoffs
-- graph (each tracking its own visited-node array to stop at cycles —
-- two people can hand off back and forth) rather than one combined
-- traversal, since a shared node appearing on both sides is a rare edge
-- case not worth the extra complexity for what's a fun stat, not a
-- ranking. Depth-capped at 50 hops so a pathological graph can't make
-- this query run away.
CREATE FUNCTION public.my_longest_chain()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH RECURSIVE forward AS (
    SELECT h.to_user_id AS node, 1 AS hops, ARRAY[auth.uid(), h.to_user_id] AS path
      FROM public.pass_handoffs h
     WHERE h.from_user_id = auth.uid()
    UNION ALL
    SELECT h.to_user_id, f.hops + 1, f.path || h.to_user_id
      FROM forward f
      JOIN public.pass_handoffs h ON h.from_user_id = f.node
     WHERE NOT (h.to_user_id = ANY(f.path))
       AND f.hops < 50
  ),
  backward AS (
    SELECT h.from_user_id AS node, 1 AS hops, ARRAY[h.from_user_id, auth.uid()] AS path
      FROM public.pass_handoffs h
     WHERE h.to_user_id = auth.uid()
    UNION ALL
    SELECT h.from_user_id, b.hops + 1, ARRAY[h.from_user_id] || b.path
      FROM backward b
      JOIN public.pass_handoffs h ON h.to_user_id = b.node
     WHERE NOT (h.from_user_id = ANY(b.path))
       AND b.hops < 50
  )
  SELECT COALESCE((SELECT max(hops) FROM forward), 0) + COALESCE((SELECT max(hops) FROM backward), 0);
$$;

REVOKE ALL ON FUNCTION public.my_longest_chain() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_longest_chain() TO authenticated;
