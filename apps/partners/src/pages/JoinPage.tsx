import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Check, Copy, Lock } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { useCopy } from "@/lib/i18n";
import { portal } from "@/lib/portalClient";
import { formatStaffCode, useSession, type Partner } from "@/lib/session";

/** Invite link (/join/:token): name in, Staff ID out. */
export default function JoinPage() {
  const { token = "" } = useParams();
  const { t } = useCopy();
  const { join } = useSession();
  const navigate = useNavigate();
  const [school, setSchool] = useState<Partner | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staffCode, setStaffCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    portal.rpc("partner_invite_info", { _token: token }).then(({ data }) => {
      setSchool(((data ?? []) as Partner[])[0] ?? null);
    });
  }, [token]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      setStaffCode(await join(token, name.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const schoolLine = school ? [school.name, school.city].filter(Boolean).join(" · ") : "";

  return (
    <AuthLayout chip={t.invited} headline={t.joinHero(school?.name ?? "")} body={t.joinHeroBody}>
      {staffCode ? (
        <div className="flex flex-col gap-5 rounded-3xl bg-white p-6 text-center shadow-card lg:p-8">
          <span className="text-xs font-bold tracking-[0.08em] text-ink-muted">{t.yourStaffId.toUpperCase()}</span>
          <span className="whitespace-nowrap text-[32px] font-extrabold tracking-[0.1em] text-navy sm:text-[40px]">{formatStaffCode(staffCode)}</span>
          <p className="m-0 rounded-xl bg-sun-soft p-3.5 text-sm font-semibold leading-normal text-sun-ink">{t.saveStaffId}</p>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard?.writeText(formatStaffCode(staffCode));
              setCopied(true);
            }}
            className="btn-secondary w-full gap-2"
          >
            {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
            {copied ? t.copied : t.copy}
          </button>
          <button type="button" onClick={() => navigate("/", { replace: true })} className="btn-primary w-full">
            {t.continueDash}
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1.5 text-center lg:gap-2 lg:text-start">
            <h1 className="m-0 text-[26px] font-extrabold leading-tight lg:text-[34px]">{t.createAccount}</h1>
            <p className="m-0 text-[15px] text-ink-muted lg:text-base">{t.createSub}</p>
          </div>
          {school === null ? (
            <p role="alert" className="m-0 rounded-2xl bg-rose-soft p-5 text-[15px] font-semibold text-rose-ink">
              {t.badInvite}
            </p>
          ) : (
            <form
              onSubmit={submit}
              className="flex flex-col gap-4 rounded-[20px] bg-white p-5 shadow-[0_4px_20px_rgba(14,35,75,0.07)] lg:gap-5 lg:rounded-3xl lg:p-8 lg:shadow-card"
            >
              <div className="flex flex-col gap-2">
                <label htmlFor="join-school" className="label">
                  {t.school}
                </label>
                <div className="relative flex items-center">
                  <input
                    id="join-school"
                    type="text"
                    readOnly
                    aria-readonly="true"
                    value={schoolLine}
                    className="field border-line-soft bg-sand pe-11 font-semibold"
                  />
                  <Lock className="absolute end-4 h-[18px] w-[18px] text-ink-muted" aria-hidden="true" />
                </div>
                <span className="text-xs text-ink-muted">{t.setByInvite}</span>
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="join-name" className="label">
                  {t.fullName}
                </label>
                <input
                  id="join-name"
                  type="text"
                  autoComplete="name"
                  placeholder={t.fullNamePlaceholder}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={120}
                  className="field"
                />
              </div>
              {error && (
                <p role="alert" className="m-0 rounded-xl bg-rose-soft px-3.5 py-2.5 text-sm font-semibold text-rose-ink">
                  {error}
                </p>
              )}
              <button type="submit" disabled={busy || !name.trim() || !school} className="btn-primary mt-1 w-full">
                {busy ? t.creating : t.createBtn}
              </button>
            </form>
          )}
          <p className="m-0 text-center text-sm text-ink-muted">
            {t.haveAccount}{" "}
            <Link to="/login" className="font-bold text-sky-deep no-underline">
              {t.logInLink}
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
