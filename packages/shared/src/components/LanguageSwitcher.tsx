import { useEffect, useRef, useState } from "react";
import { Check, Globe } from "lucide-react";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { LANGUAGES } from "@shared/i18n/translations";

const LanguageSwitcher = () => {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="fixed bottom-6 right-6 z-50" dir="ltr">
      {open && (
        <div
          className="absolute bottom-full right-0 mb-2 w-48 max-h-[60vh] overflow-y-auto rounded-2xl shadow-lg border border-foreground/10 bg-cyan-950 py-1.5"
          style={{ backdropFilter: "blur(8px)" }}
          role="listbox"
          aria-label="Select language"
        >
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              role="option"
              aria-selected={l.code === lang}
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-3 px-4 py-2 text-sm transition-colors duration-200 ${
                l.code === lang
                  ? "text-warm-gold"
                  : "text-warm-cream/60 hover:text-warm-cream"
              }`}
            >
              <span>{l.native}</span>
              {l.code === lang && <Check size={14} />}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Change language"
        className="flex items-center gap-2 rounded-full shadow-lg border border-foreground/10 bg-cyan-950 px-4 py-2.5 text-xs font-bold tracking-wider text-warm-gold"
        style={{ backdropFilter: "blur(8px)" }}
      >
        <Globe size={14} />
        {current.label}
      </button>
    </div>
  );
};

export default LanguageSwitcher;
