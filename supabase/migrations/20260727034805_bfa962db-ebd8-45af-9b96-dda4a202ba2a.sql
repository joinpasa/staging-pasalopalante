CREATE OR REPLACE FUNCTION public.act_badge_progress(_user_id uuid)
 RETURNS TABLE(badge_id text, current_count bigint, target integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH defs(badge_id, target, tag, mode) AS (
    VALUES
      ('time_giver'::text,      10, 'time'::text,     NULL::text),
      ('sleeves_up',            10, 'hands_on',       NULL),
      ('open_hand',             10, 'money',          NULL),
      ('good_word',             10, 'words',          NULL),
      ('hug_dealer',            10, 'hug',            NULL),
      ('wave_maker',             5, 'group',          NULL),
      ('grateful_heart',        10, NULL,             'received'),
      ('kindness_spotter',      10, NULL,             'witnessed')
  )
  SELECT d.badge_id,
         (SELECT count(*)
            FROM public.acts_of_kindness a
           WHERE a.user_id = _user_id
             AND a.status = 'published'
             AND (d.tag IS NULL OR a.tags @> ARRAY[d.tag])
             AND (d.mode IS NULL OR a.mode = d.mode))::bigint,
         d.target
  FROM defs d
  WHERE _user_id IS NOT NULL;
$function$;

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

  IF coalesce(auth.role(), '') <> 'service_role'
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