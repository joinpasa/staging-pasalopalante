-- submit-act is a public, unauthenticated endpoint (verify_jwt = false, by
-- design — guests submit acts without an account) with no limit on how
-- many times it can be called. Without this, a script could loop it to
-- fabricate "acts pledged" counts and flood the public Wall of Kindness,
-- and every call also burns a Gemini moderation request even when
-- rejected. Same pattern as check_and_log_photo_upload
-- (20260914140000_photo_upload_rate_limit.sql): one row per request, keyed
-- by IP, with the function checking a rolling window count before
-- allowing the next one. Append-only and short-lived by design — cleanup
-- happens opportunistically inside the function itself.
CREATE TABLE IF NOT EXISTS public.act_submit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip_address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_act_submit_log_ip_created
  ON public.act_submit_log (ip_address, created_at DESC);

ALTER TABLE public.act_submit_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can manage act submit log"
    ON public.act_submit_log FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.check_and_log_act_submit(
  _ip_address TEXT, _window_minutes INT, _max_requests INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count INT;
BEGIN
  -- Opportunistic cleanup: no cron needed for a table this small/short-lived.
  DELETE FROM public.act_submit_log WHERE created_at < now() - interval '1 day';

  SELECT count(*) INTO recent_count
    FROM public.act_submit_log
   WHERE ip_address = _ip_address
     AND created_at > now() - make_interval(mins => _window_minutes);

  IF recent_count >= _max_requests THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.act_submit_log (ip_address) VALUES (_ip_address);
  RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_and_log_act_submit(TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_log_act_submit(TEXT, INT, INT) TO service_role;
