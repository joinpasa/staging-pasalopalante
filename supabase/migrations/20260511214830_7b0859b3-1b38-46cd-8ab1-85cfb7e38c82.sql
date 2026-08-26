ALTER TABLE public.commitments
  ADD COLUMN IF NOT EXISTS help_role text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS org_type text;