
-- Restrict sensitive columns on acts_of_kindness from anon and authenticated.
-- Owners cannot read these directly anymore either; edge functions use the
-- service_role which is unaffected by column-level grants.
REVOKE SELECT (email, ip_address, user_agent, moderation_reason)
  ON public.acts_of_kindness FROM anon, authenticated;

-- Restrict sensitive columns on commitments.
REVOKE SELECT (email, moderation_reason)
  ON public.commitments FROM anon, authenticated;

-- Tighten storage uploads: uploads happen via the sign-photo-upload edge
-- function (service_role + signed URL), so a permissive direct-insert policy
-- on the bucket is unnecessary and lets any authenticated user write to any
-- path. Drop it; the edge function flow continues to work.
DROP POLICY IF EXISTS "Authenticated uploads to kindness-photos" ON storage.objects;
