-- Tighten privileges and RLS for security findings

-- 1) organizations: only SELECT for clients; writes via service_role / SECURITY DEFINER
REVOKE INSERT, UPDATE, DELETE ON public.organizations FROM anon, authenticated;

-- 2) profiles: anon must not be able to read email/phone; revoke all anon access
REVOKE ALL ON public.profiles FROM anon;

-- 3) user_consents: restrict INSERT policy
DROP POLICY IF EXISTS "Anyone can insert a consent record" ON public.user_consents;

CREATE POLICY "Anon can insert anonymous consent"
  ON public.user_consents FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Authenticated can insert own consent"
  ON public.user_consents FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Also lock down writes on user_consents to insert-only at the privilege level
REVOKE UPDATE, DELETE ON public.user_consents FROM anon, authenticated;