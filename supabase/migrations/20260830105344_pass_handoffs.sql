-- Logs an in-person "hand-off" when someone already signed in scans another
-- member's pass code (the scan-to-signup path already works via referred_by;
-- this covers two existing members meeting in person).
CREATE TABLE public.pass_handoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_user_id <> to_user_id)
);

CREATE INDEX pass_handoffs_from_idx ON public.pass_handoffs (from_user_id);
CREATE INDEX pass_handoffs_to_idx ON public.pass_handoffs (to_user_id);

ALTER TABLE public.pass_handoffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own handoffs"
ON public.pass_handoffs FOR SELECT TO authenticated
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

GRANT SELECT ON public.pass_handoffs TO authenticated;
-- Inserts only go through log_pass_handoff() below, never direct table access.
REVOKE INSERT, UPDATE, DELETE ON public.pass_handoffs FROM authenticated, anon;

-- Looks up the pass code's owner, logs the hand-off, and returns the owner's
-- id/name so the scanning app can greet them. SECURITY DEFINER because
-- profiles is owner-only SELECT and the scanner needs the other person's name.
CREATE OR REPLACE FUNCTION public.log_pass_handoff(_code text)
RETURNS TABLE(from_user_id uuid, from_name text)
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

  IF owner IS NULL OR owner = uid THEN
    RETURN;
  END IF;

  INSERT INTO public.pass_handoffs (from_user_id, to_user_id)
  VALUES (owner, uid);

  from_user_id := owner;
  from_name := owner_name;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.log_pass_handoff(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_pass_handoff(text) TO authenticated;
