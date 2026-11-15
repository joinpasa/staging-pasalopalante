import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Copy, ExternalLink, Heart, Pin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAct, useHub } from "@/lib/hub";
import { changeSpace, spaceDay, spaceId, spaceWaiting, useSpace, type WallPost } from "@/lib/space";
import { hubUrl } from "@/lib/base";

const copy = async (text: string, done: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(done);
  } catch {
    toast(text);
  }
};

/** The team's side of the community space: what is on the wall, and the noticeboard. New posts and introductions wait in the Inbox. */
export default function SpaceDesk() {
  const space = useSpace();
  const { openStory } = useHub();
  const act = useAct();
  const live = space.wall.filter((p) => p.status === "live").sort((a, b) => b.kudos - a.kudos);
  const waiting = spaceWaiting(space);
  const url = hubUrl("/space");

  const feature = async (p: WallPost) => {
    const blob = p.image ? await (await fetch(p.image)).blob() : undefined;
    const st = await act(
      (s) =>
        s.addStory(
          {
            kind: p.image ? "photo" : "words",
            title: p.text.split(/[.\n]/)[0].slice(0, 70),
            words: p.text,
            people: p.org,
            source: "The community wall",
            partner: p.org,
            tags: ["community"],
            consent: p.consent ? "partner" : "unknown",
            consentNote: p.consent ? "The partner ticked that the people shown agreed to be shared." : undefined,
          },
          blob,
        ),
      "Saved to the story bank",
    );
    if (!st) return;
    changeSpace((s) => {
      const w = s.wall.find((x) => x.id === p.id);
      if (w) w.storyId = st.id;
    });
    openStory(st.id);
  };

  return (
    <div className="grid gap-x-14 gap-y-12 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-11">
        {waiting > 0 && (
          <Link to="/inbox?show=space" className="group flex items-center gap-4 rounded-xl border border-line bg-sun-soft/60 px-5 py-4 transition hover:border-sun">
            <span className="text-[26px] font-extrabold tabular-nums leading-none">{waiting}</span>
            <span className="min-w-0 flex-1 text-[14px] font-semibold leading-snug">
              {waiting === 1 ? "thing from the community space is" : "things from the community space are"} waiting in your Inbox: new wall posts to say yes to, and introductions to make.
            </span>
            <ArrowRight size={17} className="shrink-0 transition group-hover:translate-x-0.5" />
          </Link>
        )}

        <section>
          <h2 className="text-[18px] font-extrabold tracking-[-0.02em]">On the wall</h2>
          <p className="mt-1 text-[13.5px] text-ink-muted">What partners shared, most kudos first. One click keeps a good one in the story bank, with its consent, ready to become a post.</p>
          {live.length === 0 && (
            <p className="mt-4 rounded-lg bg-paper px-4 py-3 text-[13.5px] text-ink-muted">
              Nothing on the wall yet. When a partner posts in the community space, it waits in the Inbox for your yes, then shows here.
            </p>
          )}
          <ul className="mt-4 border-t border-line">
            {live.map((p) => (
              <li key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-5 border-b border-line py-4">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] text-ink-muted">
                    <span className="font-bold text-ink">{p.org}</span>
                    <span className="text-ink-faint">{spaceDay(p.at, "en")}</span>
                  </p>
                  <p className="mt-1.5 line-clamp-2 text-[14px] leading-relaxed text-ink-muted">{p.text}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="inline-flex items-center gap-1 text-[13px] font-bold tabular-nums text-rose-ink">
                    <Heart size={13} fill="currentColor" /> {p.kudos}
                  </span>
                  {p.storyId ? (
                    <button type="button" className="text-[13px] font-semibold text-sky-ink hover:underline" onClick={() => openStory(p.storyId!)}>
                      In the story bank
                    </button>
                  ) : (
                    <button type="button" className="btn-ghost h-8 text-[13px]" onClick={() => void feature(p)}>
                      Save to the story bank
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <NoticeForm />
      </div>

      <aside className="space-y-8">
        <section className="rounded-xl border border-line p-5">
          <h2 className="section-title">The page partners open</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">A noticeboard, a wall with kudos, asks and offers, shared dates and a directory, in English and Spanish.</p>
          <p className="mt-3 truncate rounded-lg border border-line bg-paper px-3 py-2 text-[13px] font-medium">{url}</p>
          <div className="mt-2 flex gap-2">
            <button type="button" className="btn-ghost flex-1" onClick={() => copy(url, "Link copied")}>
              <Copy size={14} /> Copy link
            </button>
            <Link to="/space" target="_blank" className="btn-primary flex-1">
              Open it <ExternalLink size={14} />
            </Link>
          </div>
          <p className="mt-3 border-l-2 border-sun pl-3 text-[12.5px] leading-relaxed text-ink-muted">A preview: posts stay in this browser, and "Viewing as" stands in for the partner portal's sign-in until it moves into the portal.</p>
        </section>
      </aside>
    </div>
  );
}

function NoticeForm() {
  const space = useSpace();
  const [titleEn, setTitleEn] = useState("");
  const [titleEs, setTitleEs] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [bodyEs, setBodyEs] = useState("");
  const [pinned, setPinned] = useState(false);

  const post = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleEn.trim() || !bodyEn.trim()) return;
    changeSpace((s) => {
      if (pinned) for (const n of s.notices) n.pinned = false;
      s.notices.unshift({ id: spaceId("n"), at: new Date().toISOString(), titleEn: titleEn.trim(), titleEs: titleEs.trim(), bodyEn: bodyEn.trim(), bodyEs: bodyEs.trim(), pinned });
    });
    setTitleEn("");
    setTitleEs("");
    setBodyEn("");
    setBodyEs("");
    setPinned(false);
    toast.success("The notice is up for every partner");
  };

  return (
    <section>
      <h2 className="text-[18px] font-extrabold tracking-[-0.02em]">Noticeboard</h2>
      <p className="mt-1 text-[13.5px] text-ink-muted">A short note from the team at the top of every partner's page. One direction, so there is nothing to moderate.</p>
      <form onSubmit={post} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="notice-title-en">
              Title, English
            </label>
            <input id="notice-title-en" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="notice-title-es">
              Título, español
            </label>
            <input id="notice-title-es" value={titleEs} onChange={(e) => setTitleEs(e.target.value)} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="notice-body-en">
              Note, English
            </label>
            <textarea id="notice-body-en" rows={3} value={bodyEn} onChange={(e) => setBodyEn(e.target.value)} className="field resize-y leading-relaxed" />
          </div>
          <div>
            <label className="label" htmlFor="notice-body-es">
              Nota, español
            </label>
            <textarea id="notice-body-es" rows={3} value={bodyEs} onChange={(e) => setBodyEs(e.target.value)} className="field resize-y leading-relaxed" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" className="btn-primary" disabled={!titleEn.trim() || !bodyEn.trim()}>
            Put it on the noticeboard
          </button>
          <label className="flex cursor-pointer items-center gap-2 text-[13.5px] font-semibold text-ink-muted">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="h-4 w-4 accent-[#0e234b]" /> Pin it to the top
          </label>
        </div>
      </form>

      <ul className="mt-6 border-t border-line">
        {space.notices.map((n) => (
          <li key={n.id} className="flex items-center gap-3 border-b border-line py-2.5 text-[13.5px]">
            <span className="w-[52px] shrink-0 text-[12.5px] text-ink-faint">{spaceDay(n.at, "en")}</span>
            <span className="min-w-0 flex-1 truncate font-semibold">{n.titleEn}</span>
            {n.pinned && <Pin size={13} className="shrink-0 text-orange-ink" />}
            <button type="button" aria-label={`Take down "${n.titleEn}"`} title="Take it down" className="shrink-0 text-ink-faint hover:text-rose-ink" onClick={() => changeSpace((s) => void (s.notices = s.notices.filter((x) => x.id !== n.id)))}>
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
