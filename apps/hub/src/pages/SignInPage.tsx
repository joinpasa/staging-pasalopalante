import { useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PauseMark } from "@/components/bits";
import { HUB_LIVE, hubDb } from "@/lib/client";
import { useHub } from "@/lib/hub";
import { asset } from "@/lib/base";

/** Supabase's sign-in errors, in the hub's own words. */
function plain(message: string): string {
  if (/invalid login credentials/i.test(message)) return "That email and password don't match. Check them, or ask for a code instead.";
  if (/email not confirmed/i.test(message)) return "That email has not been confirmed yet. Ask for a code instead and the hub will confirm it.";
  if (/signups not allowed|user not found|otp.*disabled/i.test(message)) return "There is no account with that email yet. Create one on pasalopalante.com first, with the email the team added to the hub.";
  if (/expired|invalid.*token|token.*invalid/i.test(message)) return "That code didn't work or has run out. Ask for a new one.";
  if (/rate limit|too many|security purposes/i.test(message)) return "Too many tries in a short time. Wait a minute and try again.";
  // the site's email sender (a Supabase hook) can be slow to wake, for example right after a deploy
  if (/hook|maximum time|sending.*email|email.*send/i.test(message)) return "The email with your code didn't go out just now. Wait a minute and press Email me a code again.";
  return "That didn't work. Check your connection and try again.";
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-5 py-10">
      <div className="w-full max-w-[440px]">
        <img src={asset("kf-logo.webp")} alt="Kindness Forward" className="mb-6 h-9" />
        <div className="rounded-2xl border border-line bg-white p-6 md:p-8">{children}</div>
      </div>
    </div>
  );
}

function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"password" | "code">("password");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [note, setNote] = useState("");

  const run = async (fn: () => Promise<{ error: { message: string } | null }>, after?: () => void) => {
    setBusy(true);
    setProblem("");
    const { error } = await fn();
    setBusy(false);
    if (error) setProblem(plain(error.message));
    else after?.();
  };

  const withPassword = (e: React.FormEvent) => {
    e.preventDefault();
    void run(() => hubDb.auth.signInWithPassword({ email: email.trim(), password }));
  };
  const sendCode = () => {
    if (!email.trim()) return setProblem("Type your email first.");
    void run(
      () => hubDb.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } }),
      () => {
        setStep("code");
        setNote(`A code is on its way to ${email.trim()}. It can take a minute.`);
      },
    );
  };
  const withCode = (e: React.FormEvent) => {
    e.preventDefault();
    void run(() => hubDb.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" }));
  };

  return (
    <Frame>
      <p className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-ink-muted">
        <PauseMark className="h-3.5" /> Kindness Hub
      </p>
      <h1 className="text-[28px] font-extrabold leading-tight tracking-[-0.025em]">Sign in</h1>
      <p className="mt-1.5 text-[15px] leading-relaxed text-ink-muted">Use the email the team added to the hub. It is the same account you use on pasalopalante.com.</p>
      <form onSubmit={step === "password" ? withPassword : withCode} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="field" />
        </div>
        {step === "password" ? (
          <div>
            <label htmlFor="password" className="label">
              Password
            </label>
            <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="field" />
          </div>
        ) : (
          <div>
            <label htmlFor="code" className="label">
              The code from your email
            </label>
            <input id="code" inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} className="field tracking-[0.2em]" />
          </div>
        )}
        {note && !problem && <p className="text-[13.5px] leading-relaxed text-ink-muted">{note}</p>}
        {problem && (
          <p role="alert" className="text-[13.5px] font-semibold leading-relaxed text-rose-ink">
            {problem}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "One moment" : "Sign in"}
          </button>
          {step === "password" ? (
            <button type="button" className="btn-ghost" disabled={busy} onClick={sendCode}>
              Email me a code instead
            </button>
          ) : (
            <button
              type="button"
              className="btn-ghost"
              disabled={busy}
              onClick={() => {
                setStep("password");
                setNote("");
                setProblem("");
              }}
            >
              Use my password
            </button>
          )}
        </div>
      </form>
    </Frame>
  );
}

function NotAdded({ email }: { email: string }) {
  return (
    <Frame>
      <PauseMark className="mb-5 h-9" />
      <h1 className="text-[26px] font-extrabold leading-tight tracking-[-0.025em]">You're signed in, but not in the hub yet</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
        The hub is for the marketing team. Ask a hub admin to add <span className="font-semibold text-ink">{email}</span> in Settings, then come back to this page.
      </p>
      <div className="mt-6 flex gap-2">
        <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
          Try again
        </button>
        <button type="button" className="btn-ghost" onClick={() => void hubDb.auth.signOut()}>
          Use another email
        </button>
      </div>
    </Frame>
  );
}

/** In the live hub, everything inside waits for a signed-in team member. In the preview it lets everyone straight through. */
export function Gate({ children }: { children: ReactNode }) {
  const { store } = useHub();
  const qc = useQueryClient();
  const [email, setEmail] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!HUB_LIVE) return;
    void hubDb.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null));
    const { data } = hubDb.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
      void store.reset().then(() => qc.invalidateQueries({ queryKey: ["hub"] }));
    });
    return () => data.subscription.unsubscribe();
  }, [store, qc]);

  const me = useQuery({ queryKey: ["hub", "me", email ?? ""], queryFn: () => store.me(), enabled: HUB_LIVE && !!email, retry: false });

  if (!HUB_LIVE) return <>{children}</>;
  if (email === undefined || (email && me.isLoading)) return <div className="min-h-screen bg-paper" />;
  if (!email) return <SignIn />;
  if (me.isError) return <NotAdded email={email} />;
  return <>{children}</>;
}

export const signOut = () => hubDb.auth.signOut();
