import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Ban, Check, ChevronLeft, ChevronRight, CircleCheck, TriangleAlert, Undo2, Volume2, VolumeX, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, cx, FormatBadge, PauseMark, PlatformRow } from "@/components/bits";
import { checkItem } from "@/lib/checks";
import { useAccounts, useAct, useHub, useItems, useMe, useMembers } from "@/lib/hub";
import { prDateTime } from "@/lib/time";
import type { Item } from "@/lib/types";

type Verdict = "approved" | "changes";
const REASONS = ["The wording", "The picture or video", "The timing", "Not this week"];

/**
 * The review deck: one post at a time, made for a phone.
 * Swiping only moves between posts. Approving always takes a deliberate tap.
 */
export default function ReviewPage() {
  const { store } = useHub();
  const act = useAct();
  const { data: items } = useItems();
  const { data: members = [] } = useMembers();
  const { data: accounts = [] } = useAccounts();
  const { data: me } = useMe();

  // The deck is set when the page opens, so it does not reshuffle while you work through it.
  const [queue, setQueue] = useState<string[] | null>(null);
  useEffect(() => {
    if (queue || !items) return;
    setQueue(
      items
        .filter((i) => i.stage === "review")
        .sort((a, b) => (a.publishAt ?? "9").localeCompare(b.publishAt ?? "9"))
        .map((i) => i.id),
    );
  }, [items, queue]);

  const [at, setAt] = useState(0);
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const [changing, setChanging] = useState(false);
  const total = queue?.length ?? 0;
  const item = queue && items ? items.find((i) => i.id === queue[at]) : undefined;
  const go = (d: number) => {
    setChanging(false);
    setAt((i) => Math.max(0, Math.min(total, i + d)));
  };

  // arrow keys on a computer, a sideways swipe on a phone
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select")) return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  const touch = useRef<{ x: number; y: number } | null>(null);

  const decide = async (it: Item, verdict: Verdict, note?: string) => {
    const res = await act((s) => s.moveItem(it.id, verdict === "approved" ? "approved" : "creating", note));
    if (!res) return;
    setVerdicts((v) => ({ ...v, [it.id]: verdict }));
    setChanging(false);
    const place = at;
    toast(verdict === "approved" ? "Approved" : "Sent back with your note", {
      duration: 6000,
      position: "top-center",
      action: {
        label: "Undo",
        onClick: async () => {
          await act((s) => s.moveItem(it.id, "review"));
          setVerdicts((v) => {
            const next = { ...v };
            delete next[it.id];
            return next;
          });
          setAt(place);
        },
      },
    });
    setAt((i) => i + 1);
  };

  if (!queue || !items) return null;
  const approved = Object.values(verdicts).filter((v) => v === "approved").length;
  const sentBack = Object.values(verdicts).filter((v) => v === "changes").length;
  const skipped = queue.filter((id) => !verdicts[id]);

  return (
    <div className="flex min-h-[100dvh] justify-center bg-paper">
      <div
        className="flex h-[100dvh] w-full max-w-[480px] flex-col bg-white sm:border-x sm:border-line"
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          const s = touch.current;
          touch.current = null;
          if (!s || changing) return;
          const dx = e.changedTouches[0].clientX - s.x;
          const dy = e.changedTouches[0].clientY - s.y;
          if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
        }}
      >
        {/* where you are in the deck */}
        <header className="px-4 pb-3 pt-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="btn-quiet -ml-2 h-9 w-9 px-0" aria-label="Close the review deck">
              <X size={19} />
            </Link>
            <p className="flex items-center gap-2 text-[13.5px] font-bold">
              <PauseMark className="h-3.5" /> Review
            </p>
            <p className="ml-auto text-[13px] font-medium tabular-nums text-ink-muted">{total === 0 ? "" : at < total ? `${at + 1} of ${total}` : "Done"}</p>
          </div>
          {total > 0 && (
            <ol className="mt-2.5 flex gap-1" aria-hidden>
              {queue.map((id, i) => (
                <li key={id} className={cx("h-[3px] flex-1 rounded-full", verdicts[id] === "approved" ? "bg-[#2f9e6e]" : verdicts[id] === "changes" ? "bg-orange" : i === at ? "bg-navy" : "bg-line")} />
              ))}
            </ol>
          )}
          {store.mode === "demo" && (
            <label className="mt-2 flex items-center gap-1.5 text-[12px] text-ink-faint">
              Reviewing as
              <select value={me?.id ?? ""} onChange={(e) => act((s) => s.setMe(e.target.value))} className="cursor-pointer rounded bg-transparent font-semibold text-ink-muted outline-none">
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}, {m.role}
                  </option>
                ))}
              </select>
            </label>
          )}
        </header>

        {total === 0 ? (
          <Finished title="Nothing is waiting for you" body="When the team sends a post for review, it shows up here." />
        ) : !item || at >= total ? (
          <Finished
            title={skipped.length ? "That's the end of the deck" : "All done. Thank you."}
            body={[approved && `${approved} approved`, sentBack && `${sentBack} sent back with a note`, skipped.length && `${skipped.length} left for later`].filter(Boolean).join(", ") + "."}
            again={skipped.length ? () => setAt(queue.indexOf(skipped[0])) : undefined}
          />
        ) : (
          <Slide key={item.id} item={item} owner={members.find((m) => m.id === item.ownerId)} accounts={accounts}>
            {verdicts[item.id] ? (
              <div className="flex items-center gap-3">
                <p className="flex flex-1 items-center gap-2 text-[14.5px] font-semibold">
                  {verdicts[item.id] === "approved" ? <CircleCheck size={18} className="text-[#2f9e6e]" /> : <Undo2 size={17} className="text-orange" />}
                  {verdicts[item.id] === "approved" ? "You approved this" : "You sent this back"}
                </p>
                <button type="button" className="btn-ghost h-11 px-4" onClick={() => go(1)}>
                  Next <ChevronRight size={16} />
                </button>
              </div>
            ) : me?.role === "member" || (item.ownerId === me?.id && me?.role !== "admin") ? (
              <div className="flex items-center gap-3">
                <p className="flex-1 text-[13.5px] leading-snug text-ink-muted">{me?.role === "member" ? "Only an approver can sign a post off." : "This one is yours, so someone else signs it off."}</p>
                <button type="button" className="btn-ghost h-11 px-4" onClick={() => go(1)}>
                  Next <ChevronRight size={16} />
                </button>
              </div>
            ) : changing ? (
              <ChangeForm onCancel={() => setChanging(false)} onSend={(note) => decide(item, "changes", note)} />
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <button type="button" className="btn-ghost h-12 text-[15px]" onClick={() => setChanging(true)}>
                  <Undo2 size={17} /> Change this
                </button>
                <button type="button" className="btn-primary h-12 text-[15px]" onClick={() => decide(item, "approved")}>
                  <Check size={18} strokeWidth={2.8} /> Looks good
                </button>
              </div>
            )}
          </Slide>
        )}
      </div>
    </div>
  );
}

