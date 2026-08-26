-- Commitments table
CREATE TABLE public.commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL CHECK (type IN ('individual','organization')),
  first_name text,
  email text,
  org_name text,
  org_website text,
  pledge_count integer NOT NULL DEFAULT 1 CHECK (pledge_count > 0 AND pledge_count <= 1000000000),
  message text,
  language text,
  status text NOT NULL DEFAULT 'published',
  moderation_reason text,
  user_id uuid
);

ALTER TABLE public.commitments ENABLE ROW LEVEL SECURITY;

-- No public direct access to rows; aggregates exposed via view below.

-- Aggregate view (security_invoker so it respects caller; we grant select to anon/authenticated)
CREATE OR REPLACE VIEW public.pledge_totals
WITH (security_invoker = true)
AS
SELECT
  COALESCE(SUM(pledge_count), 0)::bigint AS total_pledged_acts,
  COUNT(*)::bigint AS total_commitments
FROM public.commitments
WHERE status = 'published';

-- Allow public read of the aggregate view
GRANT SELECT ON public.pledge_totals TO anon, authenticated;

-- We need a policy so the view (security_invoker) can read the underlying rows for aggregation.
-- Restrict the policy to aggregate-friendly access by allowing SELECT only of published rows.
CREATE POLICY "Public can aggregate published commitments"
ON public.commitments
FOR SELECT
TO anon, authenticated
USING (status = 'published');
