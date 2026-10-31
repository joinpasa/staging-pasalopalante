-- "Wave Maker" badge: earned through People reached (reach_stats_for —
-- see 20261031180000_people_reached_two_way.sql), with the same stages as
-- the act badges.
--
--   {"type": "reach", "stages": [...]}    people reached
--
-- Unlike act badges, someone's people reached can grow without them doing
-- anything (a scan or signup somewhere further along their network), so
-- it's awarded when either person in a new scan or signup connects, and
-- the badge screens show live progress for everyone else in between (they
-- already take the higher of the saved and the live stage).

-- 1. The badge.
INSERT INTO public.badges (id, kind, sort_order, icon, criteria,
                           name, name_es, name_fr, name_de,
                           description, description_es, description_fr, description_de) VALUES
  ('wave_maker', 'reach', 90, '🌊',
   '{"type": "reach", "stages": [3, 7, 12, 18, 25, 33, 42, 50]}'::jsonb,
   'Wave Maker', 'Creador de Olas', 'Faiseur de Vagues', 'Wellenmacher',
   'Share or scan a “QR code”', 'Comparte o escanea un “código QR”',
   'Partage ou scanne un « code QR »', 'Teile oder scanne einen „QR-Code“')
ON CONFLICT (id) DO UPDATE SET
  kind = EXCLUDED.kind, sort_order = EXCLUDED.sort_order, icon = EXCLUDED.icon,
  criteria = EXCLUDED.criteria,
  name = EXCLUDED.name, name_es = EXCLUDED.name_es, name_fr = EXCLUDED.name_fr, name_de = EXCLUDED.name_de,
  description = EXCLUDED.description, description_es = EXCLUDED.description_es,
  description_fr = EXCLUDED.description_fr, description_de = EXCLUDED.description_de;

-- 2. Progress learns the "reach" type. Act counts and streaks are as
--    before. People reached is private, so it's only counted for the user
--    themselves, the service role, a direct DB session, or the award
--    triggers below (which run inside someone else's request — the
--    scanner's — and award the other person too).
CREATE OR REPLACE FUNCTION public.act_badge_progress(_user_id uuid)
RETURNS TABLE(badge_id text, current_count bigint, target integer, stage integer, max_stage integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH acts AS (
    SELECT a.mode, a.act_type
    FROM public.acts_of_kindness a
    WHERE a.user_id = _user_id AND a.status = 'published'
  ),
  counts AS (
    SELECT b.id, b.criteria,
           CASE b.criteria->>'type'
             WHEN 'streak' THEN (
               SELECT coalesce(max(us.longest_streak), 0)::bigint FROM public.user_streak(_user_id) us)
             WHEN 'acts' THEN (
               SELECT count(*) FROM acts a
               WHERE (NOT b.criteria ? 'modes'
                      OR a.mode IN (SELECT jsonb_array_elements_text(b.criteria->'modes')))
                 AND (NOT b.criteria ? 'act_types'
                      OR a.act_type IN (SELECT jsonb_array_elements_text(b.criteria->'act_types'))))
             WHEN 'reach' THEN (
               SELECT CASE
                        WHEN auth.role() IS NULL OR auth.role() = 'service_role'
                             OR auth.uid() = _user_id OR pg_trigger_depth() > 0
                        THEN coalesce((SELECT r.people_reached FROM public.reach_stats_for(_user_id) r), 0)
                        ELSE 0
                      END)
           END AS n
    FROM public.badges b
    WHERE b.criteria->>'type' IN ('streak', 'acts', 'reach')
      AND jsonb_typeof(b.criteria->'stages') = 'array'
  )
  SELECT c.id,
         c.n,
         coalesce(
           (SELECT min(s::int) FROM jsonb_array_elements_text(c.criteria->'stages') s WHERE s::int > c.n),
           (SELECT max(s::int) FROM jsonb_array_elements_text(c.criteria->'stages') s)
         )::int,
         (SELECT count(*) FROM jsonb_array_elements_text(c.criteria->'stages') s WHERE s::int <= c.n)::int,
         jsonb_array_length(c.criteria->'stages')
  FROM counts c
  WHERE _user_id IS NOT NULL;
$$;

REVOKE EXECUTE ON FUNCTION public.act_badge_progress(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.act_badge_progress(uuid) TO authenticated, service_role;

-- 3. Awarding: unchanged, except the award triggers below may award the
--    other person in a scan or signup, not just the signed-in user.
CREATE OR REPLACE FUNCTION public.award_badges_for_user(_user_id uuid)
RETURNS TABLE(earned_badge_id text, new_stage integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF _user_id IS NULL THEN
    RETURN;
  END IF;

  -- Through PostgREST only the user themselves (or the service role) may
  -- recompute; a null auth.role() is a direct DB session (SQL editor,
  -- migrations, manual approval) and is trusted, and so are our own
  -- triggers (pg_trigger_depth() > 0) — clients can't call this from one.
  IF auth.role() IS NOT NULL
     AND auth.role() <> 'service_role'
     AND (auth.uid() IS NULL OR auth.uid() <> _user_id)
     AND pg_trigger_depth() = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH reached AS (
    SELECT p.badge_id AS bid, p.stage AS st
    FROM public.act_badge_progress(_user_id) p
    WHERE p.stage > 0
  ), upserted AS (
    INSERT INTO public.user_badges AS ub (user_id, badge_id, stage)
    SELECT _user_id, r.bid, r.st FROM reached r
    ON CONFLICT (user_id, badge_id) DO UPDATE
      SET stage = EXCLUDED.stage, earned_at = now()
      WHERE ub.stage < EXCLUDED.stage
    RETURNING ub.badge_id AS bid, ub.stage AS st
  )
  SELECT u.bid, u.st FROM upserted u;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.award_badges_for_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_badges_for_user(uuid) TO authenticated, service_role;

-- 4. Award both people whenever a new connection is made: a Pass QR scan,
--    or someone joining with a code. A failure here must never block the
--    scan or signup itself.
CREATE OR REPLACE FUNCTION public.award_badges_after_connection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  BEGIN
    IF TG_TABLE_NAME = 'pass_handoffs' THEN
      PERFORM public.award_badges_for_user(NEW.from_user_id);
      PERFORM public.award_badges_for_user(NEW.to_user_id);
    ELSIF NEW.referred_by IS NOT NULL THEN
      PERFORM public.award_badges_for_user(NEW.referred_by);
      PERFORM public.award_badges_for_user(NEW.user_id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'award_badges_after_connection failed: %', SQLERRM;
  END;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.award_badges_after_connection() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS award_badges_after_handoff ON public.pass_handoffs;
CREATE TRIGGER award_badges_after_handoff
AFTER INSERT ON public.pass_handoffs
FOR EACH ROW EXECUTE FUNCTION public.award_badges_after_connection();

DROP TRIGGER IF EXISTS award_badges_after_referral ON public.profiles;
CREATE TRIGGER award_badges_after_referral
AFTER INSERT OR UPDATE OF referred_by ON public.profiles
FOR EACH ROW
WHEN (NEW.referred_by IS NOT NULL)
EXECUTE FUNCTION public.award_badges_after_connection();

-- 5. Backfill everyone with at least one connection, without a push
--    notification for each (same as the badge rework's backfill).
ALTER TABLE public.user_badges DISABLE TRIGGER notify_badge_unlocked_trg;

SELECT public.award_badges_for_user(c.user_id)
FROM (SELECT DISTINCT user_id FROM public.member_connections) c;

ALTER TABLE public.user_badges ENABLE TRIGGER notify_badge_unlocked_trg;
