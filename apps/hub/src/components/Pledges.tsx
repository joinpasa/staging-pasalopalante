import { useMemo, useState } from "react";
import { cx } from "@/components/bits";
import { useGhlPosts, usePledges } from "@/lib/hub";
import { sourceLabel } from "@/lib/links";
import type { PledgeDay } from "@/lib/types";

// Pledges made on the website, day by day, beside what went out that day, and by the link that
// brought them. This is the number the posts are for, so it sits at the top of Results.

const BAR = "#d81b60";
const num = (n: number) => n.toLocaleString("en-US");
const prDay = (iso: string) => new Date(new Date(iso).getTime() - 4 * 3_600_000).toISOString().slice(0, 10);
const label = (day: string, long = false) => new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", long ? { weekday: "short", day: "numeric", month: "short" } : { day: "numeric", month: "short" });

function lastDays(days: PledgeDay[], n: number, end: string): PledgeDay[] {
  const by = new Map(days.map((d) => [d.day, d]));
  const out: PledgeDay[] = [];
  const e = new Date(`${end}T12:00:00Z`);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(e.getTime() - i * 86_400_000).toISOString().slice(0, 10);
    out.push(by.get(d) ?? { day: d, people: 0, acts: 0, orgs: 0, spanish: 0 });
  }
  return out;
}

const monday = (day: string) => {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};

