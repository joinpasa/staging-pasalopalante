import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Check, Copy, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { useCopy } from "@/lib/i18n";
import { useHubCopy } from "@/lib/hubCopy";
import { formatStaffCode, useSession } from "@/lib/session";

/** /link/:token, from the sign-in email. The first time, it asks for the person's name. */
export default function LinkPage() {
  const { token = "" } = useParams();
  const { t } = useCopy();
  const { h } = useHubCopy();
  const { redeemLink } = useSession();
  const navigate = useNavigate();
  const [state, setState] = useState<"checking" | "name" | "code" | "error">("checking");
  const [org, setOrg] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    redeemLink(token)
      .then((r) => {
        if ("partnerName" in r) {
          setOrg(r.partnerName);
          setState("name");
        } else navigate("/", { replace: true });
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : h.somethingWrong);
        setState("error");
      });
  }, [token, redeemLink, navigate, h.somethingWrong]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const r = await redeemLink(token, name.trim());
      if ("staffCode" in r && r.staffCode) {
        setCode(r.staffCode);
        setState("code");
      } else navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : h.somethingWrong);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout chip={t.seasonChipLong} headline={t.heroTitle} body={t.heroBody}>
      {state === "checking" && (
        <p className="m-0 flex items-center gap-3 text-lg font-bold">
          <Loader2 className="h-6 w-6 animate-spin text-sky" aria-hidden="true" />
          {h.linkChecking}
        </p>
      )}
      {state === "name" && (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <h1 className="m-0 text-2xl font-extrabold">{h.linkName}</h1>
            <p className="m-0 mt-1 text-[15px] font-medium text-ink-muted">{h.linkNameSub(org)}</p>
          </div>
          <input id="link-name" className="field" autoComplete="name" placeholder={t.fullNamePlaceholder} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoFocus />
          {error && <p className="m-0 bg-rose-soft px-3 py-2 text-sm font-semibold text-rose-ink">{error}</p>}
          <button type="submit" disabled={busy || !name.trim()} className="btn-primary w-full">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : h.continue}
          </button>
        </form>
      )}
      {state === "code" && (
        <div className="flex flex-col gap-4">
          <h1 className="m-0 text-2xl font-extrabold">{t.yourStaffId}</h1>
          <div className="flex items-center justify-between gap-3 bg-tint-gold px-4 py-4">
            <span className="text-2xl font-extrabold tracking-[0.12em]">{formatStaffCode(code)}</span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(formatStaffCode(code)).catch(() => undefined);
                setCopied(true);
              }}
              className="btn-soft h-9 px-3 text-sm"
            >
              {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              {copied ? t.copied : t.copy}
            </button>
          </div>
          <p className="m-0 text-[14px] font-medium text-ink-muted">{t.saveStaffId}</p>
          <button type="button" onClick={() => navigate("/", { replace: true })} className="btn-primary w-full">
            {h.continue}
          </button>
        </div>
      )}
      {state === "error" && (
        <div className="flex flex-col gap-4">
          <p role="alert" className="m-0 bg-rose-soft px-4 py-3 text-[15px] font-semibold text-rose-ink">
            {error}
          </p>
          <Link to="/login" className="btn-primary w-full no-underline">
            {h.newLink}
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}
