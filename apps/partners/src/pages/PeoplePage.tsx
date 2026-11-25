import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { BadgeCheck, ExternalLink, Search } from "lucide-react";
import Shell from "@/components/Shell";
import Avatar from "@/components/Avatar";
import Sheet from "@/components/Sheet";
import PostCard from "@/components/PostCard";
import { useHubCopy } from "@/lib/hubCopy";
import { useCommunity, useFeed, useMe, useMemberCard, type CommunityMember } from "@/lib/hub";
import { KINDS, kindLabel, KIND_COLOR, orgTypeLabel, type Kind } from "@/lib/kinds";
import { countryLabel } from "@/lib/geo";
import type { Lang } from "@/lib/i18n";

/** "Who's in · Map" at the top of both Community pages, so the map is one tap away on a phone. */
export function CommunityTabs() {
  const { h } = useHubCopy();
  const tab = ({ isActive }: { isActive: boolean }) =>
    `-mb-[1.5px] flex h-11 items-center border-b-[3px] px-1 text-[15px] no-underline ${isActive ? "border-orange font-extrabold text-navy" : "border-transparent font-bold text-ink-faint hover:text-navy"}`;
  return (
    <nav className="flex gap-6 border-b-[1.5px] border-hair" aria-label={h.community}>
      <NavLink to="/people" className={tab}>
        {h.whosIn}
      </NavLink>
      <NavLink to="/map" className={tab}>
        {h.map}
      </NavLink>
    </nav>
  );
}

function typeLabel(m: Pick<CommunityMember, "orgType">, lang: Lang) {
  if (m.orgType === "media") return lang === "es" ? "Medios" : "Media";
  return orgTypeLabel(m.orgType, lang);
}

/**
 * Community (25 Nov 2026): everyone passing kindness forward, the way a social app shows people.
 * Members with a hub account sit in a row on top; below, every organisation, company and
 * ambassador, filtered by kind or found by name. Tapping one opens their card and posts.
 */
