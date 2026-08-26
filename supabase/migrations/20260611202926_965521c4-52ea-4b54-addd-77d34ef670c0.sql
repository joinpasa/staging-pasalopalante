
-- acts_of_kindness: revoke full-row SELECT, grant only safe columns
REVOKE SELECT ON public.acts_of_kindness FROM anon, authenticated;
GRANT SELECT (id, created_at, mode, description, first_name, video_url, photo_paths, type_tag, category, language, status) ON public.acts_of_kindness TO anon, authenticated;

-- commitments: revoke full-row SELECT, grant only safe columns
REVOKE SELECT ON public.commitments FROM anon, authenticated;
GRANT SELECT (id, created_at, type, first_name, org_name, org_website, pledge_count, message, language, status, help_role, country, org_type) ON public.commitments TO anon, authenticated;
