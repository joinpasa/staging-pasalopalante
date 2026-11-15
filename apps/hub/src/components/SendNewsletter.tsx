import { useEffect, useMemo, useState } from "react";
import { Send, X } from "lucide-react";
import { toast } from "sonner";
import { cx, Segmented } from "@/components/bits";
import { useAct, useHub, useMe } from "@/lib/hub";
import { type Lang, renderNewsletter } from "@/lib/newsletter";
import { isoToPrInput, prDateTime, prInputToIso } from "@/lib/time";
import type { Item, NewsletterDesign } from "@/lib/types";

// Sending a newsletter to a list, from the hub. Only an approver or an admin, only an approved
// card, and only after seeing exactly how many people it goes to and confirming once more.

const DEFAULTS: Record<Lang, { include: string[]; exclude: string[] }> = {
  en: { include: ["pledged"], exclude: ["pasalo palante"] },
  es: { include: ["pasalo palante"], exclude: [] },
};

export default function SendNewsletter({ item, design, missing, blocked, onClose }: { item: Item; design: NewsletterDesign; missing: Lang[]; blocked: string[]; onClose: () => void }) {
  const { store } = useHub();
  const act = useAct();
  const { data: me } = useMe();
  const firstUnsent: Lang = design.saved?.en?.sent && !design.saved?.es?.sent ? "es" : "en";
  const [lang, setLang] = useState<Lang>(firstUnsent);
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
  const [include, setInclude] = useState<string[]>(DEFAULTS[firstUnsent].include);
  const [exclude, setExclude] = useState<string[]>(DEFAULTS[firstUnsent].exclude);
  const [whenMode, setWhenMode] = useState<"card" | "other" | "now">(item.publishAt && new Date(item.publishAt).getTime() > Date.now() + 10 * 60_000 ? "card" : "other");
  const [other, setOther] = useState(isoToPrInput(item.publishAt));
  const [resend, setResend] = useState(false);
  const [count, setCount] = useState<{ count: number; exact: boolean } | null>(null);
  const [counting, setCounting] = useState(false);
  const [sure, setSure] = useState(false);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState("");

  const sent = design.saved?.[lang]?.sent;
  const when = whenMode === "now" ? "now" : whenMode === "card" ? item.publishAt ?? "" : prInputToIso(other) ?? "";
  const html = useMemo(() => renderNewsletter(design, lang), [design, lang]);

  useEffect(() => {
    store.emailTags().then(setTags, () => setTags([]));
  }, [store]);
  useEffect(() => {
    setInclude(DEFAULTS[lang].include);
    setExclude(DEFAULTS[lang].exclude);
    setSure(false);
  }, [lang]);
  useEffect(() => {
    let gone = false;
    setCount(null);
    if (!include.length) return;
    setCounting(true);
    const t = setTimeout(() => {
      store
        .audience(include, exclude)
        .then((c) => !gone && setCount(c))
        .catch((e) => !gone && toast.error(e instanceof Error ? e.message : "The list could not be counted."))
        .finally(() => !gone && setCounting(false));
    }, 350);
    return () => {
      gone = true;
      clearTimeout(t);
    };
  }, [store, include, exclude]);

  const role = me?.role;
  const reasons = [
    role !== "approver" && role !== "admin" && "Only an approver (Edith or Rohini) or an admin can send a newsletter.",
    !["approved", "scheduled"].includes(item.stage) && "The email card has to be approved first. Send it for review from the card.",
    sent && `The ${lang === "en" ? "English" : "Spanish"} email already went out to ${sent.count} people (${prDateTime(sent.at)}).`,
    missing.includes(lang) && `The ${lang === "en" ? "English" : "Spanish"} version still has empty parts.`,
    ...blocked,
    !include.length && "Choose who gets it.",
    count?.count === 0 && "Nobody matches that list.",
    whenMode !== "now" && (!when || new Date(when).getTime() < Date.now() + 5 * 60_000) && "Choose a time at least a few minutes from now, or send it now.",
  ].filter(Boolean) as string[];
  const ready = reasons.length === 0 && !!count && sure && !sending;

  const send = async () => {
    setSending(true);
    const out = await act((s) => s.sendNewsletter(item.id, lang, html, { include, exclude, when, resendHours: resend ? 24 : 0 }));
    setSending(false);
    if (out) {
      toast.success(out.when === "now" ? `Sending to ${out.count} people now` : `Scheduled for ${out.count} people, ${prDateTime(out.when)}`);
      onClose();
    }
  };

  const toggle = (list: string[], set: (v: string[]) => void, name: string) => set(list.includes(name) ? list.filter((x) => x !== name) : [...list, name]);
  const shown = tags.filter((t) => !filter.trim() || t.name.toLowerCase().includes(filter.trim().toLowerCase())).slice(0, 60);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/40 p-3 sm:p-8" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Send the newsletter" className="w-full max-w-[720px] rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[21px] font-extrabold tracking-[-0.02em]">Send the newsletter</h2>
            <p className="mt-1 text-[13.5px] text-ink-muted">It goes out through HighLevel, from {design.fromName[lang] || "the sender on the design"}. Each language is sent on its own.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-ink-muted hover:bg-paper">
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 space-y-6">
          <section>
            <Segmented value={lang} onChange={setLang} options={[["en", `English${design.saved?.en?.sent ? " (sent)" : ""}`], ["es", `Español${design.saved?.es?.sent ? " (sent)" : ""}`]] as const} />
            <p className="mt-2 text-[13px] text-ink-muted">
              Subject: <span className="font-semibold text-ink">{design.subject[lang] || "(none yet)"}</span>
            </p>
          </section>

          <section>
            <h3 className="text-[14.5px] font-extrabold">Who gets it</h3>
            <p className="mt-0.5 text-[12.5px] text-ink-muted">Everyone with an email who has any of the tags in the first list, leaving out anyone with a tag in the second. People who asked for their data to be deleted are always left out.</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {include.map((t) => (
                <button key={t} type="button" onClick={() => toggle(include, setInclude, t)} className="rounded-full bg-navy px-2.5 py-1 text-[12.5px] font-semibold text-white">
                  {t} ×
                </button>
              ))}
              {exclude.map((t) => (
                <button key={t} type="button" onClick={() => toggle(exclude, setExclude, t)} className="rounded-full bg-orange-soft px-2.5 py-1 text-[12.5px] font-semibold text-orange-ink">
                  not {t} ×
                </button>
              ))}
            </div>
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Find a tag" aria-label="Find a tag" className="field mt-3 h-9 py-1" />
            <ul className="mt-2 max-h-[180px] overflow-y-auto rounded-lg border border-line">
              {shown.map((t) => (
                <li key={t.id} className="flex items-center gap-2 border-b border-line px-3 py-1.5 text-[13px] last:border-b-0">
                  <span className="min-w-0 flex-1 truncate">{t.name}</span>
                  <button type="button" onClick={() => toggle(include, setInclude, t.name)} className={cx("rounded px-2 py-0.5 text-[12px] font-semibold", include.includes(t.name) ? "bg-navy text-white" : "bg-paper text-ink-muted hover:text-ink")}>
                    {include.includes(t.name) ? "Gets it" : "Send to"}
                  </button>
                  <button type="button" onClick={() => toggle(exclude, setExclude, t.name)} className={cx("rounded px-2 py-0.5 text-[12px] font-semibold", exclude.includes(t.name) ? "bg-orange-soft text-orange-ink" : "bg-paper text-ink-muted hover:text-ink")}>
                    {exclude.includes(t.name) ? "Left out" : "Leave out"}
                  </button>
                </li>
              ))}
              {shown.length === 0 && <li className="px-3 py-2 text-[13px] text-ink-faint">No tags match.</li>}
            </ul>
            <p className="mt-3 text-[15px] font-bold">
              {counting ? "Counting…" : count ? `${count.exact ? "" : "About "}${count.count.toLocaleString("en-US")} people with an email` : include.length ? "" : "Nobody chosen yet"}
            </p>
            {count && !count.exact && <p className="text-[12.5px] text-ink-faint">The preview adds up each tag's own count. Once the hub is live, HighLevel counts the exact list.</p>}
          </section>

          <section>
            <h3 className="text-[14.5px] font-extrabold">When</h3>
            <div className="mt-2 space-y-2 text-[13.5px]">
              {item.publishAt && (
                <label className="flex items-center gap-2">
                  <input type="radio" checked={whenMode === "card"} onChange={() => setWhenMode("card")} className="accent-[#0e234b]" />
                  At the card's time: <span className="font-semibold">{prDateTime(item.publishAt)}</span> (Puerto Rico)
                </label>
              )}
              <label className="flex flex-wrap items-center gap-2">
                <input type="radio" checked={whenMode === "other"} onChange={() => setWhenMode("other")} className="accent-[#0e234b]" />
                Another time, Puerto Rico time
                <input type="datetime-local" value={other} onChange={(e) => (setOther(e.target.value), setWhenMode("other"))} className="field h-8 w-auto py-0 text-[13px]" />
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={whenMode === "now"} onChange={() => setWhenMode("now")} className="accent-[#0e234b]" />
                Right now
              </label>
              <label className="mt-3 flex items-center gap-2">
                <input type="checkbox" checked={resend} onChange={(e) => setResend(e.target.checked)} className="accent-[#0e234b]" />
                A day later, send it again to people who did not open it
              </label>
            </div>
          </section>

          {reasons.length > 0 && (
            <ul className="space-y-1 rounded-lg bg-paper px-4 py-3">
              {reasons.map((r) => (
                <li key={r} className="text-[13px] font-semibold text-orange-ink">
                  {r}
                </li>
              ))}
            </ul>
          )}

          <label className="flex items-start gap-2 text-[13.5px]">
            <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} className="mt-1 accent-[#0e234b]" />
            I have read this {lang === "en" ? "English" : "Spanish"} email, the links work, and the list is right. A sent email cannot be taken back.
          </label>

          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <button type="button" className="btn-quiet" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn-primary" disabled={!ready} onClick={() => void send()}>
              <Send size={15} />
              {sending ? "Sending…" : count ? `${whenMode === "now" ? "Send now to" : "Schedule for"} ${count.count.toLocaleString("en-US")} people` : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