export default function PeoplePage() {
  const { h, lang, locale } = useHubCopy();
  const { data: me } = useMe();
  const { data: people, isLoading } = useCommunity();
  const [kind, setKind] = useState<Kind | null>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<CommunityMember | null>(null);
  const [limit, setLimit] = useState(36);

  const inHub = useMemo(() => (people ?? []).filter((p) => p.inHub), [people]);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (people ?? []).filter((p) => (!kind || p.kind === kind) && (!needle || p.name.toLowerCase().includes(needle)));
  }, [people, kind, q]);
  const total = (people ?? []).length;

  return (
    <Shell wide>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="h-page">{h.peopleTitle}</h1>
          <p className="m-0 mt-1 text-[15px] font-medium text-ink-muted">{total ? h.peopleSub(total.toLocaleString(locale)) : " "}</p>
        </div>
        <CommunityTabs />

        {/* members with a hub account, like stories along the top */}
        {inHub.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="m-0 flex items-center gap-1.5 text-[13px] font-extrabold text-sky-deep">
              <BadgeCheck className="h-4 w-4" aria-hidden="true" />
              {h.inHub}
            </h2>
            <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:px-0">
              {inHub.map((p) => (
                <button key={p.key} type="button" onClick={() => setOpen(p)} className="flex w-[76px] shrink-0 flex-col items-center gap-1.5 text-center">
                  <span className="p-[3px]" style={{ background: `linear-gradient(135deg, ${KIND_COLOR[p.kind]}, #f37023)` }}>
                    <span className="block bg-white p-[2px]">
                      <Avatar name={p.name} url={p.logoUrl} kind={p.kind} size={60} />
                    </span>
                  </span>
                  <span className="line-clamp-2 text-[11.5px] font-bold leading-tight text-navy">{p.partnerId === me?.id ? h.you : p.name}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* find someone */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex h-11 min-w-0 flex-1 items-center gap-2 border-[1.5px] border-hair px-3 focus-within:border-sky">
            <Search className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={h.search}
              className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-medium text-navy outline-none placeholder:text-ink-faint"
              type="search"
            />
          </label>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
            {[null, ...KINDS].map((k) => (
              <button
                key={k ?? "all"}
                type="button"
                onClick={() => setKind(k)}
                className={`h-9 shrink-0 px-3.5 text-sm font-bold ${kind === k ? "bg-sky text-white" : "border-[1.5px] border-hair text-ink2 hover:border-sky"}`}
              >
                {k ? kindLabel(k, lang, true) : h.allKinds}
              </button>
            ))}
          </div>
        </div>

        {isLoading && <div className="h-72 animate-pulse bg-tint-sky/60" />}
        {!isLoading && shown.length === 0 && <p className="m-0 py-10 text-center text-[15px] font-semibold text-ink-faint">{h.noMatch}</p>}
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-4">
          {shown.slice(0, limit).map((p) => (
            <li key={p.key}>
              <button type="button" onClick={() => setOpen(p)} className="group flex h-full w-full flex-col border-[1.5px] border-hair text-start hover:border-sky">
                <span className="relative flex aspect-[3/2] items-center justify-center overflow-hidden bg-white p-4">
                  {p.logoUrl ? (
                    <img src={p.logoUrl} alt="" loading="lazy" className="max-h-full max-w-full object-contain transition group-hover:scale-[1.04]" />
                  ) : (
                    <Avatar name={p.name} kind={p.kind} size={64} />
                  )}
                  {p.inHub && (
                    <span className="absolute end-2 top-2 flex h-6 w-6 items-center justify-center bg-sky text-white" title={h.inHub}>
                      <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                    </span>
                  )}
                </span>
                <span className="flex flex-1 flex-col gap-0.5 border-t-[1.5px] border-hair px-3 py-2.5">
                  <b className="line-clamp-2 text-[14px] font-extrabold leading-snug text-navy">{p.name}</b>
                  <span className="flex items-center gap-1.5 text-[12px] font-bold text-ink-muted">
                    <i className="h-2 w-2 shrink-0" style={{ background: KIND_COLOR[p.kind] }} aria-hidden="true" />
                    <span className="truncate">{typeLabel(p, lang)}</span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        {shown.length > limit && (
          <button type="button" onClick={() => setLimit((n) => n + 36)} className="btn-soft w-full">
            {h.loadMore}
          </button>
        )}
      </div>

      <MemberSheet member={open} onClose={() => setOpen(null)} />
    </Shell>
  );
}

/** One member's card: who they are, where, their website, and their posts if they're in the hub. */
function MemberSheet({ member, onClose }: { member: CommunityMember | null; onClose: () => void }) {
  const { h, lang } = useHubCopy();
  const { data: card } = useMemberCard(member?.partnerId);
  const feed = useFeed({ partnerId: member?.partnerId ?? null, limit: 5, off: !member?.partnerId });
  const posts = member?.partnerId ? (feed.data?.pages.flat() ?? []).filter((p) => p.partnerId === member.partnerId) : [];
  if (!member) return null;
  const place = [card?.city ?? member.city, card?.region, (card?.country ?? member.country) ? countryLabel((card?.country ?? member.country)!, lang) : null].filter(Boolean).join(", ");
  const website = card?.website ?? member.website;
  return (
    <Sheet open onClose={onClose} title={member.name} wide>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-24 w-24 shrink-0 items-center justify-center border-[1.5px] border-hair bg-white p-2">
            {member.logoUrl ? <img src={member.logoUrl} alt="" className="max-h-full max-w-full object-contain" /> : <Avatar name={member.name} kind={member.kind} size={80} />}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap gap-1.5">
              <span className="chip text-white" style={{ background: KIND_COLOR[member.kind], color: member.kind === "ambassador" ? "#0e234b" : "#fff" }}>
                {kindLabel(member.kind, lang)}
              </span>
              {member.inHub && <span className="chip bg-tint-sky text-sky-deep">{h.inHub}</span>}
              {member.founding && <span className="chip bg-tint-gold text-navy">{h.founding}</span>}
            </div>
            <p className="m-0 mt-1.5 text-[14px] font-bold text-ink2">{typeLabel(member, lang)}</p>
            {place && <p className="m-0 text-[13.5px] font-semibold text-ink-muted">{place}</p>}
            {member.role && <p className="m-0 text-[13.5px] font-semibold text-ink-muted">{member.role}</p>}
          </div>
        </div>
        {card?.about && <p className="m-0 text-[15px] font-medium leading-relaxed text-ink2">{card.about}</p>}
        {website && /^https?:\/\//.test(website) && (
          <a href={website} target="_blank" rel="noopener noreferrer" className="btn-soft h-10 w-fit px-3 text-sm">
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            {h.visitSite}
          </a>
        )}
        {member.partnerId && (
          <div className="flex flex-col gap-2 border-t-[1.5px] border-hair pt-4">
            <h3 className="m-0 text-[15px] font-extrabold">{h.theirPosts}</h3>
            {feed.isLoading ? (
              <div className="h-32 animate-pulse bg-tint-sky/60" />
            ) : posts.length ? (
              <div className="-mx-5">
                {posts.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>
            ) : (
              <p className="m-0 text-[14px] font-semibold text-ink-faint">{h.noPostsYet}</p>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}
