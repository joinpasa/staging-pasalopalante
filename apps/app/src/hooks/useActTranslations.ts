import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@shared/integrations/supabase/client";
import { useLanguage } from "@shared/contexts/LanguageContext";

interface TranslatableAct {
  id: string;
  description: string;
  language: string | null;
}

// Shared across every list in the tab, keyed `${actId}:${lang}`, so a
// translation fetched on the Wall is instant on Home or Map too.
const cache = new Map<string, string>();

/**
 * Translate-on-tap for a list of acts. Nothing is translated until someone
 * taps; translate-text then serves it from its translation_cache table if
 * anyone has asked for this act in this language before, and only calls
 * Gemini (and stores the result) the very first time.
 */
export function useActTranslations() {
  const { t, lang } = useLanguage();
  // act id → the language its translation is showing in (absent = original)
  const [shown, setShown] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const isTranslated = (id: string) => shown[id] === lang;

  const toggle = async (act: TranslatableAct) => {
    if (isTranslated(act.id)) {
      setShown(({ [act.id]: _, ...rest }) => rest);
      return;
    }
    const key = `${act.id}:${lang}`;
    if (!cache.has(key)) {
      setLoading((l) => ({ ...l, [act.id]: true }));
      const { data, error } = await supabase.functions.invoke("translate-text", {
        body: { text: act.description, target_lang: lang, source_lang: act.language, act_id: act.id },
      });
      setLoading(({ [act.id]: _, ...rest }) => rest);
      if (error || !data?.translation) {
        toast.error(t.appCommon.translateFailed);
        return;
      }
      cache.set(key, String(data.translation));
    }
    setShown((s) => ({ ...s, [act.id]: lang }));
  };

  // Nothing to translate when there's no real text, or it's already written
  // in the reader's language. An unknown language still gets the button.
  const canTranslate = (act: TranslatableAct & { hasDescription: boolean }) =>
    act.hasDescription && act.language !== lang;

  const textFor = (act: TranslatableAct) =>
    (isTranslated(act.id) && cache.get(`${act.id}:${lang}`)) || act.description;

  return { toggle, textFor, canTranslate, isTranslated, isLoading: (id: string) => !!loading[id] };
}
