DROP POLICY IF EXISTS "Public can view kindness photos" ON storage.objects;

CREATE POLICY "Owners can view own kindness photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'kindness-photos' AND owner = auth.uid());