DROP POLICY IF EXISTS "Public can view kindness photos" ON storage.objects;
CREATE POLICY "Public can view kindness photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'kindness-photos');

DROP POLICY IF EXISTS "Leaders can update org memberships" ON public.org_members;
CREATE POLICY "Leaders can update org memberships"
ON public.org_members FOR UPDATE
TO authenticated
USING (public.is_org_leader(auth.uid(), org_id) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.is_org_leader(auth.uid(), org_id) OR public.has_role(auth.uid(), 'admin'));