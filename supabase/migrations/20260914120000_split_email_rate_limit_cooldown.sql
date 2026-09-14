-- process-email-queue checked a single shared retry_after_until before
-- touching either queue: a Resend rate-limit hit while sending a
-- transactional email (the digest, GHL syncs, anything) froze auth_emails
-- (password resets, magic links) for the same 60s cooldown, even though
-- nothing about auth_emails was actually rate-limited. Splitting the
-- cooldown per queue means a transactional-side rate limit no longer
-- delays time-critical auth email at all.

ALTER TABLE public.email_send_state
  ADD COLUMN IF NOT EXISTS auth_retry_after_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS transactional_retry_after_until TIMESTAMPTZ;

-- Carry over whatever cooldown was already in flight so nothing gets
-- double-sent mid-migration; the old column stays in place afterward
-- (unused by new code, harmless) rather than being dropped, since dropping
-- a column a running function still reads until redeploy completes would
-- error instead of just going stale.
UPDATE public.email_send_state
SET auth_retry_after_until = retry_after_until,
    transactional_retry_after_until = retry_after_until
WHERE retry_after_until IS NOT NULL;
