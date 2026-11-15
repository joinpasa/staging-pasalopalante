import { Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, Ban, Camera, Check, CircleCheck, ImagePlus, Images, Send, Trash2, TriangleAlert, Undo2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, cx, PlatformDot, Segmented } from "./bits";
import StoryPicker from "./StoryPicker";
import { checkCaption, checkItem, type Finding } from "@/lib/checks";
import { useAccounts, useAct, useHub, useItems, useMe, useMembers } from "@/lib/hub";
import { FORMATS, PLATFORMS, STAGES, stageIndex } from "@/lib/stages";
import { isoToPrInput, localDateTime, prDateTime, prInputToIso } from "@/lib/time";
import type { Account, Asset, Item, Member, Platform } from "@/lib/types";
import MakeGuide from "./MakeGuide";
import TrackedLinks from "./TrackedLinks";

/** The side panel where one card is planned, made ready, checked and scheduled. */
export default function ItemDrawer() {
  const { openId, open } = useHub();
  const { data: items = [] } = useItems();
  const item = items.find((i) => i.id === openId);

  return (
    <Dialog.Root open={!!openId && !!item} onOpenChange={(v) => !v && open(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-navy/20 data-[state=open]:animate-fade-in" />
        <Dialog.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[900px] flex-col border-l border-line bg-white shadow-lift outline-none data-[state=open]:animate-drawer-in"
        >
          {item && <Editor key={item.id} item={item} onClose={() => open(null)} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Where the card is on its way from idea to live. */
function Stepper({ stage }: { stage: Item["stage"] }) {
  const at = stageIndex(stage);
  return (
    <ol className="flex gap-1" aria-label={`Stage: ${STAGES[at].label}`}>
      {STAGES.map((s, i) => (
        <li key={s.id} className="min-w-0 flex-1">
          <span className={cx("block h-[3px] rounded-full", i < at ? "bg-navy" : i === at ? s.bar : "bg-line")} />
          <span className={cx("mt-1.5 block truncate text-[11.5px]", i === at ? "font-bold text-ink" : "hidden font-medium text-ink-faint sm:block")}>{s.label}</span>
        </li>
      ))}
    </ol>
  );
}

function Editor({ item, onClose }: { item: Item; onClose: () => void }) {
  const act = useAct();
  const { data: members = [] } = useMembers();
  const { data: accounts = [] } = useAccounts();
  const { data: me } = useMe();

  // Typing stays local and is saved a moment after you stop, so the panel never fights the keyboard.
  const [draft, setDraft] = useState<Item>(item);
  const pending = useRef<Partial<Item>>({});
  const timer = useRef<ReturnType<typeof setTimeout>>();
  // set while a reviewer is writing what needs to change
  const [sendBack, setSendBack] = useState<string | null>(null);

  // Things the hub changes itself (files, stage, activity) flow back in.
  useEffect(() => {
    setDraft((d) => ({ ...d, assets: item.assets, stage: item.stage, activity: item.activity, approvedBy: item.approvedBy, approvedAt: item.approvedAt, needsChanges: item.needsChanges, ghlPostId: item.ghlPostId, ownerId: pending.current.ownerId !== undefined ? d.ownerId : item.ownerId }));
  }, [item.assets, item.stage, item.activity, item.approvedBy, item.approvedAt, item.needsChanges, item.ghlPostId, item.ownerId]);

  const flush = async () => {
    clearTimeout(timer.current);
    const patch = pending.current;
    pending.current = {};
    if (Object.keys(patch).length) await act((s) => s.saveItem(item.id, patch));
  };
  const update = (patch: Partial<Item>) => {
    setDraft((d) => ({ ...d, ...patch }));
    pending.current = { ...pending.current, ...patch };
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 450);
  };
  useEffect(() => () => void flush(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const findings = useMemo(() => checkItem(draft), [draft]);
  const blocks = findings.filter((f) => f.level === "block");
  const locked = draft.stage === "scheduled" || draft.stage === "posted";
  const canApprove = me && me.role !== "member";
  const isEmail = draft.format === "email";
  const approver = members.find((m) => m.id === draft.approvedBy);

  const move = async (stage: Item["stage"], note?: string, done?: string) => {
    await flush();
    await act((s) => s.moveItem(item.id, stage, note), done);
  };

  return (
    <>
      {/* header */}
      <header className="border-b border-line px-5 pb-4 pt-4 md:px-8">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <Stepper stage={draft.stage} />
          </div>
          <Dialog.Close className="btn-quiet -mr-2 -mt-1 h-9 w-9 shrink-0 px-0" aria-label="Close">
            <X size={19} />
          </Dialog.Close>
        </div>
        <Dialog.Title asChild>
          <input
            value={draft.title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="Give it a title"
            disabled={locked}
            className="mt-4 w-full bg-transparent text-[24px] font-extrabold leading-tight tracking-[-0.02em] outline-none placeholder:text-ink-faint md:text-[26px]"
          />
        </Dialog.Title>
        {(draft.source === "brief" || draft.source === "suggestion") && <p className="mt-1 text-[12.5px] font-medium text-ink-faint">{draft.source === "brief" ? "From the weekly brief" : "From the suggestion box"}</p>}
      </header>

      {/* body */}
      <div className="flex-1 overflow-y-auto px-5 py-6 md:px-8">
        {draft.needsChanges && (
          <p className="mb-6 flex items-start gap-2 rounded-lg bg-orange-soft px-3.5 py-3 text-[14px] font-medium text-orange-ink">
            <Undo2 size={16} className="mt-0.5 shrink-0" />
            <span>
              Sent back with a note: <span className="font-bold">{draft.needsChanges}</span>
            </span>
          </p>
        )}

        <div className="grid gap-x-9 gap-y-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* left: the content */}
          <div className="min-w-0 space-y-7">
            {!isEmail && <MediaBlock item={draft} locked={locked} />}

            <section>
              <label className="label" htmlFor="notes">
                What is it, and why
              </label>
              <textarea id="notes" value={draft.notes} onChange={(e) => update({ notes: e.target.value })} disabled={locked} rows={3} placeholder="The idea in a sentence or two. One hook, one story, one call to action." className="field resize-y leading-relaxed" />
            </section>

            {isEmail ? <EmailFields draft={draft} update={update} locked={locked} /> : <Captions draft={draft} update={update} locked={locked} />}

            {isEmail && (
              <Link to={`/newsletter/${draft.id}`} onClick={onClose} className="flex items-center justify-between gap-3 rounded-xl border border-navy/15 bg-sky-soft/50 px-4 py-3 text-[14px] font-bold text-navy hover:border-navy/40">
                {draft.design ? "Open the email's design" : "Design the email: blocks, both languages, a real preview"}
                <span aria-hidden>→</span>
              </Link>
            )}

            {!["scheduled", "posted"].includes(draft.stage) && <MakeGuide format={draft.format} />}

            <section>
              <h3 className="section-title mb-3">Notes and history</h3>
              <ActivityBlock item={draft} members={members} />
            </section>
          </div>

          {/* right: checks, who, when, where */}
          <aside className="space-y-6 lg:border-l lg:border-line lg:pl-7">
            <section>
              <h3 className="section-title mb-2.5">Before it goes out</h3>
              <FindingList findings={findings} />
            </section>

            {!isEmail && <TrackedLinks item={draft} />}

            <section className="space-y-4 border-t border-line pt-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="owner">
                    Owner
                  </label>
                  <select id="owner" value={draft.ownerId ?? ""} onChange={(e) => update({ ownerId: e.target.value || undefined })} disabled={locked} className="field">
                    <option value="">Nobody yet</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="format">
                    Format
                  </label>
                  <select id="format" value={draft.format} onChange={(e) => update({ format: e.target.value as Item["format"] })} disabled={locked} className="field">
                    {FORMATS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <When draft={draft} update={update} locked={locked} />
            </section>

            {!isEmail && (
              <section className="border-t border-line pt-5">
                <h3 className="section-title mb-3">Where it goes</h3>
                <AccountPicker accounts={accounts} value={draft.accountIds} onChange={(accountIds) => update({ accountIds })} locked={locked} />
              </section>
            )}

            {!isEmail && (
              <section className="border-t border-line pt-5">
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input type="checkbox" checked={!!draft.inKit} onChange={(e) => update({ inKit: e.target.checked })} className="mt-0.5 h-4 w-4 shrink-0 accent-[#0e234b]" />
                  <span>
                    <span className="block text-[13.5px] font-semibold">Offer it to partners and ambassadors</span>
                    <span className="block text-[12.5px] leading-snug text-ink-muted">Once it is approved it appears in this week's kit, ready for them to share.</span>
                  </span>
                </label>
              </section>
            )}
          </aside>
        </div>
      </div>

      {/* footer: the next step */}
      <footer className="flex flex-wrap items-center gap-2 border-t border-line bg-white px-5 py-3 md:px-8">
        {sendBack !== null ? (
          <form
            className="flex w-full items-center gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const note = sendBack.trim();
              if (!note) return;
              setSendBack(null);
              await move("creating", note, "Sent back with your note");
            }}
          >
            <input autoFocus value={sendBack} onChange={(e) => setSendBack(e.target.value)} placeholder="What needs to change? One clear sentence helps most." className="field" />
            <button type="button" className="btn-quiet shrink-0" onClick={() => setSendBack(null)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary shrink-0" disabled={!sendBack.trim()}>
              Send back
            </button>
          </form>
        ) : (
          <>
            {!locked && (
              <button
                type="button"
                className="btn-quiet px-2.5 text-ink-faint hover:bg-rose-soft hover:text-rose-ink"
                onClick={async () => {
                  if (!window.confirm("Delete this card? This cannot be undone.")) return;
                  pending.current = {};
                  await act((s) => s.deleteItem(item.id), "Card deleted");
                  onClose();
                }}
              >
                <Trash2 size={15} /> Delete
              </button>
            )}
            {approver && draft.stage === "approved" && (
              <p className="flex items-center gap-1.5 text-[13px] font-medium text-ink-muted">
                <Avatar member={approver} size={20} /> Approved by {approver.name}
              </p>
            )}
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              {draft.stage === "idea" && (
                <button type="button" className="btn-primary" onClick={() => move("planning", undefined, "It's yours. Moved to Planning.")}>
                  Claim and plan <ArrowRight size={15} strokeWidth={2.4} />
                </button>
              )}
              {draft.stage === "planning" && (
                <button type="button" className="btn-primary" onClick={() => move("creating")}>
                  Start creating <ArrowRight size={15} strokeWidth={2.4} />
                </button>
              )}
              {draft.stage === "creating" && (
                <button type="button" className="btn-primary" onClick={() => move("review", undefined, "Sent for review")}>
                  Send for review <ArrowRight size={15} strokeWidth={2.4} />
                </button>
              )}
              {draft.stage === "review" && (
                <>
                  <button type="button" className="btn-ghost" onClick={() => setSendBack("")}>
                    <Undo2 size={15} /> Needs changes
                  </button>
                  <button type="button" className="btn-primary" disabled={!canApprove} title={canApprove ? undefined : "Only an approver can approve"} onClick={() => move("approved", undefined, "Approved")}>
                    <Check size={15} strokeWidth={2.8} /> Approve
                  </button>
                </>
              )}
              {draft.stage === "approved" && (
                <>
                  <button type="button" className="btn-ghost" onClick={() => move("review")}>
                    <Undo2 size={15} /> Back to review
                  </button>
                  <button
                    type="button"
                    className="btn-accent"
                    disabled={blocks.length > 0 || !canApprove}
                    title={blocks.length ? `Fix first: ${blocks[0].title}` : canApprove ? undefined : "Only an approver can schedule it"}
                    onClick={async () => {
                      await flush();
                      await act((s) => s.schedule(item.id), isEmail ? "Email scheduled" : "Post scheduled");
                    }}
                  >
                    <Send size={15} strokeWidth={2.4} /> {isEmail ? "Schedule email" : "Schedule post"}
                  </button>
                </>
              )}
              {locked && (
                <p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-muted">
                  <CircleCheck size={16} className="text-[#2f9e6e]" />
                  {draft.stage === "posted" ? "Live" : "Scheduled"}
                  {draft.publishAt && <span className="font-medium">· {prDateTime(draft.publishAt)} Puerto Rico</span>}
                </p>
              )}
            </div>
          </>
        )}
      </footer>
    </>
  );
}

/* ---------------- files and cover ---------------- */

function MediaBlock({ item, locked }: { item: Item; locked: boolean }) {
  const act = useAct();
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [drag, setDrag] = useState(false);
  const [picking, setPicking] = useState(false);
  const media = item.assets.filter((a) => a.kind === "media");
  const cover = item.assets.find((a) => a.kind === "cover");
  const video = media.find((a) => a.mime.startsWith("video/"));

  const addFiles = async (files: FileList | null, kind: Asset["kind"]) => {
    if (!files?.length) return;
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/") && !f.type.startsWith("video/")) {
        toast.error(`${f.name} is not an image or a video.`);
        continue;
      }
      await act((s) => s.addAsset(item.id, f, kind));
    }
  };

  // Take the frame the video is paused on and use it as the cover.
  const grabFrame = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      canvas.getContext("2d")!.drawImage(v, 0, 0);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.9));
      if (!blob) throw new Error("empty");
      await act((s) => s.addAssetFromBlob(item.id, blob, "cover-from-video.jpg", "cover"), "Cover set from this frame");
    } catch {
      toast.error("This video is hosted elsewhere, so a frame can't be taken from it here. Upload a cover image instead.");
    }
  };

  return (
    <section>
      {media.length === 0 ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            addFiles(e.dataTransfer.files, "media");
          }}
          className={cx("flex items-center gap-4 rounded-xl border border-dashed px-5 py-6 transition", drag ? "border-sky bg-sky-soft" : "border-line bg-paper")}
        >
          <Upload size={20} strokeWidth={2} className="shrink-0 text-ink-faint" />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold">Drop the image or video here</p>
            <p className="text-[13px] text-ink-muted">Several images make a carousel. Videos need a cover before they can go out.</p>
          </div>
          <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
            <button type="button" className="btn-ghost" onClick={() => setPicking(true)} disabled={locked}>
              <Images size={15} /> Story bank
            </button>
            <button type="button" className="btn-ghost" onClick={() => fileRef.current?.click()} disabled={locked}>
              Choose files
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_156px]">
          <div className="overflow-hidden rounded-xl border border-line bg-paper">
            {video ? (
              <video ref={videoRef} src={video.url} controls playsInline preload="metadata" poster={cover?.url} className="max-h-[400px] w-full object-contain" />
            ) : (
              <div className={cx("grid gap-px bg-line", media.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
                {media.map((a) => (
                  <div key={a.id} className="group relative bg-paper">
                    <img src={a.url} alt={a.name} className="max-h-[400px] w-full object-contain" />
                    {!locked && (
                      <button type="button" aria-label={`Remove ${a.name}`} onClick={() => act((s) => s.removeAsset(item.id, a.id))} className="absolute right-2 top-2 hidden h-7 w-7 items-center justify-center rounded-full bg-navy/85 text-white group-hover:flex">
                        <X size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            {video && (
              <div className="mb-2">
                <p className="label">Cover</p>
                {cover ? (
                  <div className="group relative overflow-hidden rounded-lg border border-line">
                    <img src={cover.url} alt="Cover" className="aspect-[4/5] w-full object-cover" />
                    {!locked && (
                      <button type="button" aria-label="Remove cover" onClick={() => act((s) => s.removeAsset(item.id, cover.id))} className="absolute right-1.5 top-1.5 hidden h-7 w-7 items-center justify-center rounded-full bg-navy/85 text-white group-hover:flex">
                        <X size={15} />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex aspect-[4/5] w-full items-center justify-center rounded-lg border border-dashed border-rose/60 bg-rose-soft px-3 text-center text-[12.5px] font-semibold text-rose-ink">No cover yet</div>
                )}
              </div>
            )}
            {!locked && (
              <>
                {video && (
                  <>
                    <button type="button" className="btn-ghost h-8 w-full text-[13px]" onClick={() => coverRef.current?.click()}>
                      <ImagePlus size={14} /> Upload cover
                    </button>
                    <button type="button" className="btn-ghost h-8 w-full text-[13px]" onClick={grabFrame} title="Pause the video on the frame you want, then press this">
                      <Camera size={14} /> Use this frame
                    </button>
                  </>
                )}
                <button type="button" className="btn-quiet h-8 w-full text-[13px]" onClick={() => fileRef.current?.click()}>
                  <Upload size={14} /> Add {video ? "another file" : "more images"}
                </button>
                <button type="button" className="btn-quiet h-8 w-full text-[13px]" onClick={() => setPicking(true)}>
                  <Images size={14} /> From the story bank
                </button>
                {video && (
                  <button type="button" className="btn-quiet h-8 w-full text-[13px] hover:bg-rose-soft hover:text-rose-ink" onClick={() => act((s) => s.removeAsset(item.id, video.id))}>
                    <Trash2 size={14} /> Remove video
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => (addFiles(e.target.files, "media"), (e.target.value = ""))} />
      <input ref={coverRef} type="file" accept="image/*" hidden onChange={(e) => (addFiles(e.target.files, "cover"), (e.target.value = ""))} />
      <StoryPicker item={item} open={picking} onClose={() => setPicking(false)} />
    </section>
  );
}

/* ---------------- captions ---------------- */

function Captions({ draft, update, locked }: { draft: Item; update: (p: Partial<Item>) => void; locked: boolean }) {
  const [lang, setLang] = useState<"en" | "es">("en");
  const value = lang === "en" ? draft.captionEn : draft.captionEs;
  const findings = checkCaption(value, { needsHashtag: lang === "en" && draft.format !== "story" });

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="section-title">Caption</h3>
        <Segmented
          value={lang}
          onChange={setLang}
          options={
            [
              ["en", "English"],
              ["es", "Español"],
            ] as const
          }
        />
      </div>
      <textarea
        value={value}
        onChange={(e) => update(lang === "en" ? { captionEn: e.target.value } : { captionEs: e.target.value })}
        disabled={locked}
        rows={7}
        placeholder={lang === "en" ? "Write the caption. Warm, natural, full sentences." : "Escribe el texto en español."}
        className="field resize-y leading-relaxed"
      />
      <div className="mt-2 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {findings.length > 0 ? (
            <FindingList findings={findings} compact />
          ) : value.trim() ? (
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-ink-muted">
              <CircleCheck size={14} className="text-[#2f9e6e]" /> Reads well against the brand rules
            </p>
          ) : null}
        </div>
        <span className="shrink-0 text-[12px] tabular-nums text-ink-faint">{value.length} characters</span>
      </div>
    </section>
  );
}

/* ---------------- email ---------------- */

function EmailFields({ draft, update, locked }: { draft: Item; update: (p: Partial<Item>) => void; locked: boolean }) {
  const findings = checkCaption(`${draft.subject ?? ""}\n${draft.captionEn}`, { needsHashtag: false });
  return (
    <section className="space-y-4">
      <div>
        <label className="label" htmlFor="subject">
          Subject line
        </label>
        <input id="subject" value={draft.subject ?? ""} onChange={(e) => update({ subject: e.target.value })} disabled={locked} placeholder="What makes someone open it" className="field" />
      </div>
      <div>
        <label className="label" htmlFor="body">
          The email
        </label>
        <textarea id="body" value={draft.captionEn} onChange={(e) => update({ captionEn: e.target.value })} disabled={locked} rows={10} placeholder="Write it as you would to one person." className="field resize-y leading-relaxed" />
        {findings.length > 0 && (
          <div className="mt-2">
            <FindingList findings={findings} compact />
          </div>
        )}
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">The hub places this text in the Kindness Forward email design and schedules it to the list you choose when it is approved.</p>
      </div>
    </section>
  );
}

/* ---------------- when ---------------- */

function When({ draft, update, locked }: { draft: Item; update: (p: Partial<Item>) => void; locked: boolean }) {
  const [showEvent, setShowEvent] = useState(!!draft.eventAt);
  return (
    <div className="space-y-3">
      <div>
        <label className="label" htmlFor="when">
          Goes out <span className="font-medium text-ink-faint">(Puerto Rico time)</span>
        </label>
        <input id="when" type="datetime-local" value={isoToPrInput(draft.publishAt)} onChange={(e) => update({ publishAt: prInputToIso(e.target.value) })} disabled={locked} className="field" />
        {draft.publishAt && <p className="mt-1.5 text-[12.5px] text-ink-muted">{localDateTime(draft.publishAt)} on your clock</p>}
      </div>
      {showEvent ? (
        <div>
          <label className="label" htmlFor="event">
            The moment it promotes <span className="font-medium text-ink-faint">(Puerto Rico time)</span>
          </label>
          <input id="event" type="datetime-local" value={isoToPrInput(draft.eventAt)} onChange={(e) => update({ eventAt: prInputToIso(e.target.value) })} disabled={locked} className="field" />
          <p className="mt-1.5 text-[12.5px] text-ink-muted">The hub stops the post if it would go out after this.</p>
        </div>
      ) : (
        !locked && (
          <button type="button" onClick={() => setShowEvent(true)} className="text-[13px] font-semibold text-sky-ink hover:underline">
            Promoting an event? Add its time
          </button>
        )
      )}
    </div>
  );
}

/* ---------------- accounts ---------------- */

function AccountPicker({ accounts, value, onChange, locked }: { accounts: Account[]; value: string[]; onChange: (v: string[]) => void; locked: boolean }) {
  const platforms = [...new Set(accounts.map((a) => a.platform))] as Platform[];
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  const soon = (a: Account) => a.expiresAt && new Date(a.expiresAt).getTime() - Date.now() < 21 * 86400_000;

  return (
    <ul className="space-y-3">
      {platforms.map((p) => (
        <li key={p}>
          <p className="mb-1 flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-muted">
            <PlatformDot platform={p} size={15} /> {PLATFORMS[p].label}
          </p>
          <ul>
            {accounts
              .filter((a) => a.platform === p)
              .map((a) => {
                const on = value.includes(a.id);
                return (
                  <li key={a.id}>
                    <label className={cx("flex items-center gap-2 rounded-md py-1 pl-[22px] pr-1 text-[13px]", locked ? "opacity-70" : "cursor-pointer hover:bg-paper")} title={soon(a) ? "This account's connection needs renewing soon. See Settings." : undefined}>
                      <input type="checkbox" checked={on} disabled={locked} onChange={() => toggle(a.id)} className="h-[15px] w-[15px] shrink-0 accent-[#0e234b]" />
                      <span className={cx("truncate", on ? "font-semibold text-ink" : "font-medium text-ink-muted")}>{a.name}</span>
                      {soon(a) && <TriangleAlert size={12} className="ml-auto shrink-0 text-orange" />}
                    </label>
                  </li>
                );
              })}
          </ul>
        </li>
      ))}
    </ul>
  );
}

/* ---------------- checks ---------------- */

export function FindingList({ findings, compact }: { findings: Finding[]; compact?: boolean }) {
  if (!findings.length) return <p className="text-[13.5px] text-ink-faint">Nothing to check yet.</p>;
  return (
    <ul className={compact ? "space-y-1.5" : "space-y-2.5"}>
      {findings.map((f) => (
        <li key={f.id} className="flex items-start gap-2">
          {f.level === "ok" && <CircleCheck size={15} className="mt-[2px] shrink-0 text-[#2f9e6e]" />}
          {f.level === "warn" && <TriangleAlert size={15} className="mt-[2px] shrink-0 text-orange" />}
          {f.level === "block" && <Ban size={15} className="mt-[2px] shrink-0 text-rose" />}
          <div className="min-w-0">
            <p className={cx("text-[13.5px] leading-snug", f.level === "ok" ? "font-medium text-ink-muted" : "font-semibold")}>{f.title}</p>
            {f.detail && <p className="mt-0.5 text-[12.5px] leading-snug text-ink-muted">{f.detail}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ---------------- activity ---------------- */

function ActivityBlock({ item, members }: { item: Item; members: Member[] }) {
  const act = useAct();
  const [text, setText] = useState("");
  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    await act((s) => s.comment(item.id, t));
  };
  return (
    <div>
      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Leave a note for the team" className="field" />
        <button type="button" className="btn-ghost shrink-0" onClick={send} disabled={!text.trim()}>
          Add note
        </button>
      </div>
      <ul className="mt-4 space-y-3">
        {item.activity.map((a) => {
          const m = members.find((x) => x.id === a.by);
          return (
            <li key={a.id} className="flex items-start gap-2.5">
              {m ? <Avatar member={m} size={22} /> : <span className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-paper text-[10px] font-bold text-ink-faint">H</span>}
              <p className="min-w-0 text-[13.5px] leading-snug">
                <span className="font-semibold">{m?.name ?? "The hub"}</span> <span className="text-ink-muted">{a.text}</span>
                <span className="block text-[12px] text-ink-faint">{localDateTime(a.at)}</span>
              </p>
            </li>
          );
        })}
        {item.activity.length === 0 && <li className="text-[13.5px] text-ink-faint">Nothing yet.</li>}
      </ul>
    </div>
  );
}
