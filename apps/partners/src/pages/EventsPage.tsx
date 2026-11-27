import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarPlus, Check, ChevronDown, Clock, ExternalLink, Globe2, MapPin, Megaphone, Package, PartyPopper, Sparkles } from "lucide-react";
import Shell from "@/components/Shell";
import Sheet from "@/components/Sheet";
import Composer from "@/components/Composer";
import { useHubCopy } from "@/lib/hubCopy";
import { useMe, usePartnerEvents } from "@/lib/hub";
import { kitAudienceMatches } from "@/lib/kinds";
import { downloadIcs, seasonMoments, teamEvents, worldDays, type CalendarItem } from "@/lib/events";

/**
 * Events (27 Nov 2026). A tester asked for one place that says what's coming up and what's
 * happening around them. On top, the season's own moments on the sunny banner (21 December,
 * 27 January, 31 January), then events the team adds in the Kindness Hub, with the ones in the
 * member's country marked, and the international days worth planning for. Any event goes into
 * the member's own calendar with one tap.
 */
export default function EventsPage() {
  const { h, lang } = useHubCopy();
  const { data: me } = useMe();
  const { data: rows, isLoading } = usePartnerEvents();
  const moments = seasonMoments(lang);
  const ahead = moments.filter((m) => m.days >= 0);
  const done = moments.filter((m) => m.days < 0);
  const team = teamEvents((rows ?? []).filter((e) => !me || kitAudienceMatches(e.audience, me.kind)), lang, me?.country ?? null);
  const days = worldDays(lang);

  return (
    <Shell wide>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="h-page">{h.eventsTitle}</h1>
          <p className="m-0 mt-1 text-[15px] font-medium text-ink-muted">{h.eventsSub}</p>
        </div>

        {/* the season's own moments: the ones everyone does together */}
        <section className="relative overflow-hidden bg-[#8fd3f2] bg-[url('/hub/sky.jpg')] bg-cover bg-[center_40%]" aria-label={h.seasonMoments}>
          <div className="flex flex-col gap-4 px-4 py-6 sm:px-7 sm:py-7">
            <div className="flex flex-col items-start gap-2">
              <span className="box bg-magenta text-[14px] text-white">{h.seasonTag}</span>
              <span className="box max-w-full bg-white text-[22px] leading-tight text-navy sm:text-[26px]">{h.seasonMoments}</span>
              <p className="m-0 bg-white/90 px-3 py-1.5 text-[14.5px] font-semibold leading-snug text-navy">{h.seasonMomentsSub}</p>
            </div>
            {ahead.length > 0 && (
              <ol className={`m-0 grid list-none gap-3 p-0 ${ahead.length >= 3 ? "md:grid-cols-3" : ahead.length === 2 ? "md:grid-cols-2" : ""}`}>
                {ahead.map((m, i) => (
                  <li key={m.key} className="flex flex-col gap-3 bg-white p-4 shadow-[0_8px_24px_rgba(14,35,75,0.12)]">
                    <div className="flex items-start gap-3">
                      <DateBlock item={m} tone="gold" />
                      <div className="min-w-0 flex-1">
                        {i === 0 && <span className="chip mb-1 bg-orange text-white">{h.nextMomentLabel}</span>}
                        <b className="block text-[16px] font-extrabold leading-snug text-navy">{m.title}</b>
                        <When item={m} />
                      </div>
                    </div>
                    {m.idea && <p className="m-0 text-[14px] font-medium leading-snug text-ink2">{m.idea}</p>}
                    <AddToCalendar item={m} className="mt-auto" />
                  </li>
                ))}
              </ol>
            )}
            {done.length > 0 && (
              <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 self-start bg-white/90 px-3 py-1.5 text-[13px] font-semibold text-ink2">
                <span className="font-extrabold text-navy">{h.alreadyThisSeason}:</span>
                {done.map((m) => (
                  <span key={m.key} className="inline-flex items-center gap-1">
                    <Check className="h-3.5 w-3.5 text-sky" aria-hidden="true" />
                    {m.title}, <DayMonth date={m.date} />
                  </span>
                ))}
              </p>
            )}
          </div>
          <div className="h-2 bg-bar" aria-hidden="true" />
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* events the team adds in the Kindness Hub */}
          <section className="flex flex-col gap-3">
            <SectionHead icon={Megaphone} tint="text-orange" title={h.fromTeam} sub={h.fromTeamSub} />
            {isLoading && <div className="h-28 animate-pulse bg-tint-sky/60" />}
            {!isLoading && team.length === 0 && <p className="m-0 bg-tint-sky px-4 py-4 text-[14.5px] font-semibold text-ink2">{h.noTeamEvents}</p>}
            {team.length > 0 && (
              <ol className="m-0 flex list-none flex-col p-0">
                {team.map((e) => (
                  <li key={e.key} className="flex gap-4 border-b-[1.5px] border-hair py-4 first:pt-1 last:border-b-0">
                    <DateBlock item={e} tone="orange" />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <b className="text-[15.5px] font-extrabold leading-snug text-navy">{e.title}</b>
                        {e.nearYou && <span className="chip bg-sky text-white">{h.nearYou}</span>}
                      </span>
                      {(e.place || e.time) && (
                        <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] font-semibold text-ink-muted">
                          {e.place && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-sky" aria-hidden="true" />
                              {e.place}
                            </span>
                          )}
                          {e.time && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-sky" aria-hidden="true" />
                              {e.time}
                            </span>
                          )}
                        </span>
                      )}
                      {e.idea && <p className="m-0 text-[13.5px] font-medium leading-snug text-ink2">{e.idea}</p>}
                      <When item={e} />
                      <div className="mt-1 flex flex-wrap gap-2">
                        {e.url && (
                          <a href={e.url} target="_blank" rel="noopener noreferrer" className="btn-soft h-9 px-3 text-[13px]">
                            <ExternalLink className="h-4 w-4" aria-hidden="true" />
                            {h.details}
                          </a>
                        )}
                        <AddToCalendar item={e} />
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <TellUs />
          </section>

          {/* international days, soonest first */}
          <WorldDays days={days} />
        </div>

        <Link to="/kit" className="btn-soft h-10 w-fit px-3 text-sm">
          <Package className="h-4 w-4" aria-hidden="true" />
          {h.findPost}
        </Link>
      </div>
    </Shell>
  );
}

function SectionHead({ icon: Icon, tint, title, sub }: { icon: typeof Sparkles; tint: string; title: string; sub: string }) {
  return (
    <div>
      <h2 className="h-section flex items-center gap-2">
        <Icon className={`h-5 w-5 ${tint}`} aria-hidden="true" />
        {title}
      </h2>
      <p className="m-0 mt-0.5 text-[14px] font-medium text-ink-muted">{sub}</p>
    </div>
  );
}

const TONES = {
  gold: "bg-gold text-navy",
  orange: "bg-tint-orange text-orange",
  sky: "bg-tint-sky text-sky-deep",
};

/** The day and month in a square, like a page torn off a calendar. A run of days shows both ends. */
function DateBlock({ item, tone }: { item: CalendarItem; tone: keyof typeof TONES }) {
  const { locale } = useHubCopy();
  const start = new Date(`${item.date}T12:00:00`);
  const end = item.end ? new Date(`${item.end}T12:00:00`) : null;
  const month = (d: Date) => d.toLocaleDateString(locale, { month: "short" }).replace(".", "");
  return (
    <span className={`flex h-14 min-w-14 shrink-0 flex-col items-center justify-center px-1.5 ${TONES[tone]}`}>
      <b className="text-[20px] font-extrabold leading-none">
        {start.getDate()}
        {end && end.getMonth() === start.getMonth() ? `–${end.getDate()}` : ""}
      </b>
      <span className="mt-0.5 text-[11px] font-bold">{month(start)}</span>
    </span>
  );
}

function DayMonth({ date }: { date: string }) {
  const { locale } = useHubCopy();
  return <>{new Date(`${date}T12:00:00`).toLocaleDateString(locale, { day: "numeric", month: "short" }).replace(".", "")}</>;
}

/** "In 24 days · Monday, December 21" (or the range for an event over several days). */
function When({ item }: { item: CalendarItem }) {
  const { h, locale } = useHubCopy();
  const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });
  const range = item.end ? `${fmt(item.date)} – ${fmt(item.end)}` : fmt(item.date);
  return (
    <span className="mt-0.5 block text-[12.5px] font-bold text-ink-faint">
      {item.days < 0 && item.end ? range : `${h.inDays(item.days)} · ${range}`}
    </span>
  );
}

