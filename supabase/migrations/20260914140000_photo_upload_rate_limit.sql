-- sign-photo-upload is a public, unauthenticated endpoint (verify_jwt =
-- false, by design — guests share acts without an account) that hands out
-- a real signed upload URL into the kindness-photos bucket on every call,
-- with no limit on how many times it can be called. Without this, a script
-- could loop it indefinitely to run up storage costs and host unmoderated
-- images (moderation only ever scans the act's description text, never
-- photo content) under a public URL, entirely before any act is submitted.
--
-- One row per request, keyed by IP; the function checks a rolling window
-- count before issuing a new URL. Append-only and short-lived by design —
-- see cleanup_photo_upload_log(), called opportunistically from the
-- function itself rather than needing a separate cron job for a table this
-- small and this short-lived.
CREATE TABLE IF NOT EXISTS public.photo_upload_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip_address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_photo_upload_log_ip_created
  ON public.photo_upload_log (ip_address, created_at DESC);

ALTER TABLE public.photo_upload_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can manage photo upload log"
    ON public.photo_upload_log FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.check_and_log_photo_upload(
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
  DELETE FROM public.photo_upload_log WHERE created_at < now() - interval '1 day';

  SELECT count(*) INTO recent_count
    FROM public.photo_upload_log
   WHERE ip_address = _ip_address
     AND created_at > now() - make_interval(mins => _window_minutes);

  IF recent_count >= _max_requests THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.photo_upload_log (ip_address) VALUES (_ip_address);
  RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_and_log_photo_upload(TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_log_photo_upload(TEXT, INT, INT) TO service_role;
