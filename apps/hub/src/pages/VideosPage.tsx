import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Copy, ExternalLink, Film, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cx, Empty, PageHead, Segmented, StagePill } from "@/components/bits";
import { useAct, useItems, useVideos } from "@/lib/hub";
import type { Asset, Video, VideoGroup, VideoRights } from "@/lib/types";
import { clock, GROUP_ORDER, GROUPS, KIND_LABEL, posterFor, RIGHTS, videoKind, youtubeId } from "@/lib/videos";

type Sort = "new" | "old" | "short" | "long" | "az";
type Shape = "any" | "vertical" | "horizontal" | "square";
type Lang = "any" | "en" | "es";
type Use = "any" | VideoRights;

const SORTS: [Sort, string][] = [
  ["new", "Newest first"],
  ["old", "Oldest first"],
  ["short", "Shortest first"],
  ["long", "Longest first"],
  ["az", "A to Z"],
];

const LANG_LABEL: Record<NonNullable<Video["lang"]>, string> = { en: "English", es: "Spanish", both: "English and Spanish", none: "No words" };
const PEOPLE_LABEL: Record<NonNullable<Video["people"]>, string> = { agreed: "The people shown agreed", check: "Check who is in it before using it", none: "Nobody can be recognised" };

/** Videos with no known date sort after dated ones, whichever way the list runs. */
/** The colour a video's tile takes when there is no still to show. */
const TILE: Record<VideoGroup, string> = { ours: "bg-navy", partner: "bg-sky-ink", press: "bg-rose", event: "bg-orange-ink", reference: "bg-ink-muted" };

const byDate = (v: Video) => v.date ?? "";

/** Videos: every video the team has or has found, in one place, to sort, play and reuse. */
export default function VideosPage() {
  const { data: videos = [], isLoading } = useVideos();
  const [params, setParams] = useSearchParams();
  const group = (GROUP_ORDER as string[]).includes(params.get("group") ?? "") ? (params.get("group") as VideoGroup) : "all";
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("new");
  const [shape, setShape] = useState<Shape>("any");
  const [lang, setLang] = useState<Lang>("any");
  const [use, setUse] = useState<Use>("any");
  const [unnamed, setUnnamed] = useState(false);
  const [openId, setOpenId] = useState<string | null>(params.get("v"));
  const [adding, setAdding] = useState(false);

  const setGroup = (g: string) => {
    const next = new URLSearchParams(params);
    if (g === "all") next.delete("group");
    else next.set("group", g);
    setParams(next, { replace: true });
  };

  const list = useMemo(() => {
    const words = q.trim().toLowerCase();
    const out = videos.filter(
      (v) =>
        (group === "all" || v.group === group) &&
        (shape === "any" || v.orientation === shape) &&
        (lang === "any" || v.lang === lang || v.lang === "both") &&
        (use === "any" || v.rights === use) &&
        (!unnamed || v.tags.includes("to-name")) &&
        (!words || `${v.title} ${v.source} ${v.notes ?? ""} ${v.tags.join(" ")}`.toLowerCase().includes(words)),
    );
    const len = (v: Video, missing: number) => v.seconds ?? missing;
    out.sort((a, b) => {
      if (sort === "new") return byDate(b).localeCompare(byDate(a)) || a.title.localeCompare(b.title);
      if (sort === "old") return (byDate(a) || "9999").localeCompare(byDate(b) || "9999") || a.title.localeCompare(b.title);
      if (sort === "short") return len(a, Infinity) - len(b, Infinity);
      if (sort === "long") return len(b, -1) - len(a, -1);
      return a.title.localeCompare(b.title);
    });
    return out;
  }, [videos, group, shape, lang, use, unnamed, q, sort]);

  const count = (g: VideoGroup | "all") => (g === "all" ? videos.length : videos.filter((v) => v.group === g).length);
  const toName = videos.filter((v) => v.tags.includes("to-name")).length;
  const open = videos.find((v) => v.id === openId);

  return (
    <>
      <PageHead
        title="Videos"
        sub="Every video we have or have found, in one place. Play them here, sort them, and see at a glance which ones we are free to use and which need someone's yes first."
        actions={
          <button type="button" className="btn-primary" onClick={() => setAdding(true)}>
            <Plus size={15} /> Add a video
          </button>
        }
      />

      <div className="mb-4 overflow-x-auto pb-1">
        <Segmented
          value={group}
          onChange={setGroup}
          options={[["all", `Everything (${count("all")})`], ...GROUP_ORDER.filter((g) => count(g) > 0).map((g) => [g, `${GROUPS[g].plural} (${count(g)})`] as const)] as const}
        />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <label className="relative min-w-[220px] flex-1 sm:max-w-[320px]">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search titles, sources and notes" aria-label="Search videos" className="field h-9 py-1 pl-9" />
        </label>
        <Picker<Shape> label="Shape" value={shape} onChange={setShape} options={[["any", "Any shape"], ["vertical", "Vertical"], ["horizontal", "Landscape"], ["square", "Square"]]} />
        <Picker<Lang> label="Language" value={lang} onChange={setLang} options={[["any", "Any language"], ["en", "English"], ["es", "Spanish"]]} />
        <Picker<Use> label="Use" value={use} onChange={setUse} options={[["any", "Any use"], ...(Object.keys(RIGHTS) as VideoRights[]).map((r) => [r, RIGHTS[r].label] as [Use, string])]} />
        <Picker<Sort> label="Sort" value={sort} onChange={setSort} options={SORTS} />
        {toName > 0 && (
          <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-line px-3 text-[13px] font-semibold text-ink-muted">
            <input type="checkbox" checked={unnamed} onChange={(e) => setUnnamed(e.target.checked)} className="accent-[#0e234b]" />
            Still to name ({toName})
          </label>
        )}
      </div>

      {group !== "all" && <p className="-mt-3 mb-5 text-[13.5px] text-ink-muted">{GROUPS[group].about}</p>}

      {isLoading ? null : list.length === 0 ? (
        <Empty title={videos.length === 0 ? "No videos yet" : "Nothing matches"} body={videos.length === 0 ? "Add the first one with the button above." : "Try fewer filters."} />
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-7 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {list.map((v) => (
            <li key={v.id}>
              <Tile v={v} onOpen={() => setOpenId(v.id)} />
            </li>
          ))}
        </ul>
      )}

      <p className="mt-10 max-w-[760px] text-[13px] leading-relaxed text-ink-faint">
        Videos sent in team WhatsApp chats are not here yet. Put the ones worth keeping on the shared drive or in HighLevel's media library, then add them with the button above.
      </p>

      {open && <VideoPanel v={open} onClose={() => setOpenId(null)} />}
      {adding && <AddVideo onClose={() => setAdding(false)} onAdded={(id) => setOpenId(id)} />}
    </>
  );
}

