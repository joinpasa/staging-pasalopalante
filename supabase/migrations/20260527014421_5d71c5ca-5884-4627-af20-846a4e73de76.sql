REVOKE SELECT (email, ip_address, user_agent) ON public.acts_of_kindness FROM anon, authenticated;
REVOKE SELECT (email) ON public.commitments FROM anon, authenticated;