REVOKE EXECUTE ON FUNCTION public.email_exists(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.email_exists(text) TO service_role;