function AddToCalendar({ item, className = "" }: { item: CalendarItem; className?: string }) {
  const { h } = useHubCopy();
  return (
    <button type="button" onClick={() => downloadIcs(item)} className={`btn h-9 w-fit border-[1.5px] border-hair px-3 text-[13px] text-ink2 hover:border-sky ${className}`}>
      <CalendarPlus className="h-4 w-4 text-sky" aria-hidden="true" />
      {h.addToCalendar}
    </button>
  );
}

/** "Hosting a kindness event?" Members tell the team, and the team adds it in the Kindness Hub. */
function TellUs() {
  const { h } = useHubCopy();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  return (
    <div className="flex flex-col items-start gap-2 border-s-4 border-gold bg-tint-gold px-4 py-3.5">
      {sent ? (
        <p className="m-0 flex items-center gap-2 text-[14.5px] font-bold text-navy">
          <PartyPopper className="h-5 w-5 text-magenta" aria-hidden="true" />
          {h.thanksTitle}
        </p>
      ) : (
        <>
          <b className="text-[15px] font-extrabold text-navy">{h.hostingTitle}</b>
          <p className="m-0 text-[14px] font-medium leading-snug text-ink2">{h.hostingBody}</p>
          <button type="button" onClick={() => setOpen(true)} className="btn-orange mt-1 h-10 px-4 text-sm">
            {h.tellUs}
          </button>
        </>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title={h.eventSheetTitle} wide>
        <Composer audience="team" postKind="post" placeholder={h.eventPlaceholder} onDone={() => (setOpen(false), setSent(true))} />
      </Sheet>
    </div>
  );
}

/** International days by month; the next two months first, the rest of the year one tap away. */
function WorldDays({ days }: { days: CalendarItem[] }) {
  const { h, locale } = useHubCopy();
  const [all, setAll] = useState(false);
  const soon = days.filter((d) => d.days <= 70);
  const shown = all || soon.length < 4 ? days : soon;
  const months = new Map<string, CalendarItem[]>();
  for (const d of shown) {
    const key = d.date.slice(0, 7);
    months.set(key, [...(months.get(key) ?? []), d]);
  }
  return (
    <section className="flex flex-col gap-3">
      <SectionHead icon={Globe2} tint="text-sky" title={h.worldDays} sub={h.worldDaysSub} />
      {[...months.entries()].map(([key, list]) => (
        <div key={key} className="flex flex-col">
          <h3 className="m-0 border-b-[1.5px] border-hair pb-1.5 text-[13px] font-extrabold text-sky-deep">
            {new Date(`${key}-15T12:00:00`).toLocaleDateString(locale, { month: "long", year: "numeric" })}
          </h3>
          <ol className="m-0 flex list-none flex-col p-0">
            {list.map((d) => (
              <li key={d.key} className="flex gap-3.5 border-b-[1.5px] border-hair py-3 last:border-b-0">
                <DateBlock item={d} tone="sky" />
                <span className="min-w-0 flex-1">
                  <b className="block text-[15px] font-extrabold leading-snug text-navy">{d.title}</b>
                  {d.idea && <span className="mt-0.5 block text-[13.5px] font-medium leading-snug text-ink-muted">{d.idea}</span>}
                  <When item={d} />
                </span>
              </li>
            ))}
          </ol>
        </div>
      ))}
      {shown.length < days.length && (
        <button type="button" onClick={() => setAll(true)} className="btn-quiet w-fit">
          {h.loadMore}
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </section>
  );
}
