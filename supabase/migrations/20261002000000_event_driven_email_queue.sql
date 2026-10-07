-- Replaces polling with event-driven triggering for the email queue.
--
-- process-email-queue was invoked on a fixed timer (pg_cron, originally
-- every 5 seconds, widened to 30 seconds on 2026-10-01) regardless of
-- whether either queue had anything to send. Even with nothing to do, every
-- invocation still produces a platform-level log line (method, status,
-- duration) from the Edge Runtime itself — at 30-second polling that's
-- ~86,400 invocations/month of pure overhead, which was still the majority
-- of this project's total Edge Function invocations and a major contributor
-- to the Log Ingestion quota, for an app sending a handful of emails a day.
--
-- public.enqueue_email() is the single choke point every email already goes
-- through (auth-email-hook, pending-review-digest) — nothing calls
-- pgmq.send() directly. So instead of polling "is there anything to do?"
-- on a timer, enqueue_email() now tells the processor directly, the moment
-- there actually is something to do.

-- Best-effort notifier: a failure here (missing Vault secret, pg_net
-- hiccup) must never block the email from being enqueued — it just means
-- this one message waits for the cron safety-net instead of firing
-- immediately. See the POST-MIGRATION STEPS note below for that job.
CREATE OR REPLACE FUNCTION public.notify_email_queue_processor()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  service_key TEXT;
  project_url TEXT := 'https://tipfbleltjexofsjffwb.supabase.co';
BEGIN
  SELECT decrypted_secret INTO service_key
    FROM vault.decrypted_secrets
   WHERE name = 'email_queue_service_role_key';

  IF service_key IS NULL THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := project_url || '/functions/v1/process-email-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := '{}'::jsonb
  );
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_email_queue_processor() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_email_queue_processor() TO service_role;

-- Same signature and behavior as before, plus one line: tell the processor
-- right after a successful enqueue instead of waiting for the next poll.
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name TEXT, payload JSONB)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_msg_id BIGINT;
BEGIN
  BEGIN
    new_msg_id := pgmq.send(queue_name, payload);
  EXCEPTION WHEN undefined_table THEN
    PERFORM pgmq.create(queue_name);
    new_msg_id := pgmq.send(queue_name, payload);
  END;

  PERFORM public.notify_email_queue_processor();

  RETURN new_msg_id;
END;
$$;

-- ============================================================
-- POST-MIGRATION STEP (apply via the Supabase SQL Editor — this session
-- has no network path to the live project to run it directly, same as the
-- 2026-10-01 cron-interval change above)
-- ============================================================
--
-- The cron job stays, but only as a safety net now: a message a transient
-- failure left needing retry (Resend hiccup, pg_net error) still gets
-- picked up even if no new email is ever enqueued again. Since triggering
-- is now event-driven, this can be widened far past 30 seconds — 5 minutes
-- comfortably catches any stragglers without meaningfully delaying a retry
-- that was already waiting on its own cooldown.
--
--   SELECT cron.alter_job(
--     job_id := (SELECT jobid FROM cron.job WHERE jobname = 'process-email-queue'),
--     schedule := '5 minutes'
--   );
--
-- Net effect: real emails now send within ~1 second of being queued
-- (faster than the old 30-second-average wait), while total invocations
-- drop from ~86,400/month (30s polling) to roughly one per email sent plus
-- ~8,640/month from the safety net — the great majority of which should
-- find nothing to do and exit immediately.
