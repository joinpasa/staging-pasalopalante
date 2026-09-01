-- Server-side "has this account seen the welcome onboarding carousel" flag.
-- Needs to be server-side (not localStorage) since the same account is
-- reached from two separate origins (website, app) and often two separate
-- devices (request the signup link on one, click it on another).
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_seen boolean NOT NULL DEFAULT false;
