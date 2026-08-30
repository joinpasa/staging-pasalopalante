import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link2, ScanLine, LayoutGrid, Radio } from "lucide-react";
import { cn } from "@shared/lib/utils";

const PLEDGE_PRESETS = [1, 5, 10, 25, 100];
const DEFAULT_PLEDGE = 10;

interface OnboardingWalkthroughProps {
  /** Called once, with the chosen pledge count, when the tour finishes or is skipped. */
  onFinish: (pledgeCount: number) => void;
  busy?: boolean;
}

/**
 * 3-step welcome tour shown once right after account creation. Step 2 is
 * where the pledge count is actually chosen — moved here from the signup
 * form so account creation stays a single quick step.
 */
export default function OnboardingWalkthrough({ onFinish, busy }: OnboardingWalkthroughProps) {
  const [step, setStep] = useState(0);
  const [pledge, setPledge] = useState(DEFAULT_PLEDGE);
  const [pledgeText, setPledgeText] = useState(String(DEFAULT_PLEDGE));

  const commitPledgeText = () => {
    const parsed = Number.parseInt(pledgeText, 10);
    const normalized = Number.isFinite(parsed) ? Math.min(1_000_000_000, Math.max(1, parsed)) : DEFAULT_PLEDGE;
    setPledge(normalized);
    setPledgeText(String(normalized));
    return normalized;
  };

  const skip = () => onFinish(commitPledgeText());
  const finish = () => onFinish(commitPledgeText());

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-5">
      <div className="w-full max-w-sm rounded-2xl bg-app-surface p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 w-6 rounded-full transition-colors",
                  i === step ? "bg-app-coral" : "bg-border",
                )}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={skip}
            disabled={busy}
            className="text-xs font-semibold text-muted-foreground underline disabled:opacity-60"
          >
            Skip for now
          </button>
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="mt-6 flex flex-col items-center text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-app-coral-tint">
                <Link2 className="h-8 w-8 text-app-coral" />
              </div>
              <h2 className="mt-4 font-sans text-xl font-extrabold text-foreground">
                Welcome to Pásalo Pa'lante!
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                You're joining a global chain. Every act of kindness you perform and log inspires
                someone else to pass it forward.
              </p>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="mt-6 text-center"
            >
              <h2 className="font-sans text-xl font-extrabold text-foreground">
                Choose Your First Pledge
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                How many acts of kindness would you like to commit to starting with?
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {PLEDGE_PRESETS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      setPledge(n);
                      setPledgeText(String(n));
                    }}
                    className={cn(
                      "min-w-[3.25rem] rounded-full border px-3 py-2 text-sm font-semibold transition-colors",
                      pledge === n
                        ? "border-app-coral bg-app-coral text-app-surface"
                        : "border-border bg-app-canvas text-foreground",
                    )}
                  >
                    {n}
                  </button>
                ))}
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={1_000_000_000}
                  value={pledgeText}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setPledgeText(raw);
                    const parsed = Number.parseInt(raw, 10);
                    if (Number.isFinite(parsed)) {
                      setPledge(Math.min(1_000_000_000, Math.max(1, parsed)));
                    }
                  }}
                  onBlur={commitPledgeText}
                  aria-label="Custom number of acts"
                  className="w-24 rounded-xl border border-border bg-app-canvas px-3 py-2 text-center text-sm text-foreground outline-none focus:border-app-coral"
                />
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="mt-6 flex flex-col items-center text-center"
            >
              <h2 className="font-sans text-xl font-extrabold text-foreground">
                Ready to Pass it Forward?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Tap Pass whenever you complete an act, or check the Wall and Map to see kindness
                spreading worldwide.
              </p>
              <div className="mt-5 flex items-center gap-6 rounded-2xl border border-app-coral bg-app-coral-tint px-6 py-4">
                <div className="flex flex-col items-center gap-1">
                  <LayoutGrid className="h-5 w-5 text-app-coral" />
                  <span className="text-[11px] font-semibold text-app-coral">Wall</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-app-coral shadow">
                    <ScanLine className="h-5 w-5 text-app-surface" />
                  </span>
                  <span className="text-[11px] font-semibold text-app-coral">Pass</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Radio className="h-5 w-5 text-app-coral" />
                  <span className="text-[11px] font-semibold text-app-coral">Map</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-6">
          {step < 2 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1) commitPledgeText();
                setStep((s) => s + 1);
              }}
              className="flex h-12 w-full items-center justify-center rounded-2xl bg-app-coral font-semibold text-app-surface"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              disabled={busy}
              className="flex h-12 w-full items-center justify-center rounded-2xl bg-app-coral font-semibold text-app-surface disabled:opacity-60"
            >
              {busy ? "Setting up…" : "Get Started"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
