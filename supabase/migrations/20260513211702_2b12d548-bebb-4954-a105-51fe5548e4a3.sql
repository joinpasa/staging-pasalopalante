CREATE OR REPLACE FUNCTION public.user_streak(_user_id uuid)
RETURNS TABLE (current_streak int, longest_streak int, total_acts bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur int := 0;
  longest int := 0;
  run int := 0;
  prev date := null;
  latest_day date := null;
  d date;
  tz text;
BEGIN
  SELECT coalesce(timezone, 'America/Puerto_Rico') INTO tz
  FROM public.profiles
  WHERE user_id = _user_id;

  IF tz IS NULL THEN
    tz := 'America/Puerto_Rico';
  END IF;

  FOR d IN
    SELECT DISTINCT (created_at AT TIME ZONE tz)::date AS day
    FROM public.acts_of_kindness
    WHERE user_id = _user_id
      AND status = 'published'
    ORDER BY day DESC
  LOOP
    IF latest_day IS NULL THEN
      latest_day := d;
    END IF;

    IF prev IS NULL THEN
      run := 1;
    ELSIF prev - d = 1 THEN
      run := run + 1;
    ELSE
      IF run > longest THEN longest := run; END IF;
      run := 1;
    END IF;

    IF run > longest THEN longest := run; END IF;
    prev := d;
  END LOOP;

  IF latest_day IS NOT NULL AND ((now() AT TIME ZONE tz)::date - latest_day) <= 1 THEN
    cur := 0;
    prev := null;
    FOR d IN
      SELECT DISTINCT (created_at AT TIME ZONE tz)::date AS day
      FROM public.acts_of_kindness
      WHERE user_id = _user_id
        AND status = 'published'
      ORDER BY day DESC
    LOOP
      IF prev IS NULL THEN
        cur := 1;
      ELSIF prev - d = 1 THEN
        cur := cur + 1;
      ELSE
        EXIT;
      END IF;
      prev := d;
    END LOOP;
  ELSE
    cur := 0;
  END IF;

  SELECT count(*) INTO total_acts
  FROM public.acts_of_kindness
  WHERE user_id = _user_id
    AND status = 'published';

  current_streak := cur;
  longest_streak := longest;
  RETURN NEXT;
END;
$$;

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

CREATE OR REPLACE FUNCTION public.award_badges_after_act_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND NEW.status = 'published' THEN
    PERFORM public.award_badges_for_user(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS award_badges_after_act_insert_update ON public.acts_of_kindness;
CREATE TRIGGER award_badges_after_act_insert_update
AFTER INSERT OR UPDATE OF user_id, status, type_tag, created_at ON public.acts_of_kindness
FOR EACH ROW
EXECUTE FUNCTION public.award_badges_after_act_change();

CREATE OR REPLACE FUNCTION public.claim_my_acts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  uemail text;
  n integer := 0;
BEGIN
  IF uid IS NULL THEN RETURN 0; END IF;

  SELECT email INTO uemail FROM auth.users WHERE id = uid;
  IF uemail IS NULL THEN RETURN 0; END IF;

  WITH upd AS (
    UPDATE public.acts_of_kindness
       SET user_id = uid
     WHERE user_id IS NULL
       AND email IS NOT NULL
       AND lower(email) = lower(uemail)
    RETURNING 1
  )
  SELECT count(*) INTO n FROM upd;

  UPDATE public.commitments
     SET user_id = uid
   WHERE user_id IS NULL
     AND email IS NOT NULL
     AND lower(email) = lower(uemail);

  PERFORM public.award_badges_for_user(uid);

  RETURN n;
END;
$$;

SELECT public.award_badges_for_user(user_id)
FROM (
  SELECT DISTINCT user_id
  FROM public.acts_of_kindness
  WHERE user_id IS NOT NULL
    AND status = 'published'
) existing_users;