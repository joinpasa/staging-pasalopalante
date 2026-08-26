DROP POLICY IF EXISTS "Users can join an org" ON public.org_members;

CREATE POLICY "Users can join an org as member"
ON public.org_members
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND is_leader = false);

CREATE POLICY "Leaders or admins can add members with any role"
ON public.org_members
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_org_leader(auth.uid(), org_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);