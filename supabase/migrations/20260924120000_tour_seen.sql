-- Server-side "has this account seen the Dashboard's First-Time Tour" flag,
-- same reasoning as onboarding_seen: needs to be server-side, not
-- localStorage, since the same account is reachable from multiple
-- devices/browsers and the tour should only ever auto-play once per account,
-- not once per device.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tour_seen boolean NOT NULL DEFAULT false;
