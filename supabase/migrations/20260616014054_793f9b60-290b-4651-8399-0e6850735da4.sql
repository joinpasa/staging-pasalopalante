REVOKE SELECT ON public.acts_of_kindness FROM anon;
REVOKE SELECT ON public.acts_of_kindness FROM authenticated;

GRANT SELECT (
  id, created_at, mode, description, first_name, video_url, photo_paths,
  type_tag, category, language, status, user_id,
  community_guidelines_version, privacy_version, terms_version, moderation_reason
) ON public.acts_of_kindness TO anon;

GRANT SELECT (
  id, created_at, mode, description, first_name, video_url, photo_paths,
  type_tag, category, language, status, user_id,
  community_guidelines_version, privacy_version, terms_version, moderation_reason,
  email
) ON public.acts_of_kindness TO authenticated;

GRANT ALL ON public.acts_of_kindness TO service_role;