-- 1. Referral columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS referred_by uuid;

UPDATE public.profiles
   SET referral_code = encode(gen_random_bytes(8), 'hex')
 WHERE referral_code IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN referral_code SET DEFAULT encode(gen_random_bytes(8), 'hex');

ALTER TABLE public.profiles
  ALTER COLUMN referral_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_key
  ON public.profiles (referral_code);

CREATE INDEX IF NOT EXISTS profiles_referred_by_idx
  ON public.profiles (referred_by);

-- prevent self-referral
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_referred_by_not_self;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_referred_by_not_self
  CHECK (referred_by IS NULL OR referred_by <> user_id);

-- 2. Claim a referral for the calling user (same-visit MVP)
CREATE OR REPLACE FUNCTION public.claim_referral(_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  inviter uuid;
  created timestamptz;
  existing uuid;
BEGIN
  IF uid IS NULL OR _code IS NULL OR length(trim(_code)) = 0 THEN
    RETURN false;
  END IF;

  SELECT p.referred_by, p.created_at INTO existing, created
    FROM public.profiles p WHERE p.user_id = uid;

  IF NOT FOUND OR existing IS NOT NULL THEN
    RETURN false;
  END IF;

  -- only attribute recently created accounts
  IF created IS NULL OR created < now() - interval '7 days' THEN
    RETURN false;
  END IF;

  SELECT p.user_id INTO inviter
    FROM public.profiles p
   WHERE p.referral_code = trim(_code)
   LIMIT 1;

  IF inviter IS NULL OR inviter = uid THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
     SET referred_by = inviter
   WHERE user_id = uid
     AND referred_by IS NULL;

  RETURN true;
END;
$$;

-- 3. Stats for the calling user
CREATE OR REPLACE FUNCTION public.my_referral_stats()
RETURNS TABLE(joined_count bigint, pledge_total bigint, acts_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    (SELECT count(*) FROM public.profiles p WHERE p.referred_by = auth.uid()),
    (SELECT coalesce(sum(c.pledge_count), 0)::bigint
       FROM public.commitments c
       JOIN public.profiles p ON p.user_id = c.user_id
      WHERE p.referred_by = auth.uid() AND c.status = 'published'),
    (SELECT count(*)
       FROM public.acts_of_kindness a
       JOIN public.profiles p ON p.user_id = a.user_id
      WHERE p.referred_by = auth.uid() AND a.status = 'published')
  WHERE auth.uid() IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.claim_referral(text) FROM public;
REVOKE ALL ON FUNCTION public.my_referral_stats() FROM public;
GRANT EXECUTE ON FUNCTION public.claim_referral(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_referral(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.my_referral_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_referral_stats() TO service_role;