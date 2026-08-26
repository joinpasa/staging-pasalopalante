REVOKE SELECT (email, ip_address, user_agent) ON public.acts_of_kindness FROM authenticated;
REVOKE SELECT (email, ip_address, user_agent) ON public.acts_of_kindness FROM anon;