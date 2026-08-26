
CREATE TABLE IF NOT EXISTS public.moderation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  act_id uuid NULL,
  user_id uuid NULL,
  email text NULL,
  mode text NULL,
  status text NOT NULL,
  reason_codes text[] NOT NULL DEFAULT '{}',
  short_reason text NULL,
  confidence numeric NULL,
  original_text text NULL,
  model text NULL,
  ip_address text NULL,
  user_agent text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view moderation logs"
  ON public.moderation_logs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

REVOKE ALL ON public.moderation_logs FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_moderation_logs_created_at ON public.moderation_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_status ON public.moderation_logs (status);
