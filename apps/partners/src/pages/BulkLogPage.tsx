import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Image as ImageIcon,
  Link2,
  Play,
  Plus,
  RotateCw,
  Trash2,
  Upload,
} from "lucide-react";
import PortalHeader from "@/components/PortalHeader";
import EmailField from "@/components/EmailField";
import { useSubmitterEmail } from "@/lib/useSubmitterEmail";
import { useCopy } from "@/lib/i18n";
import { todayISO } from "@/lib/season";
import { isValidLink, useSubmitActs } from "@/lib/submissions";
import { ACCEPT_ATTR } from "@/lib/upload";
import type { UploadedMedia } from "@/lib/upload";
import { useUploads } from "@/lib/useUploads";

interface Row {
  id: number;
  description: string;
  link: string;
  people: number;
  date: string;
}

interface RowMedia {
  uploaded: UploadedMedia[];
  busy: boolean;
  failed: number;
  hasFiles: boolean;
}

const EMPTY_MEDIA: RowMedia = { uploaded: [], busy: false, failed: 0, hasFiles: false };

function newRow(id: number): Row {
  return { id, description: "", link: "", people: 1, date: todayISO() };
}

/** One file slot per row, in its design states: empty → uploading → done / failed. */
function RowUpload({ onMedia }: { onMedia: (m: RowMedia) => void }) {
  const { t } = useCopy();
  const uploads = useUploads();
  const inputRef = useRef<HTMLInputElement>(null);
  const item = uploads.items[0];

  useEffect(() => {
    onMedia({
      uploaded: uploads.uploaded,
      busy: uploads.busy,
      failed: uploads.failed,
      hasFiles: uploads.items.length > 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploads.items]);

  const picker = (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPT_ATTR}
      className="hidden"
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) {
          if (item) uploads.remove(item.key);
          uploads.add([f]);
        }
        e.target.value = "";
      }}
    />
  );

  if (!item) {
    return (
      <>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-sky/60 bg-sky-wash px-3 text-sm font-bold text-sky-deep hover:border-sky"
        >
          <Upload className="h-[18px] w-[18px]" aria-hidden="true" />
          {t.uploadMedia}
        </button>
        {picker}
      </>
    );
  }

  if (item.state === "uploading") {
    return (
      <div className="flex h-[52px] flex-col justify-center gap-1 rounded-xl border-[1.5px] border-line-soft bg-white px-3">
        <div className="flex justify-between gap-2 text-xs font-semibold">
          <span className="truncate">{item.name}</span>
          <span className="text-sky-deep">{item.progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-track">
          <div className="h-1.5 rounded-full bg-sky transition-[width]" style={{ width: `${item.progress}%` }} />
        </div>
      </div>
    );
  }

  if (item.state === "failed") {
    return (
      <div className="flex min-h-[52px] items-start gap-2 rounded-xl border-[1.5px] border-rose/40 bg-rose-soft px-3 py-2">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose" aria-hidden="true" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-xs font-bold text-rose-ink">
            {t.uploadFailed} · {item.name}
          </span>
          <span role="alert" className="text-xs leading-snug text-navy">
            {item.reason ? t.uploadErrors[item.reason] : t.uploadFailed}
          </span>
        </div>
        <button
          type="button"
          // A wrong type or too-big file can't succeed on retry — pick a different file instead.
          onClick={() => (item.reason === "type" || item.reason === "size" ? inputRef.current?.click() : uploads.retry(item.key))}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-rose px-3 text-xs font-bold text-white"
        >
          <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
          {item.reason === "type" || item.reason === "size" ? t.chooseAnother : t.retry}
        </button>
        {picker}
      </div>
    );
  }

  return (
    <div className="flex h-[52px] items-center gap-2.5 rounded-xl border-[1.5px] border-line-soft bg-white px-2">
      <div
        className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${item.isVideo ? "bg-navy/90" : "bg-[#FFF1E8]"}`}
      >
        {item.isVideo ? (
          <Play className="h-4 w-4 fill-white text-white" aria-hidden="true" />
        ) : (
          <ImageIcon className="h-5 w-5 text-orange" aria-hidden="true" />
        )}
        <span className="absolute -bottom-1 -end-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-sky">
          <Check className="h-2.5 w-2.5 text-white" strokeWidth={4} aria-hidden="true" />
        </span>
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex min-w-0 flex-1 flex-col text-start"
        title={t.uploadMedia}
      >
        <span className="truncate text-xs font-bold">{item.name}</span>
        <span className="text-xs text-sky-ink">{t.uploadComplete}</span>
      </button>
      {picker}
    </div>
  );
}

export default function BulkLogPage() {
  const { t, locale } = useCopy();
  const navigate = useNavigate();
  const submit = useSubmitActs();
  const nextId = useRef(4);
  const [rows, setRows] = useState<Row[]>(() => [newRow(1), newRow(2), newRow(3)]);
  const [media, setMedia] = useState<Record<number, RowMedia>>({});
  const [consent, setConsent] = useState(true);
  const submitter = useSubmitterEmail();
  const [error, setError] = useState<string | null>(null);

  const update = (id: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: number) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : [newRow(nextId.current++)]));
    setMedia((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };
  const addRow = () => setRows((prev) => [...prev, newRow(nextId.current++)]);
  const onMedia = useCallback((id: number, m: RowMedia) => setMedia((prev) => ({ ...prev, [id]: m })), []);

  const filled = rows.filter((r) => r.description.trim());
  const totalActs = filled.reduce((s, r) => s + (r.people || 0), 0);
  const failed = rows.reduce((s, r) => s + (media[r.id]?.failed ?? 0), 0);
  const busy = rows.some((r) => media[r.id]?.busy);
  const anyMedia = rows.some((r) => (media[r.id]?.uploaded.length ?? 0) > 0);

  const onSubmit = async () => {
    setError(null);
    if (filled.length === 0) return setError(t.emptyRows);
    // A row with a photo but no description would be silently dropped — flag it.
    const orphan = rows.findIndex((r) => !r.description.trim() && media[r.id]?.hasFiles);
    if (orphan >= 0) return setError(t.rowError(orphan + 1, t.needDescription));
    if (busy) return setError(t.waitUploads);
    if (anyMedia && !consent) return setError(t.needConsent);
    const badLink = rows.findIndex((r) => r.description.trim() && !isValidLink(r.link));
    if (badLink >= 0) return setError(t.rowError(badLink + 1, t.badLink));
    if (!submitter.valid) return setError(t.needEmail);
    try {
      const res = await submit.mutateAsync({
        consent,
        email: submitter.email,
        items: filled.map((r) => ({
          description: r.description.trim(),
          people_count: Math.max(1, r.people || 1),
          act_date: r.date,
          media: media[r.id]?.uploaded ?? [],
          link_url: r.link.trim() || undefined,
        })),
      });
      submitter.remember(submitter.email);
      navigate("/done", { replace: true, state: res });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <PortalHeader />
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-4 py-6 lg:px-10 lg:py-10 xl:px-40">
        <div className="flex flex-col gap-2">
          <Link to="/" className="inline-flex items-center gap-1.5 self-start text-sm font-bold text-sky-deep no-underline">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            {t.dashboard}
          </Link>
          <h1 className="m-0 text-[28px] font-extrabold lg:text-4xl">{t.bulkLog}</h1>
          <p className="m-0 max-w-[720px] text-base leading-relaxed text-ink-muted">{t.bulkIntro}</p>
          <div className="mt-2 max-w-[460px]">
            <EmailField id="bulk-email" value={submitter.email} onChange={submitter.setEmail} />
          </div>
        </div>

        <section className="flex flex-col gap-3 lg:gap-0 lg:rounded-3xl lg:bg-white lg:px-6 lg:py-2 lg:shadow-card">
          <div className="hidden grid-cols-[32px_1fr_150px_180px_260px_44px] gap-3 py-3.5 text-xs font-bold tracking-[0.06em] text-ink-muted lg:grid">
            <span>{t.colNum}</span>
            <span>{t.colDesc}</span>
            <span>{t.colPeople}</span>
            <span>{t.colDate}</span>
            <span>{t.colMedia}</span>
            <span />
          </div>
          {rows.map((r, i) => (
            <div
              key={r.id}
              className="grid grid-cols-2 gap-3 rounded-2xl bg-white p-4 shadow-[0_4px_20px_rgba(14,35,75,0.06)] lg:grid-cols-[32px_1fr_150px_180px_260px_44px] lg:items-center lg:rounded-none lg:border-t lg:border-line-faint lg:p-0 lg:py-3 lg:shadow-none"
            >
              <div className="col-span-2 flex items-center justify-between lg:col-span-1">
                <span className="text-sm font-extrabold text-ink-muted">{i + 1}</span>
                <button
                  type="button"
                  aria-label={t.deleteRow}
                  onClick={() => remove(r.id)}
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-muted hover:bg-canvas lg:hidden"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
              <div className="col-span-2 flex flex-col gap-2 lg:col-span-1">
                <input
                  type="text"
                  placeholder={t.whatHappened}
                  aria-label={t.actDescription}
                  maxLength={1000}
                  value={r.description}
                  onChange={(e) => update(r.id, { description: e.target.value })}
                  className="field"
                />
                <div className="relative flex items-center">
                  <Link2 className="pointer-events-none absolute start-3.5 h-4 w-4 text-ink-muted" aria-hidden="true" />
                  <input
                    type="url"
                    inputMode="url"
                    autoComplete="off"
                    placeholder={t.linkLabel}
                    aria-label={t.linkLabel}
                    value={r.link}
                    onChange={(e) => update(r.id, { link: e.target.value })}
                    className="field h-11 ps-10 text-sm"
                  />
                </div>
              </div>
              <input
                type="text"
                inputMode="numeric"
                aria-label={t.peopleInvolved}
                value={r.people || ""}
                onChange={(e) => {
                  const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                  update(r.id, { people: Number.isFinite(n) ? Math.min(100000, n) : 0 });
                }}
                onBlur={() => !r.people && update(r.id, { people: 1 })}
                className="field text-center font-bold"
              />
              <input
                type="date"
                aria-label={t.date}
                max={todayISO()}
                value={r.date}
                onChange={(e) => update(r.id, { date: e.target.value })}
                className="field"
              />
              <div className="col-span-2 lg:col-span-1">
                <RowUpload onMedia={(m) => onMedia(r.id, m)} />
              </div>
              <button
                type="button"
                aria-label={t.deleteRow}
                onClick={() => remove(r.id)}
                className="hidden h-11 w-11 items-center justify-center rounded-xl text-ink-muted hover:bg-canvas lg:flex"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          ))}
          <div className="lg:border-t lg:border-line-faint lg:py-4">
            <button
              type="button"
              onClick={addRow}
              className="flex h-12 items-center gap-2 rounded-xl px-2 text-[15px] font-bold text-sky-deep hover:bg-sky-wash"
            >
              <Plus className="h-[18px] w-[18px]" strokeWidth={2.5} aria-hidden="true" />
              {t.addRow}
            </button>
          </div>
        </section>
      </main>

      <footer className="sticky bottom-0 z-20 border-t border-line-soft bg-white/95 px-4 py-4 shadow-[0_-8px_24px_rgba(14,35,75,0.06)] backdrop-blur lg:px-10 xl:px-40">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 lg:flex-row lg:items-center lg:gap-8">
          <div className="flex items-center gap-5">
            <div className="flex flex-col">
              <span className="text-2xl font-extrabold">{filled.length}</span>
              <span className="text-[10px] font-bold tracking-[0.08em] text-ink-muted">{t.rows}</span>
            </div>
            <div className="h-9 w-px bg-line-soft" />
            <div className="flex flex-col">
              <span className="text-2xl font-extrabold">{totalActs.toLocaleString(locale)}</span>
              <span className="text-[10px] font-bold tracking-[0.08em] text-ink-muted">{t.totalActs}</span>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            {anyMedia && (
              <label className="flex cursor-pointer items-start gap-2.5 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-sky"
                />
                <span>{t.bulkConsent}</span>
              </label>
            )}
            {failed > 0 && <span className="text-[13px] font-semibold text-rose-ink">{t.failedNote(failed)}</span>}
            {error && (
              <span role="alert" className="text-[13px] font-semibold text-rose-ink">
                {error}
              </span>
            )}
          </div>
          <button type="button" onClick={onSubmit} disabled={submit.isPending} className="btn-primary w-full lg:w-auto">
            {submit.isPending ? t.submitting : t.submitAll}
          </button>
        </div>
      </footer>
    </div>
  );
}
