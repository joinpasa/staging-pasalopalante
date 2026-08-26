-- 1. Hide sensitive columns from anon and authenticated on acts_of_kindness
REVOKE SELECT (email, ip_address, user_agent) ON public.acts_of_kindness FROM anon;
REVOKE SELECT (email, ip_address, user_agent) ON public.acts_of_kindness FROM authenticated;

-- 2. Hide submitter email from anon and authenticated on commitments
REVOKE SELECT (email) ON public.commitments FROM anon;
REVOKE SELECT (email) ON public.commitments FROM authenticated;

-- 3. Storage policies for kindness-photos bucket
DROP POLICY IF EXISTS "Public can view kindness photos" ON storage.objects;
CREATE POLICY "Public can view kindness photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'kindness-photos');

DROP POLICY IF EXISTS "Users can upload kindness photos to their folder" ON storage.objects;
CREATE POLICY "Users can upload kindness photos to their folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'kindness-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );