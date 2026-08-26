
REVOKE SELECT (email, ip_address, user_agent) ON public.acts_of_kindness FROM anon, authenticated;
GRANT SELECT (id, created_at, mode, description, first_name, video_url, photo_paths, type_tag, category, language, status, user_id, community_guidelines_version, privacy_version, terms_version, moderation_reason) ON public.acts_of_kindness TO anon, authenticated;

REVOKE SELECT (email, moderation_reason) ON public.commitments FROM anon, authenticated;
GRANT SELECT (id, created_at, type, first_name, org_name, org_website, language, status, user_id, help_role, country, org_type, message, pledge_count) ON public.commitments TO anon, authenticated;

DROP POLICY IF EXISTS "Reactions are viewable by everyone" ON public.act_reactions;
