import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, Mail } from "lucide-react";

import PasaMark from "@/components/app/PasaMark";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { COUNTRIES } from "@/data/countries";
import { cn } from "@/lib/utils";

const PLEDGE_PRESETS = [1, 5, 10, 25, 100];

/**
 * Sign-up and sign-in for the installed app.
 *
 * Joining works exactly like the website: you commit to a number of acts of
 * kindness, which creates your commitment record and emails a link that signs
 * you in. People who already have an account can log in with a password or ask
 * for a fresh link.
 */
export default function AppJoin() {
  const { signIn, signInWithMagicLink } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"join" | "login">("join");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [pledge, setPledge] = useState(10);
  const [pledgeText, setPledgeText] = useState("10");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return toast.error("Please add your name.");
    if (!country) return toast.error("Please pick your country.");
    if (!agreed) return toast.error("Please accept the terms to continue.");

    const parsedPledge = Number.parseInt(pledgeText, 10);
    const submittedPledge = Number.isFinite(parsedPledge)
      ? Math.min(1000000000, Math.max(1, parsedPledge))
      : 1;
    setPledge(submittedPledge);
    setPledgeText(String(submittedPledge));

    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("submit-commitment", {
        body: {
          type: "individual",
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          pledge_count: submittedPledge,
          country,
          help_role: "do_acts",
        },
      });
      const failure = (data as { error?: string } | null)?.error ?? error?.message;
      if (failure) {
        toast.error(failure);
        return;
      }
      await signInWithMagicLink(email.trim(), firstName.trim());
      setSentTo(email.trim());
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await signIn(loginEmail.trim(), loginPassword);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate("/app", { replace: true });
  }

  async function handleMagicLogin() {
    if (!loginEmail.trim()) return toast.error("Enter your email first.");
    setBusy(true);
    const { error } = await signInWithMagicLink(loginEmail.trim());
    setBusy(false);
    if (error) toast.error(error.message);
    else setSentTo(loginEmail.trim());
  }

  if (sentTo) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
        <CheckCircle2 className="h-12 w-12 text-app-coral" />
        <h1 className="font-sans text-2xl font-extrabold text-foreground">Check your email</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We sent a sign-in link to <span className="font-semibold text-foreground">{sentTo}</span>.
          Open it on this phone and the app will be signed in.
        </p>
        <button
          type="button"
          onClick={() => setSentTo(null)}
          className="text-sm font-semibold text-app-coral underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 pt-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-app-coral-tint">
          <PasaMark className="h-7 w-7" tile={false} />
        </div>
        <div>
          <h1 className="font-sans text-2xl font-extrabold leading-tight text-foreground">
            Join the chain
          </h1>
          <p className="text-xs text-muted-foreground">
            Commit to acts of kindness and pass it forward.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 rounded-full bg-app-surface p-1">
        {([
          ["join", "I'm new"],
          ["login", "I have an account"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            aria-pressed={tab === value}
            className={cn(
              "rounded-full py-2 text-sm font-semibold transition-colors",
              tab === value ? "bg-app-coral text-app-surface" : "text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "join" ? (
        <form onSubmit={handleJoin} className="mt-5 space-y-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name">
              <input
                required
                maxLength={60}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
                className={inputClass}
              />
            </Field>
            <Field label="Last name">
              <input
                required
                maxLength={60}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Email">
            <input
              required
              type="email"
              maxLength={200}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className={inputClass}
            />
          </Field>

          <Field label="Country">
            <select
              required
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className={inputClass}
            >
              <option value="">Select your country</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              My commitment
            </p>
            <p className="mt-1 text-sm text-foreground">
              How many acts of kindness will you pass forward?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
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
                      : "border-border bg-app-surface text-foreground",
                  )}
                >
                  {n}
                </button>
              ))}
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={1000000000}
                value={pledgeText}
                onChange={(e) => {
                  const raw = e.target.value;
                  setPledgeText(raw);
                  const parsed = Number.parseInt(raw, 10);
                  if (Number.isFinite(parsed)) {
                    setPledge(Math.min(1000000000, Math.max(1, parsed)));
                  }
                }}
                onBlur={() => {
                  const parsed = Number.parseInt(pledgeText, 10);
                  const normalized = Number.isFinite(parsed)
                    ? Math.min(1000000000, Math.max(1, parsed))
                    : 1;
                  setPledge(normalized);
                  setPledgeText(String(normalized));
                }}
                aria-label="Custom number of acts"
                className={cn(inputClass, "w-24")}
              />
            </div>
          </div>

          <label className="flex items-start gap-2 text-xs leading-relaxed text-foreground/80">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-app-coral"
            />
            <span>
              I agree to the{" "}
              <Link to="/terms" className="underline">
                terms
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="underline">
                privacy policy
              </Link>
              .
            </span>
          </label>

          <button
            type="submit"
            disabled={busy}
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-app-coral font-semibold text-app-surface disabled:opacity-60"
          >
            {busy ? "Sending…" : `Commit to ${pledge} acts & join`}
          </button>
        </form>
      ) : (
        <form onSubmit={handleLogin} className="mt-5 space-y-4 pb-4">
          <Field label="Email">
            <input
              required
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              autoComplete="email"
              className={inputClass}
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              autoComplete="current-password"
              className={inputClass}
            />
          </Field>
          <button
            type="submit"
            disabled={busy}
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-app-coral font-semibold text-app-surface disabled:opacity-60"
          >
            {busy ? "…" : "Log in"}
          </button>
          <button
            type="button"
            onClick={handleMagicLogin}
            disabled={busy}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-app-surface text-sm font-semibold text-foreground"
          >
            <Mail className="h-4 w-4" />
            Email me a sign-in link
          </button>
        </form>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-border bg-app-surface px-3 py-3 text-sm text-foreground outline-none focus:border-app-coral";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
