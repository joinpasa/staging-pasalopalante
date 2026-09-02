-- acts_of_kindness has had its RLS policy and column-level grants toggled
-- across ~12 separate migrations. Since this project applies migrations
-- manually (no auto-apply-on-deploy), it's easy for one in that chain to
-- get skipped and leave the live database's `anon`/`authenticated` grants
-- out of sync with what the app actually needs — which is exactly what
-- caused public homepage queries (Live From The Wall, Wall of Kindness)
-- and the matching Realtime postgres_changes subscription to 401 for a
-- logged-out visitor. This consolidates the full history into one
-- idempotent re-apply so the live grants can't drift from what's below.

ALTER TABLE public.acts_of_kindness ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published acts" ON public.acts_of_kindness;
CREATE POLICY "Public can view published acts"
  ON public.acts_of_kindness
  FOR SELECT
  USING (status = 'published');

GRANT SELECT (
  id, created_at, mode, description, first_name, video_url, photo_paths,
  type_tag, category, language, status, user_id,
  community_guidelines_version, privacy_version, terms_version, moderation_reason,
  tags, tag_confidence, classified_at
) ON public.acts_of_kindness TO anon;

GRANT SELECT (
  id, created_at, mode, description, first_name, video_url, photo_paths,
  type_tag, category, language, status, user_id,
  community_guidelines_version, privacy_version, terms_version, moderation_reason,
  tags, tag_confidence, classified_at, email
) ON public.acts_of_kindness TO authenticated;

-- Sensitive columns stay locked down (unchanged from prior migrations).
REVOKE SELECT (email, ip_address, user_agent) ON public.acts_of_kindness FROM anon;
REVOKE SELECT (ip_address, user_agent) ON public.acts_of_kindness FROM authenticated;
