import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, Trash2, X } from "lucide-react";
import { StagePill } from "./bits";
import { ConsentLine, StoryPicture } from "./StoryTile";
import { useAct, useCommunity, useHub, useItems, useStories } from "@/lib/hub";
import { CONSENT, consentOk } from "@/lib/stories";
import type { Consent, Story } from "@/lib/types";

/** One story from the bank: look at it, say who is in it and whether they agreed, and put it to work. */
export default function StoryPanel() {
  const { storyId, openStory } = useHub();
  const { data: stories = [] } = useStories();
  const story = stories.find((s) => s.id === storyId);

  return (
    <Dialog.Root open={!!story} onOpenChange={(v) => !v && openStory(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-navy/20 data-[state=open]:animate-fade-in" />
        <Dialog.Content aria-describedby={undefined} onOpenAutoFocus={(e) => e.preventDefault()} className="fixed left-1/2 top-1/2 z-50 flex max-h-[94vh] w-[calc(100vw-24px)] max-w-[940px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-lift outline-none data-[state=open]:animate-fade-in">
          {story && <Body key={story.id} story={story} onClose={() => openStory(null)} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Body({ story, onClose }: { story: Story; onClose: () => void }) {
  const act = useAct();
  const { open } = useHub();
  const { data: items = [] } = useItems();
  const { data: community } = useCommunity();

  // typing stays local and saves a moment after you stop
  const [draft, setDraft] = useState(story);
  const [tags, setTags] = useState(story.tags.join(", "));
  const pending = useRef<Partial<Story>>({});
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const flush = async () => {
    clearTimeout(timer.current);
    const patch = pending.current;
    pending.current = {};
    if (Object.keys(patch).length) await act((s) => s.saveStory(story.id, patch));
  };
  const update = (patch: Partial<Story>) => {
    setDraft((d) => ({ ...d, ...patch }));
    pending.current = { ...pending.current, ...patch };
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 400);
  };
  useEffect(() => () => void flush(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const usedIn = items.filter((i) => i.assets.some((a) => a.storyId === story.id));
  const openCards = items.filter((i) => !["scheduled", "posted"].includes(i.stage) && !i.assets.some((a) => a.storyId === story.id));
  const ok = consentOk(draft.consent, draft.minors);
  const stopped = !!draft.minors && !ok;
  const [target, setTarget] = useState("");

  const start = async () => {
    await flush();
    const item = await act((s) => s.startFromStory(story.id), "A new card is in Planning with this on it");
    if (item) {
      onClose();
      open(item.id);
    }
  };
  const attach = async () => {
    if (!target) return;
    await flush();
    const item = await act((s) => s.attachStory(story.id, target), "Added to the card");
    if (item) {
      onClose();
      open(item.id);
    }
  };

  return (
    <>
      <header className="flex items-center gap-3 border-b border-line px-5 py-3">
        <Dialog.Title asChild>
          <input value={draft.title} onChange={(e) => update({ title: e.target.value })} placeholder="Give it a name people will search for" className="min-w-0 flex-1 bg-transparent text-[18px] font-extrabold tracking-[-0.015em] outline-none placeholder:font-semibold placeholder:text-ink-faint" />
        </Dialog.Title>
        <Dialog.Close className="btn-quiet -mr-2 h-9 w-9 shrink-0 px-0" aria-label="Close">
          <X size={18} />
        </Dialog.Close>
      </header>

      <div className="grid flex-1 gap-x-7 gap-y-6 overflow-y-auto p-5 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* the thing itself */}
        <div className="min-w-0">
          <div className="overflow-hidden rounded-xl border border-line bg-paper">
            {draft.kind === "clip" && draft.url ? <video src={draft.url} poster={draft.poster} controls playsInline preload="metadata" className="max-h-[420px] w-full object-contain" /> : draft.kind === "photo" && draft.url ? <img src={draft.url} alt="" className="max-h-[420px] w-full object-contain" /> : <StoryPicture story={draft} className="min-h-[180px]" />}
          </div>
          <label className="label mt-4" htmlFor="st-words">
            {draft.kind === "words" ? "Their words" : "A line worth quoting from it"}
          </label>
          <textarea id="st-words" rows={draft.kind === "words" ? 6 : 2} value={draft.words ?? ""} onChange={(e) => update({ words: e.target.value })} placeholder={draft.kind === "words" ? "The story or the quote, in their own words." : "Optional. Handy when someone searches for a quote."} className="field resize-y leading-relaxed" />

          <h3 className="section-title mt-6">Where it has been used</h3>
          {usedIn.length === 0 ? (
            <p className="mt-1.5 text-[13.5px] text-ink-muted">Not in a post yet.</p>
          ) : (
            <ul className="mt-1.5 border-t border-line">
              {usedIn.map((i) => (
                <li key={i.id} className="border-b border-line">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 py-2 text-left text-[13.5px] hover:bg-paper"
                    onClick={() => {
                      onClose();
                      open(i.id);
                    }}
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">{i.title || "Untitled"}</span>
                    <StagePill stage={i.stage} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* what the team needs to know about it */}
        <div className="min-w-0 space-y-4">
          <div>
            <label className="label" htmlFor="st-people">
              Who is in it
            </label>
            <input id="st-people" value={draft.people} onChange={(e) => update({ people: e.target.value })} placeholder="Names, or a description if you don't know them" className="field" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="st-source">
                Where it came from
              </label>
              <input id="st-source" value={draft.source} onChange={(e) => update({ source: e.target.value })} placeholder="Who filmed or sent it" className="field" />
            </div>
            <div>
              <label className="label" htmlFor="st-country">
                Country
              </label>
              <input id="st-country" value={draft.country ?? ""} onChange={(e) => update({ country: e.target.value || undefined })} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="st-partner">
                Partner, if any
              </label>
              <input id="st-partner" list="st-partners" value={draft.partner ?? ""} onChange={(e) => update({ partner: e.target.value || undefined })} className="field" />
              <datalist id="st-partners">
                {(community?.partners ?? []).filter((p) => p.category !== "Government").map((p) => <option key={p.name} value={p.name} />)}
              </datalist>
            </div>
            <div>
              <label className="label" htmlFor="st-credit">
                Credit
              </label>
              <input id="st-credit" value={draft.credit ?? ""} onChange={(e) => update({ credit: e.target.value || undefined })} placeholder="How to credit it" className="field" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="st-tags">
              Tags <span className="font-medium text-ink-faint">(separated by commas)</span>
            </label>
            <input
              id="st-tags"
              value={tags}
              onChange={(e) => {
                setTags(e.target.value);
                update({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) });
              }}
              placeholder="schools, music, 11.11"
              className="field"
            />
          </div>

          <section className="rounded-xl bg-paper p-4">
            <h3 className="section-title">Did they agree to be shared</h3>
            <select value={draft.consent} onChange={(e) => update({ consent: e.target.value as Consent })} className="field mt-2.5" aria-label="Consent">
              {(Object.keys(CONSENT) as Consent[]).map((c) => (
                <option key={c} value={c}>
                  {CONSENT[c].label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[12.5px] text-ink-muted">{CONSENT[draft.consent].hint}</p>
            <label className="label mt-3" htmlFor="st-note">
              Where the yes is kept, or what was agreed
            </label>
            <input id="st-note" value={draft.consentNote ?? ""} onChange={(e) => update({ consentNote: e.target.value || undefined })} placeholder="For example: release form in the Drive, Consent folder, November" className="field" />
            <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-[13.5px]">
              <input type="checkbox" checked={!!draft.minors} onChange={(e) => update({ minors: e.target.checked })} className="mt-0.5 h-4 w-4 shrink-0 accent-[#0e234b]" />
              <span>
                <span className="font-semibold">A child can be recognised in it</span>
                <span className="block text-[12.5px] text-ink-muted">Then it needs a written yes from a parent or guardian on file before it can go on a post.</span>
              </span>
            </label>
            <ConsentLine consent={draft.consent} minors={draft.minors} className="mt-3" />
          </section>
        </div>
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">
        <button
          type="button"
          className="btn-quiet px-2.5 text-ink-faint hover:bg-rose-soft hover:text-rose-ink"
          onClick={async () => {
            if (!window.confirm("Remove this from the story bank? Posts that already use it keep their copy.")) return;
            pending.current = {};
            await act((s) => s.deleteStory(story.id), "Removed from the bank");
            onClose();
          }}
        >
          <Trash2 size={15} /> Remove
        </button>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {stopped ? (
            <p className="text-[13px] font-medium text-rose-ink">It can go on a post once the written yes is on file.</p>
          ) : (
            <>
              {openCards.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <select value={target} onChange={(e) => setTarget(e.target.value)} className="field h-9 w-[190px] py-0 pr-8 text-[13.5px]" aria-label="Add to a card">
                    <option value="">Add to a card...</option>
                    {openCards.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.title || "Untitled"}
                      </option>
                    ))}
                  </select>
                  {target && (
                    <button type="button" className="btn-ghost" onClick={attach}>
                      Add
                    </button>
                  )}
                </span>
              )}
              <button type="button" className="btn-primary" onClick={start}>
                Start a post with this <ArrowRight size={15} strokeWidth={2.4} />
              </button>
            </>
          )}
        </div>
      </footer>
    </>
  );
}
