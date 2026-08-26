
-- 1. Legal document version registry
CREATE TABLE public.legal_document_versions (
  doc_key text PRIMARY KEY,
  version text NOT NULL,
  major int NOT NULL,
  effective_date date NOT NULL DEFAULT current_date,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.legal_document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Legal versions are viewable by everyone"
  ON public.legal_document_versions FOR SELECT
  USING (true);

INSERT INTO public.legal_document_versions (doc_key, version, major, effective_date) VALUES
  ('terms', '1.0', 1, current_date),
  ('privacy', '3.0', 3, '2026-05-14'),
  ('community_guidelines', '1.0', 1, current_date);

-- 2. Consent log
CREATE TABLE public.user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  context text NOT NULL,
  act_id uuid NULL,
  terms_version text,
  privacy_version text,
  community_guidelines_version text,
  email_reminders_opt_in boolean NOT NULL DEFAULT false,
  ip_address text,
  user_agent text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

-- Anyone (anon or authed) can write a consent record (used for signup, anon submissions, re-consent)
CREATE POLICY "Anyone can insert a consent record"
  ON public.user_consents FOR INSERT
  WITH CHECK (true);

-- Authenticated users can read their own consent records
CREATE POLICY "Users can read their own consent records"
  ON public.user_consents FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 3. Profile fields for re-consent comparison
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS terms_version_accepted text,
  ADD COLUMN IF NOT EXISTS privacy_version_accepted text,
  ADD COLUMN IF NOT EXISTS terms_major_accepted int,
  ADD COLUMN IF NOT EXISTS privacy_major_accepted int;

-- 4. Audit fields on acts_of_kindness
ALTER TABLE public.acts_of_kindness
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS terms_version text,
  ADD COLUMN IF NOT EXISTS privacy_version text,
  ADD COLUMN IF NOT EXISTS community_guidelines_version text;
