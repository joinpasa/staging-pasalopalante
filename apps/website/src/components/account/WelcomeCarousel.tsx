import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart } from "lucide-react";
import { COUNTRIES } from "@shared/data/countries";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { cn } from "@shared/lib/utils";

const PLEDGE_PRESETS = [1, 5, 10, 25, 100];
const DEFAULT_PLEDGE = 10;

export interface OnboardingResult {
  pledgeCount: number;
  firstName: string;
  lastName: string;
  country: string;
}

interface WelcomeCarouselProps {
  /** Website signups only ever collect an email + first name, so
   *  lastName/country usually still need asking here. */
  firstName?: string;
  lastName?: string;
  country?: string;
  onFinish: (result: OnboardingResult) => void;
  busy?: boolean;
}

/**
 * Welcome tour shown once right after account creation, on whichever
 * platform (website or app) the account first lands on verified. Mirrors
 * apps/app's OnboardingWalkthrough, styled for the website.
 */
export default function WelcomeCarousel({
  firstName: initialFirstName = "",
  lastName: initialLastName = "",
  country: initialCountry = "",
  onFinish,
  busy,
}: WelcomeCarouselProps) {
  const needsProfile = !initialLastName.trim() || !initialCountry.trim();
  const [step, setStep] = useState(0);
  const [pledge, setPledge] = useState(DEFAULT_PLEDGE);
  const [pledgeText, setPledgeText] = useState(String(DEFAULT_PLEDGE));
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [country, setCountry] = useState(initialCountry);

  const profileStep = 1;
  const pledgeStep = needsProfile ? 2 : 1;
  const readyStep = needsProfile ? 3 : 2;
  const totalSteps = readyStep + 1;

  const commitPledgeText = () => {
    const parsed = Number.parseInt(pledgeText, 10);
    const normalized = Number.isFinite(parsed) ? Math.min(1_000_000_000, Math.max(1, parsed)) : DEFAULT_PLEDGE;
    setPledge(normalized);
    setPledgeText(String(normalized));
    return normalized;
  };

  const complete = () => {
    onFinish({
      pledgeCount: commitPledgeText(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      country,
    });
  };

  const profileIncomplete = needsProfile && (!firstName.trim() || !lastName.trim() || !country);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-5">
      <div className="w-full max-w-sm rounded-2xl bg-background border border-border p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {Array.from({ length: totalSteps }, (_, i) => (
              <span
                key={i}
                className={cn("h-1.5 w-6 rounded-full transition-colors", i === step ? "bg-primary" : "bg-border")}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={complete}
            disabled={busy || profileIncomplete}
            className="text-xs font-semibold text-foreground/60 underline disabled:opacity-60"
          >
            Skip for now
          </button>
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step-welcome"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="mt-6 flex flex-col items-center text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-warm-sand/60">
                <Heart className="h-8 w-8 text-primary" />
              </div>
              <h2 className="mt-4 font-serif text-xl text-foreground">Welcome to Pásalo Pa'lante!</h2>
              <p className="mt-2 text-sm leading-relaxed text-foreground/70">
                You're joining a global chain. Every act of kindness you perform and log inspires
                someone else to pass it forward.
              </p>
            </motion.div>
          )}

          {needsProfile && step === profileStep && (
            <motion.div
              key="step-profile"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="mt-6"
            >
              <h2 className="text-center font-serif text-xl text-foreground">A Little About You</h2>
              <p className="mt-2 text-center text-sm leading-relaxed text-foreground/70">
                Just enough to put you on the map.
              </p>
              <div className="mt-4 space-y-3 text-left">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="welcome-first-name">First name</Label>
                    <Input id="welcome-first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
                  </div>
                  <div>
                    <Label htmlFor="welcome-last-name">Last name</Label>
                    <Input id="welcome-last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="welcome-country">Country</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger id="welcome-country">
                      <SelectValue placeholder="Select your country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </motion.div>
          )}

          {step === pledgeStep && (
            <motion.div
              key="step-pledge"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="mt-6 text-center"
            >
              <h2 className="font-serif text-xl text-foreground">Choose Your First Pledge</h2>
              <p className="mt-2 text-sm leading-relaxed text-foreground/70">
                How many acts of kindness would you like to commit to starting with?
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {PLEDGE_PRESETS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => { setPledge(n); setPledgeText(String(n)); }}
                    className={cn(
                      "min-w-[3.25rem] rounded-full border px-3 py-2 text-sm font-medium transition-colors",
                      pledge === n
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-primary",
                    )}
                  >
                    {n}
                  </button>
                ))}
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={1_000_000_000}
                  value={pledgeText}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setPledgeText(raw);
                    const parsed = Number.parseInt(raw, 10);
                    if (Number.isFinite(parsed)) setPledge(Math.min(1_000_000_000, Math.max(1, parsed)));
                  }}
                  onBlur={commitPledgeText}
                  aria-label="Custom number of acts"
                  className="w-24 text-center"
                />
              </div>
            </motion.div>
          )}

          {step === readyStep && (
            <motion.div
              key="step-ready"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="mt-6 flex flex-col items-center text-center"
            >
              <h2 className="font-serif text-xl text-foreground">Ready to Pass it Forward?</h2>
              <p className="mt-2 text-sm leading-relaxed text-foreground/70">
                Share an act whenever you complete one, or check the Wall to see kindness spreading
                worldwide.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-6">
          {step < readyStep ? (
            <Button
              type="button"
              className="w-full"
              disabled={step === profileStep && profileIncomplete}
              onClick={() => {
                if (step === profileStep && profileIncomplete) return;
                if (step === pledgeStep) commitPledgeText();
                setStep((s) => s + 1);
              }}
            >
              Next
            </Button>
          ) : (
            <Button type="button" className="w-full" disabled={busy} onClick={complete}>
              {busy ? "Setting up…" : "Get Started"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
