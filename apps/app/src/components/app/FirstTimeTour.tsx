import { cn } from "@shared/lib/utils";

const STEPS = [
  {
    title: "Your menu, always one tap away",
    body: "Tap your avatar anytime for Account Settings, Get Support, Report an Issue, or to log out.",
  },
  {
    title: "Your Kindness code lives here",
    body: "This is your personal QR code. Share it so someone can pass kindness straight to you.",
  },
  {
    title: "Logging an act is this easy",
    body: "Whenever you do something kind, tap this card. Pick what you did and you're done in seconds.",
  },
];

interface Props {
  step: number;
  dontShow: boolean;
  onToggleDontShow: () => void;
  onNext: () => void;
  /** Fired by "Skip tour" at any step, or "Get Started" on the last one —
   *  both end the tour the same way (dismissal always persists either way;
   *  the checkbox is a reassurance, not a gate, since a tour someone just
   *  finished or explicitly skipped shouldn't come back regardless). */
  onExit: () => void;
}

/**
 * The dashboard's first-time coach-mark overlay — a dim scrim plus a
 * tooltip panel above the bottom nav. Doesn't redraw the dashboard itself
 * (unlike the static prototype mockup, which had to fake a duplicate since
 * it couldn't reference another live screen) — AppHome raises the real
 * account menu / Share QR pill / quick-log card above this scrim with a
 * glow ring for whichever one is current, driven by the same `step` this
 * component renders.
 */
export default function FirstTimeTour({ step, dontShow, onToggleDontShow, onNext, onExit }: Props) {
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-app-ink/40" aria-hidden="true" />

      <div
        role="dialog"
        aria-label="First-time tour"
        className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 rounded-[20px] bg-app-surface p-[18px] shadow-2xl"
      >
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-app-coral">
            Step {step + 1} of {STEPS.length}
          </p>
          <button type="button" onClick={onExit} className="text-[11.5px] font-bold text-app-ink/40">
            Skip tour
          </button>
        </div>

        <p className="mb-1.5 text-base font-bold text-foreground">{current.title}</p>
        <p className="mb-3.5 text-[13px] leading-relaxed text-muted-foreground">{current.body}</p>

        {isLast && (
          <label className="mb-3.5 flex items-center gap-2.5 text-[12.5px] text-foreground">
            <input
              type="checkbox"
              checked={dontShow}
              onChange={onToggleDontShow}
              className="h-[17px] w-[17px] accent-app-coral"
            />
            Don't show this tour again
          </label>
        )}

        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={cn("h-1.5 w-1.5 rounded-full", i === step ? "bg-app-coral" : "bg-app-ink/[0.18]")}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={isLast ? onExit : onNext}
            className="rounded-xl bg-app-coral px-5 py-2.5 text-[13.5px] font-bold text-app-surface"
          >
            {isLast ? "Get Started" : "Next"}
          </button>
        </div>
      </div>
    </>
  );
}
