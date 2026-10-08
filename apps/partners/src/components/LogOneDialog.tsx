import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import { Link2, MessageSquareWarning, X } from "lucide-react";
import MediaField from "./MediaField";
import EmailField from "./EmailField";
import { useSubmitterEmail } from "@/lib/useSubmitterEmail";
import { useCopy } from "@/lib/i18n";
import { todayISO } from "@/lib/season";
import { isValidLink, useSubmitActs, type Submission } from "@/lib/submissions";
import { useUploads } from "@/lib/useUploads";

/**
 * Inner form is its own component so every open starts from a clean slate.
 * With `editing`, it opens pre-filled with a "Needs Changes" act and
 * resubmits it instead of creating a new one.
 */
function LogOneForm({ onClose, editing }: { onClose: () => void; editing?: Submission }) {
  const { t } = useCopy();
  const navigate = useNavigate();
  const submit = useSubmitActs();
  const uploads = useUploads(editing?.media ?? []);
  const [description, setDescription] = useState(editing?.description ?? "");
  const [date, setDate] = useState(editing?.act_date ?? todayISO());
  const [group, setGroup] = useState((editing?.people_count ?? 1) > 1);
  const [count, setCount] = useState(Math.max(2, editing?.people_count ?? 2));
  const [link, setLink] = useState(editing?.link_url ?? "");
  const [consent, setConsent] = useState(false);
  const submitter = useSubmitterEmail();
  const [error, setError] = useState<string | null>(null);

  // Default the permission box on once they've added a file — it's the
  // design's resting state and the common case — but they can untick it.
  const hasMedia = uploads.items.length > 0;
  useEffect(() => {
    if (hasMedia) setConsent(true);
  }, [hasMedia]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!description.trim()) return setError(t.needDescription);
    if (uploads.busy) return setError(t.waitUploads);
    if (uploads.uploaded.length > 0 && !consent) return setError(t.needConsent);
    if (!isValidLink(link)) return setError(t.badLink);
    if (!submitter.valid) return setError(t.needEmail);
    try {
      const res = await submit.mutateAsync({
        consent,
        email: submitter.email,
        editId: editing?.id,
        items: [
          {
            description: description.trim(),
            people_count: group ? count : 1,
            act_date: date,
            media: uploads.uploaded,
            link_url: link.trim() || undefined,
          },
        ],
      });
      submitter.remember(submitter.email);
      navigate("/done", { replace: true, state: res });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-start justify-between gap-4 border-b border-line-faint px-5 py-5 lg:px-8 lg:py-6">
        <div className="flex flex-col gap-1">
          <Dialog.Title className="m-0 text-2xl font-extrabold lg:text-[28px]">{editing ? t.editTitle : t.logOne}</Dialog.Title>
          <Dialog.Description className="m-0 text-[15px] text-ink-muted">
            {editing ? t.editIntro : t.logOneIntro}
          </Dialog.Description>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.close}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-canvas text-navy hover:bg-sand"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5 lg:px-8 lg:py-6">
        {editing?.review_note && (
          <div className="flex gap-3 rounded-2xl bg-rose-soft p-4">
            <MessageSquareWarning className="mt-0.5 h-5 w-5 shrink-0 text-rose" aria-hidden="true" />
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-[0.06em] text-rose-ink">{t.reviewerNote}</span>
              <span className="text-[15px] font-medium text-navy">{editing.review_note}</span>
            </div>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <label htmlFor="lo-what" className="label">
            {t.whatHappened}
          </label>
          <textarea
            id="lo-what"
            rows={3}
            maxLength={1000}
            placeholder={t.whatPlaceholder}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="field h-auto resize-none py-3.5 leading-normal"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="lo-date" className="label">
              {t.date}
            </label>
            <input
              id="lo-date"
              type="date"
              max={todayISO()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="field"
            />
          </div>
          <div className="flex flex-col gap-2">
            <span id="lo-group-label" className="label">
              {t.groupQ}
            </span>
            <div className="flex h-[52px] items-center justify-between rounded-xl border-[1.5px] border-line bg-white px-4">
              <span className="text-base font-semibold">{group ? t.yes : t.no}</span>
              <button
                type="button"
                role="switch"
                aria-checked={group}
                aria-labelledby="lo-group-label"
                onClick={() => setGroup((g) => !g)}
                className={`flex h-8 w-14 items-center rounded-full p-1 transition ${group ? "justify-end bg-sky" : "justify-start bg-[#C9C3B6]"}`}
              >
                <span className="h-6 w-6 rounded-full bg-white shadow" />
              </button>
            </div>
          </div>
        </div>

        {group && (
          <div className="flex flex-col gap-3 rounded-2xl bg-sky-wash p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <label htmlFor="lo-num" className="label">
                {t.howMany}
              </label>
              <span className="text-[13px] text-ink-muted">{t.howManyHelp}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={t.fewer}
                onClick={() => setCount((c) => Math.max(2, c - 1))}
                className="flex h-11 w-11 items-center justify-center rounded-xl border-[1.5px] border-line bg-white text-xl font-bold"
              >
                −
              </button>
              <input
                id="lo-num"
                type="text"
                inputMode="numeric"
                value={count}
                onChange={(e) => {
                  const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                  setCount(Number.isFinite(n) ? Math.min(100000, Math.max(1, n)) : 1);
                }}
                className="h-11 w-20 rounded-xl border-[1.5px] border-line bg-white text-center text-lg font-bold outline-none focus:border-sky"
              />
              <button
                type="button"
                aria-label={t.more}
                onClick={() => setCount((c) => Math.min(100000, c + 1))}
                className="flex h-11 w-11 items-center justify-center rounded-xl border-[1.5px] border-line bg-white text-xl font-bold"
              >
                +
              </button>
            </div>
          </div>
        )}

        <MediaField uploads={uploads} id="lo-media" />

        <div className="flex flex-col gap-2">
          <label htmlFor="lo-link" className="label">
            {t.linkLabel}
          </label>
          <div className="relative flex items-center">
            <Link2 className="pointer-events-none absolute start-4 h-[18px] w-[18px] text-ink-muted" aria-hidden="true" />
            <input
              id="lo-link"
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder={t.linkPlaceholder}
              value={link}
              onChange={(e) => setLink(e.target.value)}
              aria-describedby="lo-link-help"
              className="field ps-11"
            />
          </div>
          <span id="lo-link-help" className="text-[13px] text-ink-muted">
            {t.linkHelp}
          </span>
        </div>

        <EmailField id="lo-email" value={submitter.email} onChange={submitter.setEmail} />

        {hasMedia && (
          <label className="flex cursor-pointer items-start gap-3 text-sm font-medium leading-normal">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-sky"
            />
            <span>{t.consent}</span>
          </label>
        )}

        {error && (
          <p role="alert" className="m-0 rounded-xl bg-rose-soft px-3.5 py-2.5 text-sm font-semibold text-rose-ink">
            {error}
          </p>
        )}
      </div>

      <div className="flex gap-3 border-t border-line-faint px-5 py-4 lg:justify-end lg:px-8 lg:py-5">
        <button type="button" onClick={onClose} className="btn-secondary h-[52px] flex-1 lg:flex-none">
          {t.cancel}
        </button>
        <button type="submit" disabled={submit.isPending} className="btn-primary h-[52px] flex-1 lg:flex-none">
          {submit.isPending ? t.submitting : editing ? t.resubmit : t.submitAct}
        </button>
      </div>
    </form>
  );
}

export default function LogOneDialog({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing?: Submission;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-navy/50" />
        <Dialog.Content
          className="fixed inset-0 z-50 flex flex-col bg-white text-ink outline-none lg:inset-auto lg:start-1/2 lg:top-1/2 lg:max-h-[90vh] lg:w-[680px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[28px] lg:shadow-[0_24px_64px_rgba(14,35,75,0.25)] rtl:lg:translate-x-1/2"
        >
          {open && <LogOneForm key={editing?.id ?? "new"} onClose={onClose} editing={editing} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
