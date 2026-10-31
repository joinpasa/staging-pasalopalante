-- "People reached" now counts connections the same way for both people,
-- and only counts what happened after you connected.
--
-- A connection is either an attributed signup (C joined with B's code —
-- dated when C's account was created) or a Pass QR scan between two
-- members (pass_handoffs — dated when the scan happened). Either way it
-- links both people equally: whoever scanned whose QR, and inviter or
-- invitee, doesn't matter. Repeat scans of the same pair add nothing; a
-- pair's connection is dated by their first link.
--
-- Someone counts as reached when there's a path to them where every step
-- happened after the step before it. Example:
--   January: B and C connect.   March: A and B connect.   May: C and D connect.
-- A reaches B (March). A does not reach C — that step (January) is older
-- than A–B — and therefore not D either, since A's only route to D runs
-- through C. B reaches A, C and D. Anyone who connects with A or B after
-- March counts for both of them, and so does whoever those people connect
-- with afterwards, at every depth.
--
-- Each person is counted once. Their level is the fewest steps over any
-- valid path: 1 = direct connection, 2 = 1st ripple, 3 = 2nd ripple, …
-- So if A later scans C directly, C becomes a direct connection for A.
--
-- Nothing is stored — the numbers are worked out on every call, so they
-- always match the current connections (a deleted account's links
-- disappear with it).
--
-- direct_joins / ripple_counts are unchanged: the Pass screen's "joined
-- with your code" breakdown, from attributed signups only.
-- direct_connections / connection_ripples are the new breakdown of
-- people_reached by level, for the People reached window and My Network.

-- Every connection between two members, once per pair, listed in both
-- directions (so "who is X connected to" is a single lookup on user_id).
-- Internal: lists everyone's connections, so it's not readable by clients.
CREATE OR REPLACE VIEW public.member_connections AS
WITH links AS (
  SELECT p.referred_by AS a, p.user_id AS b, p.created_at AS connected_at, 'signup'::text AS via
    FROM public.profiles p
    JOIN public.profiles inviter ON inviter.user_id = p.referred_by
   WHERE p.referred_by <> p.user_id
  UNION ALL
  SELECT h.from_user_id, h.to_user_id, h.created_at, 'scan'::text
    FROM public.pass_handoffs h
   WHERE h.from_user_id <> h.to_user_id
),
pairs AS (
  SELECT DISTINCT ON (least(l.a, l.b), greatest(l.a, l.b))
         least(l.a, l.b) AS lo, greatest(l.a, l.b) AS hi, l.connected_at, l.via
    FROM links l
   ORDER BY least(l.a, l.b), greatest(l.a, l.b), l.connected_at, l.via
)
SELECT pr.lo AS user_id, pr.hi AS other_id, pr.connected_at, pr.via FROM pairs pr
UNION ALL
SELECT pr.hi, pr.lo, pr.connected_at, pr.via FROM pairs pr;

REVOKE ALL ON public.member_connections FROM PUBLIC;
REVOKE ALL ON public.member_connections FROM anon, authenticated;
GRANT SELECT ON public.member_connections TO service_role;

-- The return columns change, which CREATE OR REPLACE can't do in place.
DROP FUNCTION IF EXISTS public.my_reach_stats();
DROP FUNCTION IF EXISTS public.reach_stats_for(uuid);

CREATE FUNCTION public.reach_stats_for(_user_id uuid)
RETURNS TABLE(
  people_reached bigint,
  direct_joins bigint,
  ripple_counts bigint[],
  direct_connections bigint,
  connection_ripples bigint[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  -- Everyone reached so far, side by side: who, the earliest date they
  -- can be reached by, and the fewest steps it takes.
  ids uuid[];
  arrivals timestamptz[];
  levels int[];
  step int := 1;
  grew boolean;
  max_level int;
BEGIN
  IF _user_id IS NULL THEN
    RETURN;
  END IF;

  -- Step 1: direct connections, reached on the day you connected.
  SELECT array_agg(c.other_id), array_agg(c.connected_at), array_agg(1)
    INTO ids, arrivals, levels
    FROM public.member_connections c
   WHERE c.user_id = _user_id;

  -- Each further step follows connections made after the person was
  -- reached. Keeping only the earliest date per person is enough: an
  -- earlier date can only open up more onward steps, never fewer. Stops
  -- once a step neither finds anyone new nor an earlier date for someone
  -- known; dates only move forward along a path, so this always ends.
  WHILE ids IS NOT NULL LOOP
    step := step + 1;
    WITH known AS (
      SELECT k.uid, k.arrived_at, k.lvl FROM unnest(ids, arrivals, levels) AS k(uid, arrived_at, lvl)
    ),
    found AS (
      SELECT c.other_id AS uid, min(c.connected_at) AS arrived_at
        FROM known k
        JOIN public.member_connections c ON c.user_id = k.uid AND c.connected_at > k.arrived_at
       WHERE c.other_id <> _user_id
       GROUP BY c.other_id
    ),
    merged AS (
      SELECT coalesce(k.uid, f.uid) AS uid,
             least(k.arrived_at, f.arrived_at) AS arrived_at,
             coalesce(k.lvl, step) AS lvl,
             (k.uid IS NULL OR f.arrived_at < k.arrived_at) AS improved
        FROM known k
        FULL JOIN found f ON f.uid = k.uid
    )
    SELECT array_agg(m.uid), array_agg(m.arrived_at), array_agg(m.lvl), coalesce(bool_or(m.improved), false)
      INTO ids, arrivals, levels, grew
      FROM merged m;
    EXIT WHEN NOT grew;
  END LOOP;

  SELECT max(l) INTO max_level FROM unnest(levels) AS l;

  RETURN QUERY
  WITH RECURSIVE chain AS (
    SELECT p.user_id, 1 AS depth, ARRAY[_user_id, p.user_id] AS path
      FROM public.profiles p
     WHERE p.referred_by = _user_id
       AND p.user_id <> _user_id
    UNION ALL
    SELECT p.user_id, c.depth + 1, c.path || p.user_id
      FROM chain c
      JOIN public.profiles p ON p.referred_by = c.user_id
     WHERE NOT (p.user_id = ANY (c.path))
  ),
  members AS (
    SELECT c.user_id, min(c.depth) AS depth FROM chain c GROUP BY c.user_id
  ),
  generations AS (
    SELECT m.depth, count(*) AS people FROM members m GROUP BY m.depth
  ),
  reached AS (
    SELECT r.lvl, count(*) AS people FROM unnest(levels) AS r(lvl) GROUP BY r.lvl
  )
  SELECT
    coalesce(cardinality(ids), 0)::bigint,
    coalesce((SELECT g.people FROM generations g WHERE g.depth = 1), 0)::bigint,
    coalesce(
      (SELECT array_agg(coalesce(g.people, 0) ORDER BY d.depth)
         FROM generate_series(2, (SELECT max(m.depth) FROM members m)) AS d(depth)
         LEFT JOIN generations g ON g.depth = d.depth),
      '{}'::bigint[]
    ),
    coalesce((SELECT r.people FROM reached r WHERE r.lvl = 1), 0)::bigint,
    coalesce(
      (SELECT array_agg(coalesce(r.people, 0) ORDER BY d.lvl)
         FROM generate_series(2, max_level) AS d(lvl)
         LEFT JOIN reached r ON r.lvl = d.lvl),
      '{}'::bigint[]
    );
END;
$$;

-- Internal: works for any user id, so it's not callable by clients.
REVOKE ALL ON FUNCTION public.reach_stats_for(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reach_stats_for(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reach_stats_for(uuid) TO service_role;

-- The signed-in user's own numbers.
CREATE FUNCTION public.my_reach_stats()
RETURNS TABLE(
  people_reached bigint,
  direct_joins bigint,
  ripple_counts bigint[],
  direct_connections bigint,
  connection_ripples bigint[]
)
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