function Picker<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: NoInfer<readonly (readonly [T, string])[]> }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)} aria-label={label} className="field h-9 w-auto py-1 pr-8 text-[13.5px]">
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

/** Loads a video's first frame only once its tile scrolls into view. */
function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (!("IntersectionObserver" in window)) {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setSeen(true), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen] as const;
}

function Tile({ v, onOpen }: { v: Video; onOpen: () => void }) {
  const act = useAct();
  const [ref, seen] = useInView<HTMLButtonElement>();
  const poster = posterFor(v);
  const r = RIGHTS[v.rights];
  // the length is measured once, the first time the file's details load here
  const measure = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const d = e.currentTarget.duration;
    if (v.seconds === undefined && Number.isFinite(d) && d > 0) void act((s) => s.saveVideo(v.id, { seconds: Math.round(d) }));
  };
  return (
    <button ref={ref} type="button" onClick={onOpen} className="group block w-full text-left">
      <span className="relative block aspect-[4/5] overflow-hidden rounded-xl bg-navy">
        {poster ? (
          <img src={poster} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
        ) : v.kind === "file" && seen ? (
          <video src={`${v.url}#t=0.5`} preload="metadata" muted playsInline onLoadedMetadata={measure} className="h-full w-full object-cover" />
        ) : (
          <span className={cx("flex h-full w-full flex-col justify-between p-4 text-white", TILE[v.group])}>
            <Film size={22} strokeWidth={1.8} className="mt-6 opacity-80" />
            <span className="text-[17px] font-extrabold leading-tight tracking-[-0.01em] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:5] [overflow:hidden]">{v.title}</span>
          </span>
        )}
        {/* a poster tile still needs the file's length, so measure it out of sight */}
        {poster && v.kind === "file" && v.seconds === undefined && seen && <video src={v.url} preload="metadata" muted className="hidden" onLoadedMetadata={measure} />}
        {v.kind !== "file" && <span className="absolute left-2 top-2 rounded-md bg-white/95 px-1.5 py-0.5 text-[11.5px] font-bold text-navy">{KIND_LABEL[v.kind]}</span>}
        {v.seconds !== undefined && <span className="absolute bottom-2 right-2 rounded-md bg-navy/85 px-1.5 py-0.5 text-[12px] font-bold tabular-nums text-white">{clock(v.seconds)}</span>}
      </span>
      <span className="mt-2.5 block text-[14px] font-bold leading-snug [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [overflow:hidden] group-hover:underline">{v.title}</span>
      <span className="mt-0.5 block truncate text-[12.5px] text-ink-muted">
        {v.source}
        {v.date && ` · ${new Date(`${v.date}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: v.date.startsWith("2026") ? undefined : "numeric" })}`}
      </span>
      <span className="mt-1.5 flex flex-wrap gap-1.5">
        <span className={cx("rounded px-1.5 py-px text-[11.5px] font-bold", r.tone)}>{r.label}</span>
        {v.lang && v.lang !== "none" && <span className="rounded bg-paper px-1.5 py-px text-[11.5px] font-semibold text-ink-muted">{v.lang === "both" ? "EN + ES" : v.lang.toUpperCase()}</span>}
        {v.tags.includes("to-name") && <span className="rounded bg-sun-soft px-1.5 py-px text-[11.5px] font-semibold text-sun-ink">To name</span>}
      </span>
    </button>
  );
}

function Player({ v }: { v: Video }) {
  const act = useAct();
  if (v.kind === "file")
    return (
      <video
        src={v.url}
        poster={posterFor(v)}
        controls
        playsInline
        className="max-h-[70vh] w-full rounded-xl bg-navy"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (v.seconds === undefined && Number.isFinite(d) && d > 0) void act((s) => s.saveVideo(v.id, { seconds: Math.round(d) }));
        }}
      />
    );
  const yt = v.kind === "youtube" ? youtubeId(v.url) : null;
  if (yt)
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-navy">
        <iframe
          title={v.title}
          src={`https://www.youtube-nocookie.com/embed/${yt}`}
          className="h-full w-full"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  const poster = posterFor(v);
  return (
    <div className="relative flex aspect-[4/5] max-h-[60vh] w-full items-center justify-center overflow-hidden rounded-xl bg-navy">
      {poster && <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />}
      <a href={v.url.split("#")[0]} target="_blank" rel="noreferrer" className="relative inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-[14px] font-bold text-navy shadow-sm hover:bg-paper">
        Open on {KIND_LABEL[v.kind]} <ExternalLink size={15} />
      </a>
    </div>
  );
}

