-- translate-text previously had no real cache: the Cache-Control header it
-- set is a no-op, since it's invoked as a POST via the Supabase JS client
-- (supabase.functions.invoke), and POST responses aren't HTTP-cached by
-- browsers or CDNs regardless of that header. The only cache that actually
-- existed was a client-side JS Map in useActTranslation.ts, scoped to one
-- browser tab and cleared on reload. Translation is also triggered
-- automatically whenever a viewer's language differs from an act's stored
-- language — not behind an explicit "Translate" tap — so a popular act
-- viewed by many people in a different language was calling Gemini fresh
-- for an identical result every single time.
--
-- Act descriptions are immutable after submission (classify-act only ever
-- updates tags/tag_confidence/classified_at, never description), so caching
-- a translation by (act_id, target_lang) forever is safe.
CREATE TABLE IF NOT EXISTS public.translation_cache (
  act_id UUID NOT NULL REFERENCES public.acts_of_kindness(id) ON DELETE CASCADE,
  target_lang TEXT NOT NULL,
  translation TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (act_id, target_lang)
);

ALTER TABLE public.translation_cache ENABLE ROW LEVEL SECURITY;

-- Only the edge function (service role) ever reads or writes this table —
-- clients never query it directly, they always go through translate-text.
DO $$ BEGIN
  CREATE POLICY "Service role can manage translation cache"
    ON public.translation_cache FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
