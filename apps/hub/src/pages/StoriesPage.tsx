import { useMemo, useRef, useState } from "react";
import { PenLine, Search, Upload } from "lucide-react";
import { toast } from "sonner";
import StoryTile from "@/components/StoryTile";
import { cx, Empty, PageHead, Segmented } from "@/components/bits";
import { useAct, useHub, useItems, useStories } from "@/lib/hub";
import { CONSENT, consentOk } from "@/lib/stories";
import type { Consent, Story } from "@/lib/types";

/** Take a still from the start of a video, so a clip has a face in the bank straight away. */
function posterOf(file: File): Promise<string | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    const done = (out?: string) => {
      URL.revokeObjectURL(url);
      resolve(out);
    };
    v.muted = true;
    v.preload = "auto";
    v.src = url;
    v.onloadeddata = () => (v.currentTime = Math.min(0.6, (v.duration || 1) / 2));
    v.onseeked = () => {
      try {
        const c = document.createElement("canvas");
        const scale = Math.min(1, 640 / (v.videoWidth || 640));
        c.width = Math.round(v.videoWidth * scale);
        c.height = Math.round(v.videoHeight * scale);
        c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
        done(c.toDataURL("image/jpeg", 0.8));
      } catch {
        done();
      }
    };
    v.onerror = () => done();
    setTimeout(() => done(), 6000);
  });
}

const nameToTitle = (name: string) =>
  name
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();

/** Real clips, photos and words from real people, with consent kept next to each one. */
export default function StoriesPage() {
  const { openStory } = useHub();
  const act = useAct();
  const { data: stories = [] } = useStories();
  const { data: items = [] } = useItems();
  const fileRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<"all" | Story["kind"]>("all");
  const [consent, setConsent] = useState<"all" | "ready" | "open" | Consent>("all");
  const [q, setQ] = useState("");
  const [unused, setUnused] = useState(false);
  const [drag, setDrag] = useState(false);

  const usedIn = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of items) for (const id of new Set(i.assets.map((a) => a.storyId).filter(Boolean))) m.set(id!, (m.get(id!) ?? 0) + 1);
    return m;
  }, [items]);

  const shown = stories.filter((s) => {
    if (kind !== "all" && s.kind !== kind) return false;
    const ok = consentOk(s.consent, s.minors);
    if (consent === "ready" && !ok) return false;
    if (consent === "open" && ok) return false;
    if (consent !== "all" && consent !== "ready" && consent !== "open" && s.consent !== consent) return false;
    if (unused && (usedIn.get(s.id) ?? 0) > 0) return false;
    const text = [s.title, s.people, s.partner, s.country, s.source, s.words, ...s.tags].filter(Boolean).join(" ").toLowerCase();
    return q
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .every((w) => text.includes(w));
  });
  const ready = stories.filter((s) => consentOk(s.consent, s.minors)).length;

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    let last: Story | undefined;
    for (const f of Array.from(files)) {
      const isVideo = f.type.startsWith("video/");
      if (!isVideo && !f.type.startsWith("image/")) {
        toast.error(`${f.name} is not an image or a video.`);
        continue;
      }
      const poster = isVideo ? await posterOf(f) : undefined;
      last = await act((s) => s.addStory({ kind: isVideo ? "clip" : "photo", title: nameToTitle(f.name) }, f, poster));
    }
    // straight into the details, because a file with no name and no consent is no use to anyone
    if (last) {
      toast.success(files.length > 1 ? `${files.length} added. Fill in who is in them when you can.` : "Added. Now say who is in it.");
      openStory(last.id);
    }
  };

  const write = async () => {
    const st = await act((s) => s.addStory({ kind: "words" }));
    if (st) openStory(st.id);
  };

  return (
    <div
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        add(e.dataTransfer.files);
      }}
      className={cx("-m-3 rounded-2xl p-3 transition", drag && "bg-sky-soft outline-dashed outline-2 outline-sky")}
    >
      <PageHead
        title="Story bank"
        sub="Real clips, photos and words from real people, kept where everyone can find them, with a note beside each one on who is in it and whether they agreed to be shared."
        actions={
          <>
            <button type="button" className="btn-ghost" onClick={write}>
              <PenLine size={15} /> Add words
            </button>
            <button type="button" className="btn-primary" onClick={() => fileRef.current?.click()}>
              <Upload size={15} strokeWidth={2.4} /> Add clips or photos
            </button>
          </>
        }
      />
      <input ref={fileRef} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => (add(e.target.files), (e.target.value = ""))} />

      <dl className="grid grid-cols-2 border-y border-line sm:grid-cols-4 sm:divide-x sm:divide-line">
        {[
          { n: stories.length, label: "in the bank" },
          { n: ready, label: "ready to use" },
          { n: stories.length - ready, label: "waiting on consent" },
          { n: stories.filter((s) => !usedIn.get(s.id)).length, label: "not used in a post yet" },
        ].map((s, i) => (
          <div key={s.label} className={cx("flex items-baseline gap-3 py-4 sm:px-5", i === 0 && "sm:pl-0")}>
            <dt className="text-[28px] font-extrabold leading-none tracking-[-0.03em] tabular-nums">{s.n}</dt>
            <dd className="text-[13px] leading-snug text-ink-muted">{s.label}</dd>
          </div>
        ))}
      </dl>

      <div className="my-6 flex flex-wrap items-center gap-3">
        <Segmented
          value={kind}
          onChange={setKind}
          options={
            [
              ["all", "Everything"],
              ["clip", "Clips"],
              ["photo", "Photos"],
              ["words", "Words"],
            ] as const
          }
        />
        <label className="relative min-w-[220px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by person, partner, country or tag" className="field h-9 pl-9" aria-label="Search the story bank" />
        </label>
        <select value={consent} onChange={(e) => setConsent(e.target.value as typeof consent)} className="field h-9 w-auto py-0 pr-8 text-[13.5px]" aria-label="Consent">
          <option value="all">Any consent</option>
          <option value="ready">Ready to use</option>
          <option value="open">Waiting on consent</option>
          {(Object.keys(CONSENT) as Consent[]).map((c) => (
            <option key={c} value={c}>
              {CONSENT[c].label}
            </option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-2 text-[13px] font-semibold">
          <input type="checkbox" checked={unused} onChange={(e) => setUnused(e.target.checked)} className="h-4 w-4 accent-[#0e234b]" /> Not used yet
        </label>
      </div>

      {stories.length === 0 ? (
        <Empty title="The bank is empty" body="Drop clips or photos anywhere on this page to start it." />
      ) : shown.length === 0 ? (
        <Empty title="Nothing matches that" body="Try fewer words, or clear the filters." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((s) => (
            <li key={s.id}>
              <StoryTile story={s} used={usedIn.get(s.id) ?? 0} onOpen={() => openStory(s.id)} />
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-[12.5px] leading-relaxed text-ink-faint">Drop files anywhere on this page to add them. Adults can be shared once a yes is recorded or a partner sent the material to post. Anything showing a child needs a written yes from a parent or guardian on file, and the hub will not let it onto a post until then.</p>
    </div>
  );
}
