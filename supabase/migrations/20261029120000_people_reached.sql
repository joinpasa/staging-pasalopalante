-- "People reached" and the direct-join / ripple breakdown.
--
-- Two different events feed these numbers, and they must not be mixed up:
--
--   * Attributed signups (profiles.referred_by): someone created an account
--     with another member's code — via a share link (?r=) or by scanning
--     their Pass QR while signed out (claim_referral). These form a tree:
--     A's direct invitees, the people they invited, and so on.
--   * Pass QR hand-offs (pass_handoffs): an already-registered member
--     scanned another member's Pass QR. from_user_id is the QR owner,
--     to_user_id the scanner.
--
-- people_reached = everyone in the user's referral tree (every depth), plus
-- every registered member who scanned the user's own QR together with that
-- member's own referral tree (every depth) — each person once. Only the QR
-- owner is credited for a scan, never the scanner; repeat scans by the same
-- person don't add anything; and anyone reachable along more than one route
-- (e.g. a scanner who's already in the user's tree, or two scanners where
-- one invited the other) is still counted a single time.
--
-- direct_joins and ripple_counts come from attributed signups only, so a
-- hand-off never changes them:
--   direct_joins     = generation 1 (joined with the user's own code)
--   ripple_counts[1] = generation 2 ("1st ripple"), [2] = generation 3, …
-- The array runs to the deepest generation; a 0 in it means that
-- generation is empty (the frontend skips those rows).
--
-- My Network (my_connections / my_connections_count) is untouched — it
-- stays the symmetric list of in-person connections in both directions.

CREATE OR REPLACE FUNCTION public.reach_stats_for(_user_id uuid)
RETURNS TABLE(people_reached bigint, direct_joins bigint, ripple_counts bigint[])
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH RECURSIVE chain AS (
    SELECT p.user_id, 1 AS depth, ARRAY[_user_id, p.user_id] AS path
      FROM public.profiles p
     WHERE p.referred_by = _user_id
       AND p.user_id <> _user_id
    UNION ALL
    -- No depth cap: each profile has a single referred_by, so this is a
    -- tree and ends at its leaves. The path check only guards against a
    -- loop (two new accounts claiming each other's codes), so a cycle can
    -- never make it run forever or count anyone twice.
    SELECT p.user_id, c.depth + 1, c.path || p.user_id
      FROM chain c
      JOIN public.profiles p ON p.referred_by = c.user_id
     WHERE NOT (p.user_id = ANY (c.path))
  ),
  members AS (
    SELECT c.user_id, min(c.depth) AS depth
      FROM chain c
     GROUP BY c.user_id
  ),
  generations AS (
    SELECT m.depth, count(*) AS people
      FROM members m
     GROUP BY m.depth
  ),
  -- Everyone reached: the user's direct invitees and every registered
  -- member who scanned their QR, then everyone those people brought in, at
  -- every depth. UNION (not UNION ALL) keeps each person once — which also
  -- ends the walk at any loop, since a revisited person adds no new row.
  reached(user_id) AS (
    SELECT p.user_id FROM public.profiles p WHERE p.referred_by = _user_id
    UNION
    SELECT h.to_user_id FROM public.pass_handoffs h WHERE h.from_user_id = _user_id
    UNION
    SELECT p.user_id
      FROM reached r
      JOIN public.profiles p ON p.referred_by = r.user_id
  )
  SELECT
    (SELECT count(*) FROM reached r WHERE r.user_id <> _user_id),
    COALESCE((SELECT g.people FROM generations g WHERE g.depth = 1), 0),
    COALESCE(
      (SELECT array_agg(COALESCE(g.people, 0) ORDER BY d.depth)
         FROM generate_series(2, (SELECT max(m.depth) FROM members m)) AS d(depth)
         LEFT JOIN generations g ON g.depth = d.depth),
      '{}'::bigint[]
    )
  WHERE _user_id IS NOT NULL;
$$;

-- Internal: works for any user id, so it's not callable by clients.
REVOKE ALL ON FUNCTION public.reach_stats_for(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reach_stats_for(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reach_stats_for(uuid) TO service_role;

-- The signed-in user's own numbers.
CREATE OR REPLACE FUNCTION public.my_reach_stats()
RETURNS TABLE(people_reached bigint, direct_joins bigint, ripple_counts bigint[])
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM public.reach_stats_for(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.my_reach_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.my_reach_stats() FROM anon;
GRANT EXECUTE ON FUNCTION public.my_reach_stats() TO authenticated, service_role;
