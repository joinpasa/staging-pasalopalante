import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getTranslations, LANGUAGES, type Language, type Translations } from "@shared/i18n/translations";

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

/** Saved choice wins; otherwise fall back to the browser's preferred language. */
function detectLanguage(): Language {
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
  const [lang, setLangState] = useState<Language>(() => detectLanguage());
  const t = getTranslations(lang);

  const setLang = (next: Language) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  };

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
