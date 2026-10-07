import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getTranslations, loadTranslations, LANGUAGES, type Language, type Translations } from "@shared/i18n/translations";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "ppl-lang";
const SUPPORTED = LANGUAGES.map((l) => l.code);

const isSupported = (value: string): value is Language =>
  (SUPPORTED as string[]).includes(value);

/**
 * Saved choice wins; otherwise fall back to the browser's preferred
 * language. Exported so main.tsx can preload this language's translations
 * before the app ever mounts - see loadTranslations in i18n/translations.ts.
 */
export function detectLanguage(): Language {
  if (typeof window === "undefined") return "en";

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && isSupported(saved)) return saved;
  } catch {
    /* storage blocked — fall through to detection */
  }

  const candidates = [
    ...(navigator.languages ?? []),
    navigator.language,
  ].filter(Boolean) as string[];

  for (const tag of candidates) {
    const base = tag.toLowerCase().split("-")[0];
    if (isSupported(base)) return base;
  }
  return "en";
}

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  // By the time this runs, main.tsx has already awaited
  // loadTranslations(detectLanguage()) before mounting the app at all - so
  // this initial read is a real, correct value from cache, not a fallback.
  const [lang, setLangState] = useState<Language>(() => detectLanguage());
  const [t, setT] = useState<Translations>(() => getTranslations(lang));

  // Only swaps lang + t together once the new language has actually
  // loaded, so switching to a not-yet-loaded locale never flashes English
  // (or blank) in between - it just takes a beat before anything changes.
  const setLang = (next: Language) => {
    loadTranslations(next).then((loaded) => {
      setLangState(next);
      setT(loaded);
    });
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  // Correctness safety net, independent of main.tsx's preload: ensures
  // whatever language is current actually gets (or already has) its real
  // translations loaded, even when this provider mounts on its own (tests,
  // Storybook, hot reload) without main.tsx's loadTranslations-before-mount
  // step ever having run. A no-op cache hit when it has.
  useEffect(() => {
    let cancelled = false;
    loadTranslations(lang).then((loaded) => {
      if (!cancelled) setT(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  useEffect(() => {
    const meta = LANGUAGES.find((l) => l.code === lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = meta?.rtl ? "rtl" : "ltr";
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context) return context;

  // Keep the app from blanking if a route is briefly rendered outside the root
  // provider during hot reload or preview hydration.
  return {
    lang: "en",
    setLang: () => undefined,
    t: getTranslations("en"),
  };
};
