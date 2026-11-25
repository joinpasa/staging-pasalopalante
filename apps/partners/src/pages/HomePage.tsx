import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarHeart, Heart } from "lucide-react";
import Shell from "@/components/Shell";
import Avatar from "@/components/Avatar";
import PostCard from "@/components/PostCard";
import ThisWeek from "@/components/ThisWeek";
import Welcome from "@/components/Welcome";
import Sheet from "@/components/Sheet";
import Composer from "@/components/Composer";
import { useHubCopy } from "@/lib/hubCopy";
import { isNew, kitFileUrl, useFeed, useKit, useMe, useUpdates } from "@/lib/hub";
import { useSession } from "@/lib/session";
import { actsLogged, useSubmissions } from "@/lib/submissions";
import { KINDS, kindLabel, kitAudienceMatches, type Kind } from "@/lib/kinds";
import { formatDay, momentLabel, nextMoment } from "@/lib/moments";

/** Home is the feed, the way social apps open: this week's note pinned on top, then members' posts. */
export default function HomePage() {
  const { h, lang, locale } = useHubCopy();
  const { staff } = useSession();
  const navigate = useNavigate();
  const { data: me } = useMe();
  const { data: updates } = useUpdates();
  const { data: acts } = useSubmissions();
  const [kind, setKind] = useState<Kind | null>(null);
  const feed = useFeed({ kind });
  const [composing, setComposing] = useState(false);
  const posts = feed.data?.pages.flat() ?? [];
  const latest = updates?.[0];
  const logged = actsLogged(acts);
  const goal = me?.pledgeTotal ?? 0;
  const pct = goal > 0 ? Math.min(100, Math.round((logged / goal) * 100)) : 0;
  const firstName = staff?.name.split(/\s+/)[0] ?? "";

  return (
    <Shell aside={<Aside />}>
      <div className="flex flex-col gap-5">
        {/* who's here, and how far along */}
        <div className="flex items-center gap-3">
          <Avatar name={me?.name ?? ""} url={me?.logoUrl} kind={me?.kind ?? "organisation"} size={52} />
          <div className="min-w-0 flex-1">
            <h1 className="m-0 truncate text-[22px] font-extrabold leading-tight">{h.hello(firstName)}</h1>
            <p className="m-0 truncate text-sm font-semibold text-ink-muted">{me?.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link to="/me" className="min-w-0 flex-1 no-underline">
            <div className="flex items-baseline justify-between text-[13px] font-bold text-ink2">
              <span>
                <b className="text-[17px] font-extrabold text-navy">{logged.toLocaleString(locale)}</b> {h.actsLogged.toLowerCase()}
              </span>
              <span>
                {h.pledge} {goal.toLocaleString(locale)}
              </span>
            </div>
            <div className="mt-1.5 h-2 bg-tint-gold">
              <div className="h-2 bg-bar" style={{ width: `${Math.max(pct, logged > 0 ? 3 : 0)}%` }} />
            </div>
          </Link>
          <button type="button" onClick={() => navigate("/log")} className="btn-orange h-10 shrink-0 px-3 text-sm">
            <Heart className="h-4 w-4" aria-hidden="true" />
            {h.logAct}
          </button>
        </div>

        {me && <Welcome me={me} posted={posts.some((p) => p.mine)} onPost={() => setComposing(true)} />}

        {latest ? <ThisWeek update={latest} /> : <p className="m-0 bg-tint-sky px-4 py-3 text-sm font-semibold text-ink2">{h.noUpdateYet}</p>}

        {/* "what's on your mind" */}
        <button type="button" onClick={() => setComposing(true)} className="flex items-center gap-3 border-[1.5px] border-hair px-3 py-3 text-start hover:border-sky">
          <Avatar name={me?.name ?? ""} url={me?.logoUrl} kind={me?.kind ?? "organisation"} size={36} />
          <span className="flex-1 text-[15px] font-medium text-ink-faint">{h.shareSomething}</span>
          <span className="bg-tint-sky px-3 py-1.5 text-sm font-bold text-sky-deep">{h.post}</span>
        </button>

        {/* filter by kind of member */}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
          {[null, ...KINDS].map((k) => (
            <button
              key={k ?? "all"}
              type="button"
              onClick={() => setKind(k)}
              className={`h-9 shrink-0 px-3.5 text-sm font-bold ${kind === k ? "bg-sky text-white" : "border-[1.5px] border-hair text-ink2 hover:border-sky"}`}
            >
              {k ? kindLabel(k, lang, true) : h.all}
            </button>
          ))}
        </div>

        <div className="-mt-2">
          {feed.isLoading && <div className="h-64 animate-pulse bg-tint-sky/60" />}
          {!feed.isLoading && posts.length === 0 && <p className="m-0 py-10 text-center text-[15px] font-semibold text-ink-faint">{h.emptyFeed}</p>}
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
          {feed.hasNextPage && (
            <button type="button" onClick={() => feed.fetchNextPage()} disabled={feed.isFetchingNextPage} className="btn-soft mt-4 w-full">
              {h.loadMore}
            </button>
          )}
        </div>
      </div>

      <Sheet open={composing} onClose={() => setComposing(false)} title={h.newPost} wide>
        <Composer onDone={() => setComposing(false)} />
      </Sheet>
    </Shell>
  );
}

/** The side column on a wide screen: the next moment and what's new in the kit. */
function Aside() {
  const { h, lang, locale } = useHubCopy();
  const { data: me } = useMe();
  const { data: kit } = useKit();
  const m = nextMoment();
  const fresh = (kit ?? []).filter((k) => me && kitAudienceMatches(k.audience, me.kind) && isNew(k.added_at) && (k.thumb_path || k.file_path)).slice(0, 3);
  return (
    <>
      <div className="border-[1.5px] border-hair p-4">
        <div className="flex items-center gap-2 text-[13px] font-extrabold text-sky-deep">
          <CalendarHeart className="h-4 w-4" aria-hidden="true" />
          {formatDay(m.date, locale)}
        </div>
        <div className="mt-1 text-lg font-extrabold leading-snug">{momentLabel(m, lang)}</div>
      </div>
      {fresh.length > 0 && (
        <div className="border-[1.5px] border-hair p-4">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-extrabold text-orange">{h.kit}</span>
            <Link to="/kit" className="btn-quiet text-xs">
              {h.open}
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {fresh.map((k) => (
              <Link key={k.id} to="/kit" className="block aspect-square overflow-hidden bg-tint-sky">
                <img src={kitFileUrl(k.thumb_path ?? k.file_path) ?? ""} alt={(lang === "es" && k.title_es) || k.title} className="h-full w-full object-cover" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
