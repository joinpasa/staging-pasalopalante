import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowDown, ArrowLeft, ArrowUp, Check, Copy, Download, Monitor, Plus, Send, Smartphone, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { cx, Empty, Segmented } from "@/components/bits";
import SendNewsletter from "@/components/SendNewsletter";
import { checkCaption } from "@/lib/checks";
import { useAct, useHub, useItems } from "@/lib/hub";
import { BLOCK_LABEL, designText, type Lang, newBlock, renderNewsletter, starterDesign } from "@/lib/newsletter";
import type { Item, NewsletterBlock, NewsletterDesign } from "@/lib/types";

const ADDABLE: NewsletterBlock["type"][] = ["heading", "text", "act", "quote", "number", "image", "button", "divider"];
const LANG_LABEL: Record<Lang, string> = { en: "English, Kindness Forward", es: "Spanish, Pásalo Pa'lante" };

/** The newsletter designer: one design, written in both languages, previewed as the real email. */
export default function NewsletterPage() {
  const { id = "" } = useParams();
  const { data: items = [], isLoading } = useItems();
  const item = items.find((i) => i.id === id);
  if (isLoading) return null;
  if (!item || item.format !== "email") return <Empty title="That email is not in the Plan" body="Open an email card from Plan, Emails, and choose Design the email." />;
  return <Designer key={item.id} item={item} itemId={item.id} title={item.title} initial={item.design ?? starterDesign(item)} />;
}

