
-- ============================================================
-- 1. PROFILES: drop public-read; owner-only
-- ============================================================
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
-- (owner SELECT/INSERT/UPDATE/DELETE policies already exist)

-- ============================================================
-- 2. ACTS_OF_KINDNESS: column-level grants to hide PII
-- ============================================================
REVOKE SELECT ON public.acts_of_kindness FROM anon, authenticated;
GRANT SELECT (
  id, mode, description, first_name, photo_paths, video_url,
  type_tag, category, language, status, moderation_reason,
  user_id, created_at,
  terms_version, privacy_version, community_guidelines_version
) ON public.acts_of_kindness TO anon, authenticated;

-- ============================================================
-- 3. COMMITMENTS: column-level grants to hide email
-- ============================================================
REVOKE SELECT ON public.commitments FROM anon, authenticated;
GRANT SELECT (
  id, type, first_name, country, org_name, org_website, org_type,
  help_role, message, language, status, moderation_reason,
  pledge_count, user_id, created_at
) ON public.commitments TO anon, authenticated;

-- ============================================================
-- 4. ACT_REACTIONS: hide user_id; provide helpers
-- ============================================================
REVOKE SELECT ON public.act_reactions FROM anon, authenticated;
GRANT SELECT (id, act_id, reaction, created_at) ON public.act_reactions TO anon, authenticated;

-- RPC: counts per act
CREATE OR REPLACE FUNCTION public.reaction_counts(_act_ids uuid[])
RETURNS TABLE(act_id uuid, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT act_id, count(*)::bigint
  FROM public.act_reactions
  WHERE act_id = ANY(_act_ids)
  GROUP BY act_id
$$;
REVOKE EXECUTE ON FUNCTION public.reaction_counts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reaction_counts(uuid[]) TO anon, authenticated;

-- RPC: which of these acts did the current user react to
CREATE OR REPLACE FUNCTION public.my_reactions(_act_ids uuid[])
RETURNS TABLE(act_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT act_id FROM public.act_reactions
  WHERE user_id = auth.uid() AND act_id = ANY(_act_ids)
$$;
REVOKE EXECUTE ON FUNCTION public.my_reactions(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_reactions(uuid[]) TO authenticated;

-- ============================================================
-- 5. STORAGE: kindness-photos & email-assets
-- ============================================================
DROP POLICY IF EXISTS "Anyone can upload kindness photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read email-assets" ON storage.objects;

-- Allow public read of individual kindness-photos (public URLs work without listing)
CREATE POLICY "Read individual kindness photos"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'kindness-photos');

-- Uploads: signed URL flow (service_role) or authenticated users
CREATE POLICY "Authenticated uploads to kindness-photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'kindness-photos');

-- Allow owners to update/delete their own kindness photos
CREATE POLICY "Owners update own kindness photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'kindness-photos' AND owner = auth.uid())
WITH CHECK (bucket_id = 'kindness-photos' AND owner = auth.uid());

CREATE POLICY "Owners delete own kindness photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'kindness-photos' AND owner = auth.uid());

-- email-assets: read individual files (no listing)
CREATE POLICY "Read individual email-assets"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'email-assets');

-- ============================================================
-- 6. FUNCTION search_path hardening
-- ============================================================
ALTER FUNCTION public.touch_updated_at()                 SET search_path = 'public';
ALTER FUNCTION public.delete_email(text, bigint)         SET search_path = 'public';
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = 'public';
ALTER FUNCTION public.enqueue_email(text, jsonb)         SET search_path = 'public';
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = 'public';

-- ============================================================
-- 7. Revoke SECURITY DEFINER from anon/authenticated where unsafe
-- ============================================================
-- RLS helpers / triggers: server-internal only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role)        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid, uuid)       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_org_leader(uuid, uuid)       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()               FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at()              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_badges_after_act_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_badges_for_user(uuid)     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_exists(text)              FROM PUBLIC, anon, authenticated;

-- Email queue helpers: service_role only
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb)         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint)         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb)   FROM PUBLIC, anon, authenticated;

-- Keep these callable by signed-in users (used via RPC from client)
REVOKE EXECUTE ON FUNCTION public.claim_my_acts()    FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.claim_my_acts()    TO authenticated;

REVOKE EXECUTE ON FUNCTION public.user_streak(uuid)  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.user_streak(uuid)  TO authenticated;

REVOKE EXECUTE ON FUNCTION public.org_stats(uuid)    FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.org_stats(uuid)    TO authenticated;
