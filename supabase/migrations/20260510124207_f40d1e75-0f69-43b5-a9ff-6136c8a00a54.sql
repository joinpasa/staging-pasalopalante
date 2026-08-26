
CREATE TABLE public.acts_of_kindness (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  mode text NOT NULL CHECK (mode IN ('performed','witnessed','received')),
  description text,
  first_name text,
  video_url text,
  photo_paths text[] NOT NULL DEFAULT '{}',
  type_tag text,
  category text,
  language text,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published','rejected','pending')),
  moderation_reason text,
  user_id uuid
);

ALTER TABLE public.acts_of_kindness ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published acts"
  ON public.acts_of_kindness
  FOR SELECT
  USING (status = 'published');

CREATE INDEX idx_acts_status_created ON public.acts_of_kindness (status, created_at DESC);

INSERT INTO storage.buckets (id, name, public)
VALUES ('kindness-photos', 'kindness-photos', true);

CREATE POLICY "Public can view kindness photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'kindness-photos');

CREATE POLICY "Anyone can upload kindness photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'kindness-photos');