function Designer({ item, itemId, title, initial }: { item: Item; itemId: string; title: string; initial: NewsletterDesign }) {
  const act = useAct();
  const { store } = useHub();
  const [d, setD] = useState<NewsletterDesign>(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [lang, setLang] = useState<Lang>("en");
  const [device, setDevice] = useState<"desktop" | "phone">("desktop");
  const [pushing, setPushing] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const dirty = JSON.stringify(d) !== saved;
  const html = useMemo(() => renderNewsletter(d, lang), [d, lang]);
  const findings = useMemo(() => checkCaption(designText(d, lang)), [d, lang]);
  const missing = (["en", "es"] as Lang[]).filter((l) => !d.subject[l].trim() || d.blocks.some((b) => "en" in b && !(l === "en" ? b.en : b.es).trim()));

  // keep a half-finished design if the tab is closed by mistake
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const save = async () => {
    const ok = await act((s) => s.saveItem(itemId, { design: d }), "Saved");
    if (ok) setSaved(JSON.stringify(d));
    return !!ok;
  };
  const setBlock = (bid: string, patch: Partial<NewsletterBlock>) => setD((x) => ({ ...x, blocks: x.blocks.map((b) => (b.id === bid ? ({ ...b, ...patch } as NewsletterBlock) : b)) }));
  const move = (i: number, by: number) =>
    setD((x) => {
      const blocks = [...x.blocks];
      const [b] = blocks.splice(i, 1);
      blocks.splice(Math.max(0, Math.min(blocks.length, i + by)), 0, b);
      return { ...x, blocks };
    });
  const setPair = (key: "subject" | "preview" | "fromName" | "fromEmail", l: Lang, v: string) => setD((x) => ({ ...x, [key]: { ...x[key], [l]: v } }));

  const download = () => {
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "newsletter"}-${lang}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const toHighLevel = async () => {
    if (dirty && !(await save())) return;
    setPushing(true);
    try {
      const out = await store.saveNewsletter(itemId, lang, html);
      toast.success(out.campaignId ? "In HighLevel as a template and a draft campaign. Choose who gets it and when there." : "In HighLevel as a template.");
      await act(async () => true);
    } catch (e) {
      toast(e instanceof Error ? e.message : "HighLevel could not take it just now.");
    } finally {
      setPushing(false);
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <Link to="/plan?view=emails" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-muted hover:text-ink">
            <ArrowLeft size={14} /> Emails
          </Link>
          <h1 className="mt-2 text-[28px] font-extrabold leading-tight tracking-[-0.025em]">{title || "Untitled email"}</h1>
          <p className="mt-1 max-w-[720px] text-[14px] text-ink-muted">One design, written in English and Spanish. Build it from blocks, see it as the real email, then save it to HighLevel, where Dee chooses who gets it and when.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-ghost" onClick={() => navigator.clipboard.writeText(html).then(() => toast.success("The email's HTML is copied"), () => toast("Copy did not work in this browser"))}>
            <Copy size={15} /> Copy HTML
          </button>
          <button type="button" className="btn-ghost" onClick={download}>
            <Download size={15} /> Download
          </button>
          <button type="button" className="btn-ghost" disabled={pushing} onClick={() => void toHighLevel()}>
            <UploadCloud size={15} /> {pushing ? "Saving to HighLevel…" : `Save to HighLevel (${lang.toUpperCase()})`}
          </button>
          <button type="button" className={dirty ? "btn-primary" : "btn-ghost"} disabled={!dirty} onClick={() => void save()}>
            <Check size={15} /> {dirty ? "Save" : "Saved"}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={async () => {
              // the email that goes out is the one saved here, so save first
              if (dirty && !(await save())) return;
              setSendOpen(true);
            }}
          >
            <Send size={15} /> Send
          </button>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,700px)]">
        {/* the words */}
        <div className="min-w-0 space-y-6">
          <section className="rounded-xl border border-line p-5">
            <h2 className="text-[16px] font-extrabold">Subject, preview line and sender</h2>
            <div className="mt-3 grid gap-x-4 gap-y-3 md:grid-cols-2">
              {(["en", "es"] as Lang[]).map((l) => (
                <div key={l} className="space-y-2.5">
                  <p className="text-[12.5px] font-bold text-sky-ink">{LANG_LABEL[l]}</p>
                  <Field label="Subject" value={d.subject[l]} onChange={(v) => setPair("subject", l, v)} hint={`${d.subject[l].length} characters${d.subject[l].length > 50 ? ", keep it under 50" : ""}`} />
                  <Field label="Preview line" value={d.preview[l]} onChange={(v) => setPair("preview", l, v)} hint="Shown after the subject in the inbox" />
                  <Field label="From name" value={d.fromName[l]} onChange={(v) => setPair("fromName", l, v)} />
                  <Field label="From address" value={d.fromEmail[l]} onChange={(v) => setPair("fromEmail", l, v)} hint={l === "en" ? "{{business.email}} sends from team@mg.passkindnessforward.com" : undefined} />
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-[16px] font-extrabold">The email, block by block</h2>
            <ol className="space-y-3">
              {d.blocks.map((b, i) => (
                <li key={b.id} className="rounded-xl border border-line">
                  <div className="flex items-center gap-2 border-b border-line bg-paper px-4 py-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy text-[12px] font-bold tabular-nums text-white">{i + 1}</span>
                    <span className="text-[13.5px] font-bold">{BLOCK_LABEL[b.type]}</span>
                    <span className="ml-auto flex gap-1">
                      <IconBtn label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                        <ArrowUp size={14} />
                      </IconBtn>
                      <IconBtn label="Move down" disabled={i === d.blocks.length - 1} onClick={() => move(i, 1)}>
                        <ArrowDown size={14} />
                      </IconBtn>
                      <IconBtn label="Remove" onClick={() => setD((x) => ({ ...x, blocks: x.blocks.filter((y) => y.id !== b.id) }))}>
                        <Trash2 size={14} />
                      </IconBtn>
                    </span>
                  </div>
                  <div className="p-4">
                    <BlockFields b={b} set={(patch) => setBlock(b.id, patch)} />
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-semibold text-ink-muted">Add:</span>
              {ADDABLE.map((t) => (
                <button key={t} type="button" className="btn-ghost h-8 text-[12.5px]" onClick={() => setD((x) => ({ ...x, blocks: [...x.blocks, newBlock(t)] }))}>
                  <Plus size={13} /> {BLOCK_LABEL[t]}
                </button>
              ))}
            </div>
            <p className="mt-4 text-[12.5px] leading-relaxed text-ink-faint">
              {"{{contact.first_name}}"} becomes each person's first name when HighLevel sends it. The logo, the footer and the unsubscribe link are added for you.
            </p>
          </section>
        </div>

        {/* the email as people will see it */}
        <aside className="min-w-0 xl:sticky xl:top-6 xl:self-start">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Segmented value={lang} onChange={setLang} options={[["en", "English"], ["es", "Español"]] as const} />
            <Segmented value={device} onChange={setDevice} options={[["desktop", "Computer"], ["phone", "Phone"]] as const} />
            <span className="ml-auto inline-flex items-center gap-1.5 text-[12.5px] text-ink-faint">
              {device === "desktop" ? <Monitor size={14} /> : <Smartphone size={14} />} Subject: <span className="font-semibold text-ink">{d.subject[lang] || "(none yet)"}</span>
            </span>
          </div>
          {(findings.length > 0 || missing.length > 0) && (
            <ul className="mb-3 space-y-1 rounded-lg bg-paper px-4 py-3">
              {missing.map((l) => (
                <li key={l} className="text-[12.5px] font-semibold text-orange-ink">
                  The {l === "en" ? "English" : "Spanish"} version still has empty parts.
                </li>
              ))}
              {findings.map((f) => (
                <li key={f.id} className={cx("text-[12.5px] font-semibold", f.level === "block" ? "text-rose-ink" : "text-orange-ink")}>
                  {f.title}
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-center rounded-xl bg-paper p-3">
            <iframe title="The email" srcDoc={html} className="h-[78vh] rounded-lg border border-line bg-white" style={{ width: device === "desktop" ? "100%" : 390 }} sandbox="" />
          </div>
          {d.saved?.[lang] && (
            <p className="mt-2 text-[12.5px] text-ink-muted">
              Saved to HighLevel {new Date(d.saved[lang]!.at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
              {d.saved[lang]!.campaignId ? ": template and draft campaign." : ": template."}
            </p>
          )}
        </aside>
      </div>
      {sendOpen && (
        <SendNewsletter
          item={item}
          design={d}
          missing={missing}
          blocked={findings.filter((f) => f.level === "block").map((f) => f.title)}
          onClose={() => setSendOpen(false)}
        />
      )}
    </>
  );
}

function Field({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <label className="block">
      <span className="eyebrow">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="field mt-1" />
      {hint && <span className="mt-0.5 block text-[12px] text-ink-faint">{hint}</span>}
    </label>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="rounded-md p-1.5 text-ink-muted hover:bg-white hover:text-ink disabled:opacity-30">
      {children}
    </button>
  );
}

function Pair({ en, es, set, rows = 2, label }: { en: string; es: string; set: (p: { en?: string; es?: string }) => void; rows?: number; label?: string }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {(["en", "es"] as Lang[]).map((l) => (
        <label key={l} className="block">
          <span className="eyebrow">
            {label ? `${label}, ` : ""}
            {l === "en" ? "English" : "Spanish"}
          </span>
          <textarea value={l === "en" ? en : es} onChange={(e) => set({ [l]: e.target.value })} rows={rows} className="field mt-1 resize-y leading-relaxed" />
        </label>
      ))}
    </div>
  );
}

function BlockFields({ b, set }: { b: NewsletterBlock; set: (p: Partial<NewsletterBlock>) => void }) {
  switch (b.type) {
    case "heading":
      return <Pair en={b.en} es={b.es} set={set} rows={2} />;
    case "text":
      return <Pair en={b.en} es={b.es} set={set} rows={4} />;
    case "act":
      return <Pair en={b.en} es={b.es} set={set} rows={2} label="The act" />;
    case "quote":
      return (
        <div className="space-y-3">
          <Pair en={b.en} es={b.es} set={set} rows={3} label="Their words" />
          <label className="block">
            <span className="eyebrow">Who said it (first name, place), with consent on file</span>
            <input value={b.who} onChange={(e) => set({ who: e.target.value })} className="field mt-1" />
          </label>
        </div>
      );
    case "number":
      return (
        <div className="space-y-3">
          <label className="block">
            <span className="eyebrow">The number, big</span>
            <input value={b.value} onChange={(e) => set({ value: e.target.value })} className="field mt-1" />
          </label>
          <Pair en={b.en} es={b.es} set={set} rows={1} label="Under it" />
        </div>
      );
    case "image":
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="eyebrow">Picture link (from Videos, the Story bank or HighLevel's media)</span>
            <input value={b.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://" className="field mt-1" />
          </label>
          <label className="block">
            <span className="eyebrow">What it shows, for people who cannot see it</span>
            <input value={b.alt} onChange={(e) => set({ alt: e.target.value })} className="field mt-1" />
          </label>
        </div>
      );
    case "button":
      return (
        <div className="space-y-3">
          <Pair en={b.en} es={b.es} set={set} rows={1} label="Button words" />
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="eyebrow">Link, English</span>
              <input value={b.url} onChange={(e) => set({ url: e.target.value })} className="field mt-1" />
            </label>
            <label className="block">
              <span className="eyebrow">Link, Spanish</span>
              <input value={b.urlEs ?? ""} onChange={(e) => set({ urlEs: e.target.value })} placeholder="Same as English" className="field mt-1" />
            </label>
          </div>
        </div>
      );
    case "divider":
      return <p className="text-[13px] text-ink-faint">A thin line between two parts of the email.</p>;
  }
}
