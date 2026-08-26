import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Lang = "en" | "zh" | "hi" | "es" | "fr" | "ar" | "bn" | "pt" | "ru" | "de" | "sl";

interface Result {
  translation: string | null;
  loading: boolean;
  error: boolean;
  /** True when source and target differ and we attempted/produced a translation. */
  needed: boolean;
  sourceLang: Lang | null;
}

// Module-level cache shared across all mounted cards: key = `${actId}:${target}`.
const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

function normalize(lang: string | null | undefined): Lang | null {
  if (!lang) return null;
  const l = lang.toLowerCase().slice(0, 2);
  const supported = ["en", "zh", "hi", "es", "fr", "ar", "bn", "pt", "ru", "de", "sl"];
  if (supported.includes(l)) return l as Lang;
  return null;
}

/**
 * Translates an act's text into the current UI language when its stored
 * `language` differs. Returns the cached translation immediately on
 * subsequent renders.
 */
export function useActTranslation(
  actId: string,
  text: string | null | undefined,
  sourceLangRaw: string | null | undefined,
  targetLang: Lang,
): Result {
  const sourceLang = normalize(sourceLangRaw);
  const trimmed = (text ?? "").trim();
  const needed = !!trimmed && !!sourceLang && sourceLang !== targetLang;
  const key = `${actId}:${targetLang}`;

  const [translation, setTranslation] = useState<string | null>(
    needed ? cache.get(key) ?? null : null,
  );
  const [loading, setLoading] = useState<boolean>(needed && !cache.has(key));
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (!needed) {
      setTranslation(null);
      setLoading(false);
      setError(false);
      return;
    }
    const cached = cache.get(key);
    if (cached) {
      setTranslation(cached);
      setLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    const existing = inflight.get(key);
    const promise =
      existing ??
      (async () => {
        const { data, error: err } = await supabase.functions.invoke(
          "translate-text",
          {
            body: {
              text: trimmed,
              target_lang: targetLang,
              source_lang: sourceLang,
            },
          },
        );
        if (err || !data?.translation) return null;
        const t = String(data.translation);
        cache.set(key, t);
        return t;
      })();

    if (!existing) inflight.set(key, promise);

    promise
      .then((t) => {
        if (cancelled) return;
        if (t) {
          setTranslation(t);
        } else {
          setError(true);
        }
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      })
      .finally(() => {
        if (inflight.get(key) === promise) inflight.delete(key);
      });

    return () => {
      cancelled = true;
    };
  }, [key, needed, trimmed, sourceLang, targetLang]);

  return { translation, loading, error, needed, sourceLang };
}
