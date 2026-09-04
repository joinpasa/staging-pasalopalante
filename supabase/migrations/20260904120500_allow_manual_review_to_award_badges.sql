-- award_badges_for_user() refuses to run unless the caller is the target
-- user or the service role — a guard against one authenticated user
-- triggering a recompute for someone else. But it also fires from
-- award_badges_after_act_change(), a trigger on acts_of_kindness that runs
-- for ANY status update, including a held act getting manually approved
-- from 'pending' to 'published' in the Supabase SQL editor (which runs as
-- the postgres role, outside PostgREST, so auth.role()/auth.uid() are both
-- null). That combination made the guard block itself: manually approving
-- a held act silently never awarded its streak/first_act badges.
--
-- Fix: only block when the call came through PostgREST as anon/authenticated
-- (auth.role() actually set) and isn't the target user. A null auth.role()
-- means a direct/superuser DB session (SQL editor, migrations) — trusted by
-- definition, since only project owners can reach it.
CREATE OR REPLACE FUNCTION public.award_badges_for_user(_user_id uuid)
 RETURNS TABLE(earned_badge_id text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total_published bigint := 0;
  current_days int := 0;
BEGIN
  IF _user_id IS NULL THEN
    RETURN;
  END IF;

  IF auth.role() IS NOT NULL
     AND auth.role() <> 'service_role'
     AND (auth.uid() IS NULL OR auth.uid() <> _user_id) THEN
    RETURN;
  END IF;

  SELECT count(*) INTO total_published
  FROM public.acts_of_kindness
  WHERE user_id = _user_id AND status = 'published';

  SELECT coalesce(us.current_streak, 0) INTO current_days
  FROM public.user_streak(_user_id) us
  LIMIT 1;

  RETURN QUERY
  WITH eligible(id) AS (
    SELECT 'first_act'::text WHERE total_published >= 1
    UNION ALL SELECT 'streak_3'::text WHERE current_days >= 3
    UNION ALL SELECT 'streak_7'::text WHERE current_days >= 7
    UNION ALL SELECT 'streak_30'::text WHERE current_days >= 30
    UNION ALL
      SELECT p.badge_id FROM public.act_badge_progress(_user_id) p
       WHERE p.current_count >= p.target
  ), inserted AS (
    INSERT INTO public.user_badges (user_id, badge_id)
    SELECT _user_id, e.id
    FROM eligible e
    JOIN public.badges b ON b.id = e.id
    ON CONFLICT (user_id, badge_id) DO NOTHING
    RETURNING public.user_badges.badge_id AS new_badge_id
  )
  SELECT inserted.new_badge_id FROM inserted;
END;
$function$;

-- Backfill: recompute badges for every user with at least one published act,
-- so anyone whose held act was already manually approved (or whose tags
-- landed after their act was approved) gets caught up now.
SELECT public.award_badges_for_user(user_id)
FROM (
  SELECT DISTINCT user_id
  FROM public.acts_of_kindness
  WHERE user_id IS NOT NULL
    AND status = 'published'
) existing_users;
