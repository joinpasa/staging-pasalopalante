import { useState, type FormEvent } from "react";
import { KeyRound, Loader2, Mail, MailCheck } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import SchoolSearch from "@/components/SchoolSearch";
import { useCopy } from "@/lib/i18n";
import { APPLY_URL, useHubCopy } from "@/lib/hubCopy";
import { callFunction } from "@/lib/portalClient";
import { useSession, type Partner } from "@/lib/session";

/**
 * Sign in. The easy way first: type your email and we send a link if you're a member (so nobody
 * has to know whether they "have an account"). The Kindness ID is the second way in.
 */
export default function LoginPage() {
  const { t } = useCopy();
  const { h, lang } = useHubCopy();
  const { login } = useSession();
  const [mode, setMode] = useState<"email" | "id">("email");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [school, setSchool] = useState<Partner | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  async function sendLink(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await callFunction("partner-auth", { action: "email_link", email: email.trim(), lang });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : h.somethingWrong);
    } finally {
      setBusy(false);
    }
  }

  async function withId(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!school) return setError(t.pickSchool);
    setBusy(true);
    try {
      await login(school.id, code);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <AuthLayout chip={t.seasonChipLong} headline={t.heroTitle} body={t.heroBody}>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-extrabold text-sky-deep">{h.hubName}</span>
        <h1 className="m-0 text-[28px] font-extrabold leading-tight">{h.signInTitle}</h1>
      </div>

      {mode === "email" ? (
        sent ? (
          <div className="flex flex-col gap-4 bg-tint-sky p-5">
            <MailCheck className="h-8 w-8 text-sky" aria-hidden="true" />
            <div>
              <h2 className="m-0 text-xl font-extrabold">{h.checkInbox}</h2>
              <p className="m-0 mt-1 text-[15px] font-medium text-ink2">{h.checkInboxBody(email.trim())}</p>
            </div>
            <button type="button" onClick={() => (setSent(false), setEmail(""))} className="btn-quiet w-fit">
              {h.tryAnother}
            </button>
          </div>
        ) : (
          <form onSubmit={sendLink} className="flex flex-col gap-4" noValidate>
            <p className="m-0 text-[15px] font-medium text-ink-muted">{h.signInSub}</p>
            <label className="flex flex-col gap-1.5" htmlFor="login-email">
              <span className="label">{h.email}</span>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder={h.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field"
              />
            </label>
            {error && (
              <p role="alert" className="m-0 bg-rose-soft px-3.5 py-2.5 text-sm font-semibold text-rose-ink">
                {error}
              </p>
            )}
            <button type="submit" disabled={busy || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())} className="btn-primary w-full">
              {busy ? <Loader2 className="me-2 h-5 w-5 animate-spin" aria-hidden="true" /> : <Mail className="me-2 h-5 w-5" aria-hidden="true" />}
              {busy ? h.sendingLink : h.sendLink}
            </button>
          </form>
        )
      ) : (
        <form onSubmit={withId} noValidate className="flex flex-col gap-4">
          <SchoolSearch value={school} onChange={setSchool} />
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <label htmlFor="staff-id" className="label">
                {t.staffId}
              </label>
              <button type="button" onClick={() => setShowHelp((s) => !s)} aria-expanded={showHelp} className="text-sm font-semibold text-sky-deep hover:text-navy">
                {t.forgotStaffId}
              </button>
            </div>
            <input
              id="staff-id"
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder={t.staffIdPlaceholder}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="field font-semibold tracking-[0.12em]"
            />
            {showHelp && <p className="m-0 bg-tint-sky p-3 text-[13px] leading-normal text-ink-muted">{t.forgotStaffIdHelp}</p>}
          </div>
          {error && (
            <p role="alert" className="m-0 bg-rose-soft px-3.5 py-2.5 text-sm font-semibold text-rose-ink">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy || !code.trim()} className="btn-primary w-full">
            {busy ? t.loggingIn : t.logIn}
          </button>
        </form>
      )}

      <div className="flex flex-col gap-3 border-t-[1.5px] border-hair pt-5">
        <button
          type="button"
          onClick={() => (setMode(mode === "email" ? "id" : "email"), setError(null))}
          className="flex items-center gap-2 text-[15px] font-bold text-sky-deep hover:text-navy"
        >
          {mode === "email" ? <KeyRound className="h-4 w-4" aria-hidden="true" /> : <Mail className="h-4 w-4" aria-hidden="true" />}
          {mode === "email" ? h.orKindnessId : h.sendLink}
        </button>
        <p className="m-0 text-[15px] font-semibold text-ink-muted">
          {h.notMember}{" "}
          <a href={APPLY_URL} target="_blank" rel="noopener noreferrer" className="font-bold text-orange">
            {h.joinUs}
          </a>
        </p>
      </div>
    </AuthLayout>
  );
}
