import { useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Link2, X } from "lucide-react";
import { toast } from "sonner";
import { Empty, PageHead, PauseMark, Segmented, StagePill } from "@/components/bits";
import { useAct, useHub, useItems, useSuggestions } from "@/lib/hub";
import { localDateTime } from "@/lib/time";
import { asset, hubUrl } from "@/lib/base";

/** The suggestion box, as the marketing team sees it. */
export default function SuggestionsPage() {
  const { open } = useHub();
  const act = useAct();
  const { data: suggestions = [] } = useSuggestions();
  const { data: items = [] } = useItems();
  const [tab, setTab] = useState<"new" | "done">("new");
  const list = suggestions.filter((s) => (tab === "new" ? s.status === "new" : s.status !== "new"));
  const fresh = suggestions.filter((s) => s.status === "new").length;
  const formUrl = hubUrl("/suggest");

  return (
    <>
      <PageHead
        title="Suggestions"
        sub="Ideas from anyone: the team, the directors, partners and ambassadors. Accept one and it becomes a card in the pipeline."
        actions={
          <>
            <button
              type="button"
              className="btn-ghost"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(formUrl);
                  toast.success("Link copied. Share it with the team.");
                } catch {
                  toast(formUrl);
                }
              }}
            >
              <Link2 size={15} /> Copy the form link
            </button>
            <Link to="/suggest" className="btn-ghost">
              Open the form <ExternalLink size={14} />
            </Link>
          </>
        }
      />

      <div className="mb-5">
        <Segmented
          value={tab}
          onChange={setTab}
          options={
            [
              ["new", `New (${fresh})`],
              ["done", "Answered"],
            ] as const
          }
        />
      </div>

      {list.length === 0 ? (
        <Empty title={tab === "new" ? "No new suggestions" : "Nothing answered yet"} body={tab === "new" ? "When someone sends an idea through the form, it lands here." : undefined} />
      ) : (
        <ul className="max-w-[860px] border-t border-line">
          {list.map((s) => {
            const item = items.find((i) => i.id === s.itemId);
            return (
              <li key={s.id} className="border-b border-line py-5">
                <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] text-ink-muted">
                  <span className="font-bold text-ink">{s.from}</span>
                  {s.group && <span className="rounded bg-paper px-1.5 py-px font-semibold">{s.group === "partner" ? "Partner" : "Ambassador"}</span>}
                  <span className="text-ink-faint">{localDateTime(s.at)}</span>
                </p>
                <p className="mt-2 text-[15px] leading-relaxed">{s.text}</p>
                {s.link && (
                  <a href={s.link} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 break-all text-[13px] font-semibold text-sky-ink hover:underline">
                    <Link2 size={13} className="shrink-0" /> {s.link}
                  </a>
                )}
                <div className="mt-3 flex items-center gap-2">
                  {s.status === "new" && (
                    <>
                      <button
                        type="button"
                        className="btn-primary h-8 text-[13px]"
                        onClick={async () => {
                          const it = await act((st) => st.resolveSuggestion(s.id, "accept"), "Added to Ideas");
                          if (it) open(it.id);
                        }}
                      >
                        Make it a card
                      </button>
                      <button type="button" className="btn-quiet h-8 text-[13px]" onClick={() => act((st) => st.resolveSuggestion(s.id, "decline"), "Marked as not for now")}>
                        <X size={14} /> Not for now
                      </button>
                    </>
                  )}
                  {s.status === "accepted" &&
                    (item ? (
                      <button type="button" onClick={() => open(item.id)} className="flex items-center gap-2 text-[13px] font-semibold text-sky-ink hover:underline">
                        In the pipeline <StagePill stage={item.stage} />
                      </button>
                    ) : (
                      <span className="text-[13px] text-ink-faint">Accepted</span>
                    ))}
                  {s.status === "declined" && <span className="text-[13px] text-ink-faint">Not for now</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

/** The form itself: one screen, three fields, for anyone with the link. */
export function SuggestFormPage() {
  const act = useAct();
  const [from, setFrom] = useState("");
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [sent, setSent] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const res = await act((s) => s.addSuggestion({ from, text, link }));
    if (res) setSent(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-5 py-10">
      <div className="w-full max-w-[540px]">
        <img src={asset("kf-logo.webp")} alt="Kindness Forward" className="mb-6 h-9" />
        <div className="rounded-2xl border border-line bg-white p-6 md:p-8">
          {sent ? (
            <div className="py-4">
              <PauseMark className="mb-5 h-9" />
              <h1 className="text-[26px] font-extrabold leading-tight tracking-[-0.025em]">Thank you. It's with the team.</h1>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">Your idea is in the suggestion box. If it goes ahead, you'll see it in the pipeline.</p>
              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setSent(false);
                    setText("");
                    setLink("");
                  }}
                >
                  Send another
                </button>
                <Link to="/inbox" className="btn-primary">
                  See the Inbox
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={send} className="space-y-5">
              <div>
                <p className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-ink-muted">
                  <PauseMark className="h-3.5" /> Kindness Hub
                </p>
                <h1 className="text-[28px] font-extrabold leading-tight tracking-[-0.025em]">Have an idea for a post?</h1>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-muted">Tell us in a sentence or two. The marketing team reads every one.</p>
              </div>
              <div>
                <label htmlFor="text" className="label">
                  Your idea
                </label>
                <textarea id="text" value={text} onChange={(e) => setText(e.target.value)} rows={5} required placeholder="For example: a short video for schools showing how a class can do the one-minute pause together." className="field resize-y leading-relaxed" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="from" className="label">
                    Your name
                  </label>
                  <input id="from" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="So we can come back to you" className="field" />
                </div>
                <div>
                  <label htmlFor="link" className="label">
                    A link, if you have one
                  </label>
                  <input id="link" type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" className="field" />
                </div>
              </div>
              <button type="submit" className="btn-primary h-11 w-full text-[15px]" disabled={!text.trim()}>
                Send it to the team
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
