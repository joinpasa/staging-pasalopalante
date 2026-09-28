-- Two new columns for the redesigned Log an Act screen:
--
-- act_type: which of the chip-picker options ("Helped a neighbor", "Gave a
-- compliment", etc.) someone picked. Free-text (not an enum/check
-- constraint) so the chip labels can change later without a migration.
-- Purely descriptive, same visibility as the existing mode/category/
-- type_tag columns.
--
-- share_on_wall: real backing for the "Share on the Wall of Kindness"
-- toggle (defaults on, matching the screen's default). Previously nothing
-- like this existed — every approved (status='published') act was
-- automatically publicly visible with no way to opt out. This is enforced
-- in the RLS policy itself, not just an application-side query filter, so
-- it's an actual privacy control no matter which client reads the table —
-- the app's own Wall feed, the website's Wall of Kindness, and any direct
-- REST query all go through this same policy. The separate
-- "auth.uid() = user_id" policy (own rows) is untouched, so someone can
-- still always see their own acts regardless of this flag.
ALTER TABLE public.acts_of_kindness ADD COLUMN IF NOT EXISTS act_type text;
ALTER TABLE public.acts_of_kindness ADD COLUMN IF NOT EXISTS share_on_wall boolean NOT NULL DEFAULT true;

DROP POLICY IF EXISTS "Public can view published acts" ON public.acts_of_kindness;
CREATE POLICY "Public can view published acts"
  ON public.acts_of_kindness
  FOR SELECT
  USING (status = 'published' AND share_on_wall = true);

GRANT SELECT (act_type) ON public.acts_of_kindness TO anon, authenticated;