/* ---------------- one post ---------------- */

function Slide({ item, owner, accounts, children }: { item: Item; owner?: React.ComponentProps<typeof Avatar>["member"]; accounts: React.ComponentProps<typeof PlatformRow>["accounts"]; children: React.ReactNode }) {
  const [es, setEs] = useState(false);
  const [more, setMore] = useState(false);
  const caption = es && item.captionEs.trim() ? item.captionEs : item.captionEn;
  const flags = checkItem(item).filter((f) => f.level !== "ok");

  return (
    <>
      <div className="min-h-0 flex-1 bg-paper animate-fade-in">
        <Media item={item} />
      </div>

      <div className="max-h-[40dvh] overflow-y-auto px-4 pb-3 pt-4">
        <h1 className="text-[19px] font-extrabold leading-snug tracking-[-0.015em]">{item.title || "Untitled"}</h1>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-muted">
          <FormatBadge format={item.format} />
          <PlatformRow accountIds={item.accountIds} accounts={accounts} size={17} />
          {item.publishAt && <span>{prDateTime(item.publishAt)}, Puerto Rico</span>}
          {owner && (
            <span className="inline-flex items-center gap-1.5">
              <Avatar member={owner} size={18} /> {owner.name}
            </span>
          )}
        </p>

        {flags.length > 0 ? (
          <div className="mt-3 rounded-xl bg-paper px-3.5 py-3">
            <p className="text-[12.5px] font-semibold text-ink-muted">The hub noticed</p>
            <ul className="mt-1.5 space-y-1.5">
              {flags.map((f) => (
                <li key={f.id} className="flex items-start gap-2 text-[13.5px] font-medium leading-snug">
                  {f.level === "block" ? <Ban size={15} className="mt-[2px] shrink-0 text-rose" /> : <TriangleAlert size={15} className="mt-[2px] shrink-0 text-orange" />}
                  {f.title}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-3 flex items-center gap-1.5 text-[13px] text-ink-muted">
            <CircleCheck size={15} className="text-[#2f9e6e]" /> It passes every check: wording, timing, cover and consent.
          </p>
        )}
        {caption.trim() ? (
          <div className="mt-3">
            <p className={cx("whitespace-pre-line text-[14.5px] leading-relaxed", !more && "line-clamp-4")}>{caption}</p>
            <p className="mt-1 flex gap-4 text-[13px] font-semibold text-sky-ink">
              {caption.length > 180 && (
                <button type="button" onClick={() => setMore((v) => !v)}>
                  {more ? "Show less" : "Read it all"}
                </button>
              )}
              {item.captionEs.trim() && (
                <button type="button" onClick={() => setEs((v) => !v)}>
                  {es ? "In English" : "En español"}
                </button>
              )}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-[14px] text-ink-faint">{item.format === "story" ? "A story, so it goes out without a caption." : "No caption written yet."}</p>
        )}

      </div>

      <footer className="border-t border-line px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3">{children}</footer>
    </>
  );
}

function Media({ item }: { item: Item }) {
  const media = item.assets.filter((a) => a.kind === "media");
  const cover = item.assets.find((a) => a.kind === "cover");
  const [n, setN] = useState(0);
  const [muted, setMuted] = useState(true);
  const cur = media[Math.min(n, media.length - 1)];
  if (!cur) return <p className="flex h-full items-center justify-center text-[14px] text-ink-faint">No picture or video yet</p>;
  const isVideo = cur.mime.startsWith("video/");

  return (
    <div className="relative h-full">
      {isVideo ? <video key={cur.id} src={cur.url} poster={cover?.url} autoPlay loop muted={muted} playsInline onClick={() => setMuted((m) => !m)} className="h-full w-full object-contain" /> : <img key={cur.id} src={cur.url} alt="" className="h-full w-full object-contain" />}
      {isVideo && (
        <button type="button" onClick={() => setMuted((m) => !m)} className="absolute bottom-3 right-3 inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-white/95 px-3 text-[12.5px] font-semibold" aria-label={muted ? "Turn the sound on" : "Turn the sound off"}>
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />} {muted ? "Sound off" : "Sound on"}
        </button>
      )}
      {media.length > 1 && (
        <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2">
          <button type="button" onClick={() => setN((v) => Math.max(0, v - 1))} disabled={n === 0} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white/95 disabled:opacity-40" aria-label="Previous slide">
            <ChevronLeft size={17} />
          </button>
          <span className="rounded-full border border-line bg-white/95 px-3 py-1.5 text-[12.5px] font-semibold tabular-nums">
            {n + 1} of {media.length}
          </span>
          <button type="button" onClick={() => setN((v) => Math.min(media.length - 1, v + 1))} disabled={n === media.length - 1} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white/95 disabled:opacity-40" aria-label="Next slide">
            <ChevronRight size={17} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------- saying what to change ---------------- */

function ChangeForm({ onCancel, onSend }: { onCancel: () => void; onSend: (note: string) => void }) {
  const [reason, setReason] = useState("");
  const [text, setText] = useState("");
  const note = [reason, text.trim()].filter(Boolean).join(": ");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (note) onSend(note);
      }}
    >
      <p className="text-[13px] font-semibold text-ink-muted">What would you change</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {REASONS.map((r) => (
          <button key={r} type="button" aria-pressed={reason === r} onClick={() => setReason((cur) => (cur === r ? "" : r))} className={cx("h-9 rounded-full border px-3.5 text-[13.5px] font-semibold transition", reason === r ? "border-navy bg-navy text-white" : "border-line text-ink hover:border-navy/40")}>
            {r}
          </button>
        ))}
      </div>
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a few words, if you like" className="field mt-2.5 h-11" />
      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        <button type="button" className="btn-ghost h-11" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary h-11" disabled={!note}>
          Send it back
        </button>
      </div>
    </form>
  );
}

/* ---------------- the end of the deck ---------------- */

function Finished({ title, body, again }: { title: string; body: string; again?: () => void }) {
  return (
    <div className="flex flex-1 flex-col justify-center px-7 pb-16">
      <PauseMark className="mb-6 h-12" />
      <h1 className="text-[30px] font-extrabold leading-[1.1] tracking-[-0.03em]">{title}</h1>
      <p className="mt-3 text-[16px] leading-relaxed text-ink-muted">{body}</p>
      <div className="mt-8 flex flex-col gap-2.5">
        {again && (
          <button type="button" className="btn-primary h-12 text-[15px]" onClick={again}>
            Go through the ones left
          </button>
        )}
        <Link to="/suggest" className="btn-ghost h-12 text-[15px]">
          Suggest an idea
        </Link>
        <Link to="/" className="btn-quiet h-12 text-[15px]">
          Open the hub
        </Link>
      </div>
    </div>
  );
}
