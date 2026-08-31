import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { useUI } from "@shared/contexts/UIContext";
import { LANGUAGES } from "@shared/i18n/translations";

interface Props {
  /** "floating" (default): fixed bottom-right widget, self-suppresses once a Navbar mounts.
   *  "inline": sits in normal flow (e.g. inside a Navbar), dropdown opens downward. */
  variant?: "floating" | "inline";
  /** Text/icon color classes for the inline trigger. Ignored for the floating variant. */
  triggerClassName?: string;
  /** Which side the dropdown panel opens toward. Defaults to "right". */
  align?: "left" | "right";
}

const LanguageSwitcher = ({ variant = "floating", triggerClassName, align = "right" }: Props) => {
  const { lang, setLang } = useLanguage();
  const { navbarMounted } = useUI();
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

  // A page's own Navbar renders an inline switcher; don't double up with the floating one.
  if (variant === "floating" && navbarMounted) return null;

  const isInline = variant === "inline";
  const panelSide = align === "left" ? "left-0" : "right-0";

  return (
    <div ref={ref} className={isInline ? "relative" : "fixed bottom-6 right-6 z-50"} dir="ltr">
      {open && (
        <div
          className={`absolute ${panelSide} ${isInline ? "top-[calc(100%+12px)]" : "bottom-full mb-2"} w-48 max-h-[60vh] overflow-y-auto rounded-2xl shadow-lg border border-foreground/10 bg-cyan-950 py-1.5 z-50`}
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
        className={
          isInline
            ? `flex items-center gap-1.5 text-sm font-medium tracking-wide transition-colors duration-300 ${triggerClassName ?? ""}`
            : "flex items-center gap-2 rounded-full shadow-lg border border-foreground/10 bg-cyan-950 px-4 py-2.5 text-xs font-bold tracking-wider text-warm-gold"
        }
        style={isInline ? undefined : { backdropFilter: "blur(8px)" }}
      >
        <Globe size={14} />
        {current.label}
        {isInline && (
          <ChevronDown size={13} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        )}
      </button>
    </div>
  );
};

export default LanguageSwitcher;
