import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import Shell from "@/components/Shell";
import WorldMap, { type MapMode, type MapPick } from "@/components/WorldMap";
import { useHubCopy } from "@/lib/hubCopy";
import { timeAgo, useMe, useRecentPledges, useStats, type RecentPledge } from "@/lib/hub";
import { KINDS, kindLabel, kindOf, KIND_COLOR, orgTypeLabel } from "@/lib/kinds";
import { countryLabel } from "@/lib/geo";

/** Where members are and where pledgers come from, with the newest pledges coming in live. */
export default function MapPage() {
  const { h, lang, locale } = useHubCopy();
  const { data: me } = useMe();
  const { data: stats, isLoading } = useStats();
  const { data: recent } = useRecentPledges();
  const [mode, setMode] = useState<MapMode>("pledgers");
  const [pick, setPick] = useState<MapPick | null>(null);
  const [all, setAll] = useState(false);
  const fmt = (n: number) => n.toLocaleString(locale);

  // the live line: one new pledge at a time, every few seconds
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!recent?.length) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 4500);
    return () => window.clearInterval(id);
  }, [recent?.length]);
  const live = recent?.length ? recent[tick % recent.length] : null;

  const members = useMemo(() => stats?.partners ?? [], [stats]);
  const placed = members.filter((m) => m.country);
  const memberCountries = new Set(placed.map((m) => m.country)).size;
  const pledgers = stats?.pledgers ?? [];
  const people = pledgers.reduce((n, p) => n + p.people, 0);

  const byCountry = useMemo(() => {
    const m = new Map<string, { total: number; kinds: Record<string, number> }>();
    for (const p of placed) {
      const e = m.get(p.country!) ?? { total: 0, kinds: {} };
      e.total += 1;
      const k = kindOf(p.orgType);
      e.kinds[k] = (e.kinds[k] ?? 0) + 1;
      m.set(p.country!, e);
    }
    return [...m.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [placed]);

  const pledgedShort = stats ? compact(stats.pledgedActs, locale, lang) : "–";

  return (
    <Shell wide>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="h-page">{h.mapTitle}</h1>
            <p className="m-0 mt-1 text-[15px] font-semibold text-ink-muted">
              <b className="text-navy">{pledgedShort}</b> {lang === "es" ? "actos de bondad prometidos" : "acts of kindness pledged"}
            </p>
          </div>
          <div className="flex border-[1.5px] border-hair" role="group">
            {(["pledgers", "members"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => (setMode(m), setPick(null), setAll(false))}
                aria-pressed={mode === m}
                className={`h-10 px-4 text-sm font-bold ${mode === m ? "bg-sky text-white" : "text-ink2 hover:bg-tint-sky"}`}
              >
                {m === "members" ? h.members : h.pledgers}
              </button>
            ))}
          </div>
        </div>

        {/* the live line */}
        <LiveLine item={live} index={tick} />

        <div className="border-[1.5px] border-hair">
          {isLoading ? (
            <div className="aspect-[900/440] animate-pulse bg-tint-sky/60" />
          ) : (
            <WorldMap
              mode={mode}
              members={members}
              pledgers={pledgers}
              myId={me?.id}
              pulse={live?.country ?? null}
              onPick={setPick}
              describeMember={(m) => ({
                title: m.name,
                sub: [orgTypeLabel(m.orgType, lang), [m.city, m.country ? countryLabel(m.country, lang) : null].filter(Boolean).join(", ")].filter(Boolean).join(" · "),
              })}
              describeCountry={(c, n) => ({ title: countryLabel(c, lang), sub: `${fmt(n)} ${h.pledgers.toLowerCase()}` })}
            />
          )}
          <div className="flex min-h-[52px] flex-wrap items-center justify-between gap-3 border-t-[1.5px] border-hair px-4 py-2.5">
            {pick ? (
              <span className="min-w-0">
                <b className="block truncate text-[15px] font-extrabold">{pick.title}</b>
                <span className="block truncate text-[13px] font-semibold text-ink-muted">{pick.sub}</span>
              </span>
            ) : (
              <span className="text-[13.5px] font-semibold text-ink2">
                {mode === "members" ? h.membersIn(fmt(placed.length), fmt(memberCountries)) : h.pledgersIn(fmt(people), fmt(pledgers.length))}
              </span>
            )}
            {mode === "members" && (
              <span className="flex flex-wrap gap-3 text-[12.5px] font-bold text-ink2">
                {KINDS.map((k) => (
                  <span key={k} className="flex items-center gap-1.5">
                    <i className="h-2.5 w-2.5" style={{ background: KIND_COLOR[k] }} />
                    {kindLabel(k, lang, true)}
                  </span>
                ))}
                <span className="flex items-center gap-1.5">
                  <i className="h-2.5 w-2.5 bg-orange" />
                  {h.you}
                </span>
              </span>
            )}
          </div>
        </div>

        {me && !me.country && (
          <Link to="/me/edit" className="flex items-center gap-3 bg-tint-gold px-4 py-3 text-[15px] font-bold text-navy no-underline">
            <MapPin className="h-5 w-5 text-orange" aria-hidden="true" />
            {h.addYourPlace}
          </Link>
        )}

        {mode === "members" ? (
          <ul className="m-0 grid list-none gap-x-8 p-0 sm:grid-cols-2">
            {(all ? byCountry : byCountry.slice(0, 8)).map(([country, e]) => (
              <li key={country} className="flex items-center justify-between gap-3 border-b-[1.5px] border-hair py-2.5">
                <span className="truncate text-[15px] font-bold">{countryLabel(country, lang)}</span>
                <span className="flex items-center gap-2">
                  {KINDS.filter((k) => e.kinds[k]).map((k) => (
                    <span key={k} className="flex items-center gap-1 text-[13px] font-bold text-ink2">
                      <i className="h-2 w-2" style={{ background: KIND_COLOR[k] }} />
                      {e.kinds[k]}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="m-0 grid list-none gap-x-8 p-0 sm:grid-cols-2">
            {(all ? pledgers : pledgers.slice(0, 8)).map((p) => (
              <li key={p.country} className="grid grid-cols-[minmax(0,1fr)_96px_44px] items-center gap-3 border-b-[1.5px] border-hair py-2.5">
                <span className="truncate text-[15px] font-bold">{countryLabel(p.country, lang)}</span>
                <span className="h-2 bg-tint-sky">
                  <span className="block h-2 bg-sky" style={{ width: `${Math.max(4, (p.people / (pledgers[0]?.people || 1)) * 100)}%` }} />
                </span>
                <span className="text-end text-[13px] font-extrabold tabular-nums">{fmt(p.people)}</span>
              </li>
            ))}
          </ul>
        )}
        {(mode === "members" ? byCountry.length : pledgers.length) > 8 && (
          <button type="button" onClick={() => setAll((a) => !a)} className="btn-quiet w-fit">
            {all ? h.showLess : h.loadMore}
          </button>
        )}
      </div>
    </Shell>
  );
}

/** "Someone in Germany pledged 12 acts · 3 minutes ago", one at a time, fading in. */
function LiveLine({ item, index }: { item: RecentPledge | null; index: number }) {
  const { lang, locale } = useHubCopy();
  if (!item) return null;
  const place = item.country ? countryLabel(item.country, lang) : null;
  const n = item.acts.toLocaleString(locale);
  const who =
    item.org_name ??
    (lang === "es"
      ? item.kind === "organisation"
        ? place
          ? `Una organización en ${place}`
          : "Una organización"
        : place
          ? `Alguien en ${place}`
          : "Alguien"
      : item.kind === "organisation"
        ? place
          ? `An organisation in ${place}`
          : "An organisation"
        : place
          ? `Someone in ${place}`
          : "Someone");
  const verb = lang === "es" ? `se comprometió a ${n} ${item.acts === 1 ? "acto" : "actos"}` : `pledged ${n} ${item.acts === 1 ? "act" : "acts"}`;
  return (
    <div className="flex items-center gap-3 bg-tint-sky px-4 py-3" aria-live="polite">
      <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping bg-magenta opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 bg-magenta" />
      </span>
      <span className="text-[12px] font-extrabold text-magenta">{lang === "es" ? "En vivo" : "Live"}</span>
      <span key={index} className="min-w-0 flex-1 animate-[fadein_.5s_ease] truncate text-[14.5px] font-semibold text-navy">
        <b className="font-extrabold">{who}</b> {verb}
        <span className="text-ink-faint"> · {timeAgo(item.created_at, locale)}</span>
      </span>
    </div>
  );
}

function compact(n: number, locale: string, lang: "en" | "es") {
  if (n >= 1_000_000) {
    const v = (n / 1_000_000).toLocaleString(locale, { maximumFractionDigits: 1 });
    return lang === "es" ? `${v} millones de` : `${v} million`;
  }
  return n.toLocaleString(locale);
}
