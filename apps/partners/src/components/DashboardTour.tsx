import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useCopy } from "@/lib/i18n";

export interface TourStep {
  /** data-tour value of the element to spotlight; omit for a centered card. */
  target?: string;
  title: string;
  body: string;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 8;
const CARD_W = 340;

/** The first *visible* element with this data-tour (desktop and mobile versions can both exist). */
function findTarget(name: string): HTMLElement | null {
  const all = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`));
  return all.find((el) => el.offsetParent !== null && el.getClientRects().length > 0) ?? null;
}

/**
 * Spotlight walkthrough: dims the page, cuts a rounded hole around the
 * current step's element and shows a card next to it. Steps whose element
 * isn't on screen (e.g. the act menu when there are no acts) are skipped.
 */
export default function DashboardTour({ steps, onClose }: { steps: TourStep[]; onClose: () => void }) {
  const { t } = useCopy();
  const visibleSteps = steps.filter((s) => !s.target || findTarget(s.target));
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const step = visibleSteps[i];
  const last = i === visibleSteps.length - 1;

  const measure = useCallback(() => {
    if (!step?.target) return setRect(null);
    const el = findTarget(step.target);
    if (!el) return setRect(null);
    const r = el.getBoundingClientRect();
    setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
  }, [step]);

  // Bring the element into view, then measure once scrolling settles.
  useLayoutEffect(() => {
    if (step?.target) findTarget(step.target)?.scrollIntoView({ block: "center", behavior: "smooth" });
    measure();
    const id = window.setTimeout(measure, 350);
    return () => window.clearTimeout(id);
  }, [step, measure]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure]);

  useEffect(() => {
    cardRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((n) => Math.min(n + 1, visibleSteps.length - 1));
      if (e.key === "ArrowLeft") setI((n) => Math.max(n - 1, 0));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, visibleSteps.length, i]);

  if (!step) return null;

  // Card placement: below the target if there's room, else above; centered when no target.
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const narrow = vw < 640;
  const cardW = Math.min(CARD_W, vw - 32);
  let cardStyle: React.CSSProperties;
  if (!rect) {
    cardStyle = { top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: cardW };
  } else if (narrow) {
    // Phones: dock to whichever screen half the spotlight isn't in.
    const targetInTop = rect.top + rect.height / 2 < vh / 2;
    cardStyle = targetInTop ? { bottom: 16, left: 16, right: 16 } : { top: 16, left: 16, right: 16 };
  } else {
    const below = rect.top + rect.height + 12;
    const fitsBelow = below + 220 < vh;
    const left = Math.min(Math.max(16, rect.left + rect.width / 2 - cardW / 2), vw - cardW - 16);
    cardStyle = fitsBelow
      ? { top: below, left, width: cardW }
      : { top: Math.max(16, rect.top - 12 - 220), left, width: cardW };
  }

  return createPortal(
    <div className="fixed inset-0 z-[60]" aria-live="polite">
      {/* Dim layer with a hole: a huge box-shadow around the spotlight box. */}
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-2xl ring-4 ring-sun transition-all duration-300"
          style={{ ...rect, boxShadow: "0 0 0 9999px rgba(14,35,75,0.62)" }}
        />
      ) : (
        <div className="fixed inset-0 bg-navy/60" />
      )}
      {/* Clicks outside the card don't fall through to the page. */}
      <div className="fixed inset-0" onClick={(e) => e.stopPropagation()} />
      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        className="fixed flex flex-col gap-3 rounded-2xl bg-white p-5 text-ink shadow-[0_16px_48px_rgba(14,35,75,0.35)] outline-none"
        style={cardStyle}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="text-xs font-bold tracking-[0.08em] text-sun-ink">
            {t.tourStep(i + 1, visibleSteps.length)}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.tourSkip}
            className="-me-2 -mt-2 flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-canvas"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <h2 id="tour-title" className="m-0 text-lg font-extrabold leading-snug">
          {step.title}
        </h2>
        <p className="m-0 text-[15px] leading-relaxed text-ink-muted">{step.body}</p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <button type="button" onClick={onClose} className="text-sm font-semibold text-ink-muted hover:text-navy">
            {t.tourSkip}
          </button>
          <div className="flex gap-2">
            {i > 0 && (
              <button
                type="button"
                onClick={() => setI(i - 1)}
                className="h-10 rounded-xl border-[1.5px] border-line px-4 text-sm font-bold text-navy hover:bg-canvas"
              >
                {t.tourBack}
              </button>
            )}
            <button
              type="button"
              onClick={() => (last ? onClose() : setI(i + 1))}
              className="h-10 rounded-xl bg-orange px-5 text-sm font-bold text-white shadow-cta"
            >
              {last ? t.tourDone : t.tourNext}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
