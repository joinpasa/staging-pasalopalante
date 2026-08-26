ALTER TABLE public.profiles
  ALTER COLUMN referral_code SET DEFAULT encode(extensions.gen_random_bytes(4), 'hex');

DO $$
DECLARE
  r record;
  candidate text;
  tries int;
BEGIN
  FOR r IN SELECT user_id FROM public.profiles WHERE referral_code IS NULL OR length(referral_code) <> 8 LOOP
    tries := 0;
    LOOP
      tries := tries + 1;
      candidate := encode(extensions.gen_random_bytes(4), 'hex');
      BEGIN
        UPDATE public.profiles SET referral_code = candidate WHERE user_id = r.user_id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        IF tries > 20 THEN RAISE EXCEPTION 'could not allocate referral code'; END IF;
      END;
    END LOOP;
  END LOOP;
END $$;