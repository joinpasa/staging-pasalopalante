-- Tracks the last time process-email-queue sent an ops alert about hitting
-- Resend's rate limit, so it can throttle itself to at most one alert per
-- cooldown window instead of firing on every 429 (which, during a sustained
-- traffic spike, could otherwise repeat roughly every 60s and flood the
-- recipient's inbox).
alter table public.email_send_state
  add column if not exists last_rate_limit_alert_at timestamptz;
