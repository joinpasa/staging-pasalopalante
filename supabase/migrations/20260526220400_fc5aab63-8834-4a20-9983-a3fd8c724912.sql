CREATE TABLE public.feature_interest (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  feature_key text NOT NULL,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, feature_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_interest TO authenticated;
GRANT ALL ON public.feature_interest TO service_role;

ALTER TABLE public.feature_interest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own feature interest"
  ON public.feature_interest FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own feature interest"
  ON public.feature_interest FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own feature interest"
  ON public.feature_interest FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