export default function PledgesPanel() {
  const { data } = usePledges();
  const { data: posts = [] } = useGhlPosts();
  const [hover, setHover] = useState<number | null>(null);

  const today = data ? prDay(data.read) : "";
  const days = useMemo(() => (data ? lastDays(data.days, 30, today) : []), [data, today]);
  const postsByDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of posts) if (p.status === "published") m.set(prDay(p.at), (m.get(prDay(p.at)) ?? 0) + 1);
    return m;
  }, [posts]);
  const postsFrom = useMemo(() => posts.filter((p) => p.status === "published").map((p) => prDay(p.at)).sort()[0], [posts]);

  if (!data) return null;
  const thisMon = monday(today);
  const lastMon = new Date(new Date(`${thisMon}T12:00:00Z`).getTime() - 7 * 86_400_000).toISOString().slice(0, 10);
  const sum = (from: string, to: string, k: keyof Omit<PledgeDay, "day">) => data.days.filter((d) => d.day >= from && d.day < to).reduce((a, d) => a + d[k], 0);
  const tomorrow = new Date(new Date(`${today}T12:00:00Z`).getTime() + 86_400_000).toISOString().slice(0, 10);
  const thisWeek = { people: sum(thisMon, tomorrow, "people"), acts: sum(thisMon, tomorrow, "acts"), orgs: sum(thisMon, tomorrow, "orgs") };
  const lastWeekPeople = sum(lastMon, thisMon, "people");
  const best = days.reduce((a, d) => (d.people > a.people ? d : a), days[0]);
  const top = Math.max(5, ...days.map((d) => d.people));
  const tracked = data.sources.filter((s) => s.source !== "not tracked");
  const untracked = data.sources.find((s) => s.source === "not tracked");

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-extrabold tracking-[-0.02em]">Pledges on the website</h2>
          <p className="mt-1 max-w-[680px] text-[13.5px] text-ink-muted">People who pledged at passkindnessforward.com and pasalopalante.com, day by day for the last 30 days, with how many posts went out that day. The big pledges from organisations are counted on their own, so they do not hide what people do.</p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 border-y border-line sm:grid-cols-4 sm:divide-x sm:divide-line">
        {[
          { label: "People who pledged this week", value: num(thisWeek.people), note: `Since Monday ${label(thisMon)}, against ${num(lastWeekPeople)} all last week` },
          { label: "Acts they pledged", value: num(thisWeek.acts), note: "This week" },
          { label: "Organisations that pledged", value: num(thisWeek.orgs), note: "This week" },
          { label: "Best day in 30 days", value: best ? `${num(best.people)} people` : "", note: best ? label(best.day, true) : undefined },
        ].map((k, i) => (
          <div key={k.label} className={cx("py-4 sm:px-5", i === 0 && "sm:pl-0")}>
            <dt className="text-[12.5px] font-medium text-ink-muted">{k.label}</dt>
            <dd className="mt-1 text-[26px] font-extrabold leading-none tracking-[-0.03em] tabular-nums">{k.value}</dd>
            {k.note && <dd className="mt-1 text-[12.5px] font-semibold text-ink-muted">{k.note}</dd>}
          </div>
        ))}
      </dl>

      <figure className="mt-6">
        <div className="relative ml-9 h-[180px]">
          {[1, 0.5, 0].map((t) => (
            <div key={t} className="absolute inset-x-0 border-t border-line-soft" style={{ bottom: `${t * 100}%` }}>
              <span className="absolute -left-9 -top-2 w-7 text-right text-[11.5px] tabular-nums text-ink-faint">{Math.round(top * t)}</span>
            </div>
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {days.map((d, i) => {
              const out = postsFrom && d.day >= postsFrom ? postsByDay.get(d.day) ?? 0 : null;
              return (
                <div
                  key={d.day}
                  tabIndex={0}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  className="group relative flex h-full flex-1 cursor-default items-end justify-center outline-none"
                  aria-label={`${label(d.day, true)}: ${d.people} people pledged`}
                >
                  <span className="w-full rounded-t-[4px] transition-opacity group-hover:opacity-80" style={{ height: `${Math.max(d.people ? 2 : 0, (d.people / top) * 100)}%`, background: BAR }} />
                  {hover === i && (
                    <span className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-10 w-max -translate-x-1/2 rounded-md bg-navy px-2.5 py-1.5 text-[12px] leading-snug text-white shadow-pop">
                      <span className="block font-bold">{label(d.day, true)}</span>
                      <span className="block tabular-nums">
                        {num(d.people)} people pledged {num(d.acts)} acts
                      </span>
                      {d.orgs > 0 && <span className="block tabular-nums">{d.orgs} organisations too</span>}
                      <span className="block opacity-80">{out === null ? "Posts: not in the hub's data" : `${out} posts went out`}</span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {/* what went out each day, under its bar */}
        <div className="ml-9 mt-1.5 flex gap-[2px]" aria-hidden>
          {days.map((d) => {
            const out = postsFrom && d.day >= postsFrom ? postsByDay.get(d.day) ?? 0 : null;
            return (
              <span key={d.day} className="flex h-3 flex-1 items-center justify-center">
                {out ? <span className="h-2 w-2 rounded-full bg-navy" style={{ opacity: Math.min(1, 0.35 + out / 12) }} title={`${out} posts`} /> : out === 0 ? <span className="h-[3px] w-[3px] rounded-full bg-line" /> : null}
              </span>
            );
          })}
        </div>
        <div className="ml-9 mt-1 flex gap-[2px]">
          {days.map((d, i) => (
            <span key={d.day} className="flex-1 overflow-visible whitespace-nowrap text-center text-[11px] text-ink-muted">
              {i % 5 === 0 || i === days.length - 1 ? label(d.day) : ""}
            </span>
          ))}
        </div>
        <figcaption className="ml-9 mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: BAR }} /> People who pledged
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-navy" /> Posts went out that day (darker is more)
          </span>
          <span>Today counts only part of the day.</span>
        </figcaption>
        <table className="sr-only">
          <caption>People who pledged, by day</caption>
          <tbody>
            {days.map((d) => (
              <tr key={d.day}>
                <th scope="row">{d.day}</th>
                <td>{d.people}</td>
                <td>{d.acts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figure>

      <div className="mt-8">
        <h3 className="text-[15px] font-extrabold">Where pledges came from, last 30 days</h3>
        {tracked.length === 0 ? (
          <p className="mt-2 max-w-[760px] rounded-lg bg-paper px-4 py-3 text-[13.5px] leading-relaxed text-ink-muted">
            Not tracked yet. Once the pledge form change goes live, every pledge keeps the link that brought it: the Instagram bio, a post, a story, this week's email or a partner's page. Use the tracked links on each card and in the bio so it shows here.
            {untracked ? ` ${num(untracked.people)} pledges in this period came before tracking started.` : ""}
          </p>
        ) : (
          <table className="mt-3 w-full max-w-[760px] border-t border-line text-left text-[13.5px]">
            <thead>
              <tr className="text-[12px] text-ink-faint">
                <th className="py-2 font-semibold">Came from</th>
                <th className="py-2 font-semibold">Campaign or post</th>
                <th className="py-2 text-right font-semibold">People</th>
                <th className="py-2 text-right font-semibold">Acts</th>
              </tr>
            </thead>
            <tbody>
              {data.sources.map((s) => (
                <tr key={`${s.source}${s.medium}${s.campaign}${s.content}`} className="border-t border-line">
                  <td className="py-2 font-semibold">{sourceLabel(s.source, s.medium)}</td>
                  <td className="py-2 text-ink-muted">{[s.campaign, s.content].filter(Boolean).join(", ") || "–"}</td>
                  <td className="py-2 text-right tabular-nums">{num(s.people)}</td>
                  <td className="py-2 text-right tabular-nums">{num(s.acts)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
