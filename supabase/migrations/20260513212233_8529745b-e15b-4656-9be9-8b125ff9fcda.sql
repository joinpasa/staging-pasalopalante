CREATE OR REPLACE FUNCTION public.award_badges_for_user(_user_id uuid)
RETURNS TABLE (earned_badge_id text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_published bigint := 0;
  current_days int := 0;
  hug_count bigint := 0;
  listening_count bigint := 0;
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
  WHERE user_id = _user_id
    AND status = 'published';

  SELECT coalesce(us.current_streak, 0) INTO current_days
  FROM public.user_streak(_user_id) us
  LIMIT 1;

  SELECT count(*) INTO hug_count
  FROM public.acts_of_kindness
  WHERE user_id = _user_id
    AND status = 'published'
    AND type_tag = 'hug';

  SELECT count(*) INTO listening_count
  FROM public.acts_of_kindness
  WHERE user_id = _user_id
    AND status = 'published'
    AND type_tag = 'listening';

  RETURN QUERY
  WITH eligible(id) AS (
    SELECT 'first_act'::text WHERE total_published >= 1
    UNION ALL SELECT 'streak_3'::text WHERE current_days >= 3
    UNION ALL SELECT 'streak_7'::text WHERE current_days >= 7
    UNION ALL SELECT 'streak_30'::text WHERE current_days >= 30
    UNION ALL SELECT 'hug_dealer'::text WHERE hug_count >= 10
    UNION ALL SELECT 'listener'::text WHERE listening_count >= 10
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
$$;

REVOKE EXECUTE ON FUNCTION public.award_badges_for_user(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.award_badges_for_user(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.award_badges_for_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_badges_for_user(uuid) TO service_role;