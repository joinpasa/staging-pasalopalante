-- log_pass_handoff previously returned the same empty result set whether a
-- code genuinely didn't exist or the caller scanned/opened their own pass
-- link — the frontend couldn't tell those apart, so someone landing on
-- their own pass URL (e.g. reopening a link they'd shared/tested earlier)
-- saw the same generic "That pass code isn't valid" as a truly broken code,
-- with no indication that nothing was actually wrong.
--
-- Adds is_self so the app can show the right message. Changing a RETURNS
-- TABLE signature requires dropping first — Postgres won't let CREATE OR
-- REPLACE alter it in place.
DROP FUNCTION IF EXISTS public.log_pass_handoff(text);

CREATE OR REPLACE FUNCTION public.log_pass_handoff(_code text)
RETURNS TABLE(from_user_id uuid, from_name text, is_self boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  owner uuid;
  owner_name text;
BEGIN
  IF uid IS NULL OR _code IS NULL OR length(trim(_code)) = 0 THEN
    RETURN;
  END IF;

  SELECT p.user_id, COALESCE(NULLIF(trim(p.first_name), ''), NULLIF(trim(p.display_name), ''), 'a fellow member')
    INTO owner, owner_name
    FROM public.profiles p
   WHERE p.referral_code = trim(_code)
   LIMIT 1;

  IF owner IS NULL THEN
    RETURN;
  END IF;

  IF owner = uid THEN
    from_user_id := owner;
    from_name := owner_name;
    is_self := true;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.pass_handoffs (from_user_id, to_user_id)
  VALUES (owner, uid);

  from_user_id := owner;
  from_name := owner_name;
  is_self := false;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.log_pass_handoff(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_pass_handoff(text) TO authenticated;
