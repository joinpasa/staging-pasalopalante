-- acts_of_kindness.email was granted to `authenticated` in the
-- 2026-09-02 grants-consolidation migration (intended to lock down
-- ip_address/user_agent, which it did) but never revoked for `email` on
-- that same role — so any signed-in user could `select email` on every
-- published act, including guest submitters' emails, none of whom
-- consented to their address being visible to other users. No frontend
-- query anywhere in apps/* actually selects this column; it was an
-- unintentional over-grant, not a used feature.
REVOKE SELECT (email) ON public.acts_of_kindness FROM authenticated;