function VideoPanel({ v, onClose }: { v: Video; onClose: () => void }) {
  const act = useAct();
  const { data: items = [] } = useItems();
  const [draft, setDraft] = useState<Video>(v);
  const [tags, setTags] = useState(v.tags.join(", "));
  const [cardId, setCardId] = useState("");
  useEffect(() => {
    setDraft(v);
    setTags(v.tags.join(", "));
  }, [v]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = <K extends keyof Video>(k: K, val: Video[K]) => setDraft((d) => ({ ...d, [k]: val }));
  const tagList = tags
    .split(",")
    .map((t) => t.trim().toLowerCase().replace(/\s+/g, "-"))
    .filter(Boolean);
  const dirty = JSON.stringify({ ...draft, tags: tagList }) !== JSON.stringify(v);
  const save = () =>
    act(
      (s) => s.saveVideo(v.id, { title: draft.title.trim() || v.title, notes: draft.notes, group: draft.group, rights: draft.rights, lang: draft.lang, people: draft.people, source: draft.source, date: draft.date, tags: tagList }),
      "Saved",
    );
  const usedOn = items.filter((i) => (v.itemIds ?? []).includes(i.id) || i.assets.some((a) => a.url === v.url));
  const cards = items.filter((i) => !["scheduled", "posted"].includes(i.stage) && i.format !== "email" && !usedOn.includes(i));

  const addToCard = async () => {
    const item = items.find((i) => i.id === cardId);
    if (!item) return;
    if (v.rights === "no") return toast.error("This one is marked Keep out, so it cannot go on a card.");
    const asset: Asset = { id: `va-${Date.now().toString(36)}`, kind: "media", url: v.url, mime: "video/mp4", name: `${v.title}.mp4` };
    const done = await act((s) => s.saveItem(item.id, { assets: [...item.assets, asset] }), `Added to "${item.title}"`);
    if (done) {
      await act((s) => s.saveVideo(v.id, { itemIds: [...new Set([...(v.itemIds ?? []), item.id])] }));
      setCardId("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/40 p-3 sm:p-8" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={v.title} className="relative w-full max-w-[1080px] rounded-2xl bg-white p-5 shadow-xl sm:p-7">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 rounded-lg p-2 text-ink-muted hover:bg-paper hover:text-ink">
          <X size={18} />
        </button>
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <Player v={v} />
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={v.url.split("#")[0]} target="_blank" rel="noreferrer" className="btn-ghost h-9 text-[13px]">
                <ExternalLink size={14} /> Open where it lives
              </a>
              <button
                type="button"
                className="btn-ghost h-9 text-[13px]"
                onClick={() => navigator.clipboard.writeText(v.url.split("#")[0]).then(() => toast.success("Link copied"), () => toast(v.url))}
              >
                <Copy size={14} /> Copy the link
              </button>
            </div>
            <div className={cx("mt-4 rounded-xl px-4 py-3 text-[13.5px] leading-relaxed", RIGHTS[v.rights].tone)}>
              <span className="font-bold">{RIGHTS[v.rights].label}.</span> {RIGHTS[v.rights].about}
            </div>
          </div>

          <div className="min-w-0 space-y-4">
            <label className="block">
              <span className="eyebrow">Title</span>
              <input value={draft.title} onChange={(e) => set("title", e.target.value)} className="field mt-1 text-[15px] font-bold" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="eyebrow">Where it is from</span>
                <select value={draft.group} onChange={(e) => set("group", e.target.value as VideoGroup)} className="field mt-1">
                  {GROUP_ORDER.map((g) => (
                    <option key={g} value={g}>
                      {GROUPS[g].label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="eyebrow">What we may do with it</span>
                <select value={draft.rights} onChange={(e) => set("rights", e.target.value as VideoRights)} className="field mt-1">
                  {(Object.keys(RIGHTS) as VideoRights[]).map((r) => (
                    <option key={r} value={r}>
                      {RIGHTS[r].label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="eyebrow">Made or posted by</span>
                <input value={draft.source} onChange={(e) => set("source", e.target.value)} className="field mt-1" />
              </label>
              <label className="block">
                <span className="eyebrow">Date</span>
                <input type="date" value={draft.date ?? ""} onChange={(e) => set("date", e.target.value || undefined)} className="field mt-1" />
              </label>
              <label className="block">
                <span className="eyebrow">Language</span>
                <select value={draft.lang ?? ""} onChange={(e) => set("lang", (e.target.value || undefined) as Video["lang"])} className="field mt-1">
                  <option value="">Not set</option>
                  {(Object.keys(LANG_LABEL) as NonNullable<Video["lang"]>[]).map((l) => (
                    <option key={l} value={l}>
                      {LANG_LABEL[l]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="eyebrow">People in it</span>
                <select value={draft.people ?? ""} onChange={(e) => set("people", (e.target.value || undefined) as Video["people"])} className="field mt-1">
                  <option value="">Not set</option>
                  {(Object.keys(PEOPLE_LABEL) as NonNullable<Video["people"]>[]).map((p) => (
                    <option key={p} value={p}>
                      {PEOPLE_LABEL[p]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="eyebrow">Notes</span>
              <textarea value={draft.notes ?? ""} onChange={(e) => set("notes", e.target.value)} rows={4} className="field mt-1 leading-relaxed" placeholder="What it shows, who is in it, what was agreed" />
            </label>
            <label className="block">
              <span className="eyebrow">Tags, separated by commas</span>
              <input value={tags} onChange={(e) => setTags(e.target.value)} className="field mt-1" placeholder="children, 11.11, puerto-rico" />
            </label>
            <p className="text-[12.5px] text-ink-muted">
              {[v.seconds !== undefined && `${clock(v.seconds)} long`, v.orientation && { vertical: "Vertical", horizontal: "Landscape", square: "Square" }[v.orientation], KIND_LABEL[v.kind]].filter(Boolean).join(" · ")}
            </p>
            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <button type="button" className="btn-primary h-9" disabled={!dirty} onClick={() => void save()}>
                Save changes
              </button>
              <button
                type="button"
                className="btn-quiet ml-auto h-9 text-[13px] text-ink-muted hover:text-rose-ink"
                onClick={async () => {
                  if (!window.confirm("Take this video out of the gallery? The file itself is not touched.")) return;
                  const done = await act(async (s) => {
                    await s.deleteVideo(v.id);
                    return true;
                  }, "Taken out of the gallery");
                  if (done) onClose();
                }}
              >
                <Trash2 size={14} /> Take out of the gallery
              </button>
            </div>

            {v.kind === "file" && (
              <div className="rounded-xl border border-line p-4">
                <p className="text-[14px] font-bold">Use it on a card</p>
                <p className="mt-0.5 text-[13px] text-ink-muted">Puts the file on a card in the Plan, ready to be scheduled.</p>
                {usedOn.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {usedOn.map((i) => (
                      <li key={i.id} className="flex items-center gap-2 text-[13px]">
                        <StagePill stage={i.stage} /> {i.title}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <select value={cardId} onChange={(e) => setCardId(e.target.value)} aria-label="Card" className="field h-9 min-w-0 flex-1 py-1 text-[13.5px]">
                    <option value="">Choose a card</option>
                    {cards.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.title}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="btn-ghost h-9 text-[13px]" disabled={!cardId} onClick={() => void addToCard()}>
                    Add to the card
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AddVideo({ onClose, onAdded }: { onClose: () => void; onAdded: (id: string) => void }) {
  const act = useAct();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [group, setGroup] = useState<VideoGroup>("ours");
  const [rights, setRights] = useState<VideoRights>("ours");
  const [source, setSource] = useState("");
  const kind = url.trim() ? videoKind(url.trim()) : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = await act((s) => s.addVideo({ url: url.trim(), title: title.trim() || "Untitled video", group, rights, source: source.trim() || (group === "ours" ? "Kindness Forward" : "") }), "Added to the gallery");
    if (v) {
      onClose();
      onAdded(v.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/40 p-3 sm:p-10" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form role="dialog" aria-modal="true" aria-label="Add a video" onSubmit={submit} className="w-full max-w-[560px] space-y-4 rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[20px] font-extrabold tracking-[-0.02em]">Add a video</h2>
            <p className="mt-1 text-[13.5px] text-ink-muted">Paste the link: a file in HighLevel's media library, a shared drive file, or a post on YouTube, Instagram, Facebook or TikTok.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-ink-muted hover:bg-paper">
            <X size={18} />
          </button>
        </div>
        <label className="block">
          <span className="eyebrow">Link</span>
          <input autoFocus required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" className="field mt-1" />
          {kind && <span className="mt-1 block text-[12.5px] text-ink-muted">{kind === "file" ? "A file: it will play here." : `Opens on ${KIND_LABEL[kind]}.`}</span>}
        </label>
        <label className="block">
          <span className="eyebrow">Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What it shows, in a few words" className="field mt-1" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="eyebrow">Where it is from</span>
            <select
              value={group}
              onChange={(e) => {
                const g = e.target.value as VideoGroup;
                setGroup(g);
                setRights(g === "ours" ? "ours" : g === "press" || g === "reference" ? "share" : "ask");
              }}
              className="field mt-1"
            >
              {GROUP_ORDER.map((g) => (
                <option key={g} value={g}>
                  {GROUPS[g].label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="eyebrow">What we may do with it</span>
            <select value={rights} onChange={(e) => setRights(e.target.value as VideoRights)} className="field mt-1">
              {(Object.keys(RIGHTS) as VideoRights[]).map((r) => (
                <option key={r} value={r}>
                  {RIGHTS[r].label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="eyebrow">Made or posted by</span>
          <input value={source} onChange={(e) => setSource(e.target.value)} placeholder={group === "ours" ? "Kindness Forward" : "The partner, outlet or channel"} className="field mt-1" />
        </label>
        <p className="text-[12.5px] leading-relaxed text-ink-muted">{RIGHTS[rights].about}</p>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={!url.trim()}>
            Add to the gallery
          </button>
        </div>
      </form>
    </div>
  );
}
