import { useState, type FormEvent } from "react";
import AuthLayout from "@/components/AuthLayout";
import SchoolSearch from "@/components/SchoolSearch";
import { useCopy } from "@/lib/i18n";
import { useSession, type Partner } from "@/lib/session";

export default function LoginPage() {
  const { t } = useCopy();
  const { login } = useSession();
  const [school, setSchool] = useState<Partner | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!school) {
      setError(t.pickSchool);
      return;
    }
    setBusy(true);
    try {
      await login(school.id, code);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <AuthLayout chip={t.seasonChipLong} headline={t.heroTitle} body={t.heroBody}>
      <div className="flex flex-col gap-1.5 text-center lg:gap-2 lg:text-start">
        <h1 className="m-0 text-[26px] font-extrabold leading-tight lg:text-[34px]">{t.welcomeBack}</h1>
        <p className="m-0 text-[15px] leading-normal text-ink-muted lg:text-base">{t.loginSub}</p>
      </div>
      <form
        onSubmit={submit}
        noValidate
        className="flex flex-col gap-4 rounded-[20px] bg-white p-5 shadow-[0_4px_20px_rgba(14,35,75,0.07)] lg:gap-5 lg:rounded-3xl lg:p-8 lg:shadow-card"
      >
        <SchoolSearch value={school} onChange={setSchool} />
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <label htmlFor="staff-id" className="label">
              {t.staffId}
            </label>
            <button
              type="button"
              onClick={() => setShowHelp((s) => !s)}
              aria-expanded={showHelp}
              className="text-sm font-semibold text-sky-deep hover:text-navy"
            >
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
          {showHelp && <p className="m-0 rounded-xl bg-sky-wash p-3 text-[13px] leading-normal text-ink-muted">{t.forgotStaffIdHelp}</p>}
        </div>
        {error && (
          <p role="alert" className="m-0 rounded-xl bg-rose-soft px-3.5 py-2.5 text-sm font-semibold text-rose-ink">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy || !code.trim()} className="btn-primary mt-1 w-full">
          {busy ? t.loggingIn : t.logIn}
        </button>
      </form>
      <p className="m-0 text-center text-sm leading-normal text-ink-muted">{t.newPartner}</p>
    </AuthLayout>
  );
}
