-- Links an act to a specific recipient, but only when one is actually known:
-- the /wave pass hand-off flow. Ordinary acts (website submissions, plain
-- app /log entries, self-reported "received from a stranger" acts) never
-- set this — it stays null, and no "Send thanks" button ever appears for
-- them. That's intentional, not a gap to fill later.
ALTER TABLE public.acts_of_kindness
  ADD COLUMN IF NOT EXISTS to_user_id uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_acts_to_user ON public.acts_of_kindness (to_user_id);

-- One-tap acknowledgment from the recipient of a /wave-linked act back to
-- its giver. Insert-only (no edit/delete) — this is a fast "thanks", not a
-- conversation thread.
CREATE TABLE public.thanks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  act_id uuid NOT NULL REFERENCES public.acts_of_kindness(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (act_id, from_user_id)
);

CREATE INDEX idx_thanks_act ON public.thanks (act_id);

ALTER TABLE public.thanks ENABLE ROW LEVEL SECURITY;

-- Only the act's giver or its named recipient ever need to see a thanks row.
CREATE POLICY "Participants view thanks on their acts"
ON public.thanks FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.acts_of_kindness a
    WHERE a.id = thanks.act_id
      AND (a.user_id = auth.uid() OR a.to_user_id = auth.uid())
  )
);

-- Only the act's actual to_user_id can send thanks for it, and only as themselves.
CREATE POLICY "Recipient can send thanks"
ON public.thanks FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = from_user_id
  AND EXISTS (
    SELECT 1 FROM public.acts_of_kindness a
    WHERE a.id = thanks.act_id AND a.to_user_id = auth.uid()
  )
);

GRANT SELECT, INSERT ON public.thanks TO authenticated;
