import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { cx, PageHead, PlatformDot, Segmented } from "@/components/bits";
import { useAccounts, useEmails, useGhlPosts, useHub, useStats } from "@/lib/hub";
import { PLATFORMS } from "@/lib/stages";
import { prDateTime } from "@/lib/time";
import type { Platform, SocialStats } from "@/lib/types";
import PledgesPanel from "@/components/Pledges";

const isPlatform = (p: string): p is Platform => p in PLATFORMS;
const num = (n: number) => n.toLocaleString("en-US");
const span = (a: string, b: string) => {
  const f = (k: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { ...o, timeZone: "UTC" }).format(new Date(`${k}T12:00:00Z`));
  return `${f(a, { weekday: "long", day: "numeric" })} to ${f(b, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`;
};
const BAR = "#0086BA"; // one hue for every chart on this page; checked for contrast on white

/** "Up 132%" or "Down 5%", with an arrow so it never relies on colour. */
function Change({ value }: { value: number | null }) {
  if (value === null) return <span className="text-ink-faint" title="No figure for the week before">new</span>;
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-0.5 whitespace-nowrap text-ink-muted" title="Compared with the seven days before">
      <Icon size={13} strokeWidth={2.4} /> {Math.abs(Math.round(value))}%
    </span>
  );
}

const niceMax = (v: number) => {
  const p = 10 ** Math.floor(Math.log10(Math.max(1, v)));
  return [1, 1.5, 2, 3, 4, 5, 6, 8, 10].map((m) => m * p).find((m) => m >= v) ?? v;
};

/** One measure, one bar a day. Hover or tab to a bar for its figure; the tallest is labelled. */
function DailyBars({ labels, values, unit }: { labels: string[]; values: number[]; unit: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const top = niceMax(Math.max(...values));
  const peak = values.indexOf(Math.max(...values));
  return (
    <figure>
      <div className="relative ml-11 h-[190px]">
        {[1, 0.5, 0].map((t) => (
          <div key={t} className="absolute inset-x-0 border-t border-line-soft" style={{ bottom: `${t * 100}%` }}>
            <span className="absolute -left-11 -top-2 w-9 text-right text-[11.5px] tabular-nums text-ink-faint">{num(top * t)}</span>
          </div>
        ))}
        <div className="absolute inset-0 flex items-end justify-around gap-[2px]">
          {values.map((v, i) => (
            <div key={labels[i]} tabIndex={0} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} className="group relative flex h-full flex-1 cursor-default items-end justify-center outline-none" aria-label={`${labels[i]}: ${num(v)} ${unit}`}>
              <span className="w-full max-w-[38px] rounded-t-[4px] transition-opacity group-hover:opacity-80 group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-sky" style={{ height: `${Math.max(1, (v / top) * 100)}%`, background: BAR }} />
              {(hover === i || (hover === null && i === peak)) && (
                <span className={cx("pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-[12px] font-semibold tabular-nums", hover === i ? "bg-navy text-white shadow-pop" : "text-ink")} style={{ bottom: `calc(${(v / top) * 100}% + 6px)` }}>
                  {num(v)}
                  {hover === i && <span className="font-medium opacity-80"> {unit}</span>}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="ml-11 mt-2 flex justify-around gap-[2px]">
        {labels.map((l) => (
          <span key={l} className="flex-1 text-center text-[12px] text-ink-muted">
            {l}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{unit} by day</caption>
        <tbody>
          {labels.map((l, i) => (
            <tr key={l}>
              <th scope="row">{l}</th>
              <td>{values[i]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** A plain reading of the figures, worked out from the data rather than written by hand. */
export function readings(s: SocialStats): string[] {
  const out: string[] = [];
  const lead = [...s.platforms].sort((a, b) => b.impressions - a.impressions)[0];
  const share = Math.round((lead.impressions / Math.max(1, s.totals.impressions)) * 100);
  out.push(`${PLATFORMS[lead.platform].label} carries ${share}% of everything people saw, from ${lead.posts} posts. It is where the audience already is.`);
  const riser = [...s.platforms].filter((p) => p.reachChange !== null && p.platform !== lead.platform && p.posts > 0).sort((a, b) => (b.reachChange ?? 0) - (a.reachChange ?? 0))[0];
  if (riser)
    out.push(
      riser.posts <= 5
        ? `${PLATFORMS[riser.platform].label} reached ${Math.round(riser.reachChange!)}% more people than the week before with only ${riser.posts} post${riser.posts === 1 ? "" : "s"}. One or two more a week there is the easiest growth on the table.`
        : `${PLATFORMS[riser.platform].label} reached ${Math.round(riser.reachChange!)}% more people than the week before, from ${riser.posts} posts. It is the second place the audience is growing.`,
    );
  const peak = s.daily.likes.indexOf(Math.max(...s.daily.likes));
  const rest = s.daily.likes.reduce((a, b) => a + b, 0) - s.daily.likes[peak];
  if (s.daily.likes[peak] > rest) out.push(`${s.days[peak]} drew ${num(s.daily.likes[peak])} likes, more than the other six days together. Whatever went out that day is worth making again.`);
  const quiet = s.platforms.filter((p) => p.posts === 0).map((p) => PLATFORMS[p.platform].label);
  if (quiet.length) out.push(`${quiet.join(" and ")} had no posts this week. The same videos can go there with no extra work once they are in the hub.`);
  const unseen = s.platforms.filter((p) => p.posts > 0 && p.impressions === 0).map((p) => `${PLATFORMS[p.platform].label} had ${p.posts} post${p.posts === 1 ? "" : "s"} and no views`);
  if (unseen.length) out.push(`${unseen.join("; ")}. Worth checking the boards and links there before posting more.`);
  if (s.totals.comments > 0) out.push(`${num(s.totals.comments)} comments came in. Replying to each, with a question, is the cheapest reach there is.`);
  return out;
}

/** How the week went, read from HighLevel's statistics. */
export default function ResultsPage() {
  const { openPost } = useHub();
  const { data: stats } = useStats();
  const { data: posts = [] } = useGhlPosts();
  const { data: accounts = [] } = useAccounts();
  const { data: emails = [] } = useEmails();
  const [measure, setMeasure] = useState<"impressions" | "likes" | "comments">("impressions");
  const [filter, setFilter] = useState<Platform | "all">("all");

  const published = useMemo(() => posts.filter((p) => p.status === "published").sort((a, b) => b.at.localeCompare(a.at)), [posts]);
  const platformsPosted = useMemo(() => [...new Set(published.map((p) => p.platform).filter(isPlatform))], [published]);
  const shown = filter === "all" ? published : published.filter((p) => p.platform === filter);
  if (!stats) return null;
  const s = stats.social;
  const maxImp = Math.max(1, ...s.platforms.map((p) => p.impressions));
  const maxAge = Math.max(1, ...s.audience.age.map((a) => a[1]));
  const people = s.audience.gender.reduce((a, g) => a + g[1], 0);
  const notReported = accounts.filter((a) => !s.platforms.some((p) => p.platform === a.platform)).map((a) => PLATFORMS[a.platform].label);

  return (
    <>
      <PageHead title="Results" sub={`${span(s.start, s.end)}, next to the seven days before. Every figure here is read from the accounts through HighLevel.`} />

      <dl className="grid grid-cols-2 border-y border-line sm:grid-cols-3 lg:grid-cols-5 lg:divide-x lg:divide-line">
        {[
          { label: "People reached", n: s.totals.reach, change: s.change.reach },
          { label: "Times seen", n: s.totals.impressions, change: s.change.impressions },
          { label: "Likes, comments and shares", n: s.totals.likes + s.totals.comments + s.totals.shares },
          { label: "New followers", n: s.totals.followers },
          { label: "Posts", n: s.totals.posts, change: s.change.posts },
        ].map((k, i) => (
          <div key={k.label} className={cx("py-4 lg:px-5", i === 0 && "lg:pl-0")}>
            <dt className="text-[12.5px] font-medium text-ink-muted">{k.label}</dt>
            <dd className="mt-1 flex items-baseline gap-2">
              <span className="text-[28px] font-extrabold leading-none tracking-[-0.03em] tabular-nums">{num(k.n)}</span>
              {k.change !== undefined && (
                <span className="text-[12.5px] font-semibold">
                  <Change value={k.change} />
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-10 grid gap-x-14 gap-y-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[18px] font-extrabold tracking-[-0.02em]">Day by day</h2>
            <Segmented
              value={measure}
              onChange={setMeasure}
              options={
                [
                  ["impressions", "Times seen"],
                  ["likes", "Likes"],
                  ["comments", "Comments"],
                ] as const
              }
            />
          </div>
          <DailyBars labels={s.days} values={s.daily[measure]} unit={measure === "impressions" ? "times seen" : measure} />
        </section>

        <section>
          <h2 className="section-title">What this suggests</h2>
          <ul className="mt-3 space-y-3.5">
            {readings(s).map((r) => (
              <li key={r} className="border-l-2 border-sun pl-3 text-[13.5px] leading-relaxed text-ink-muted">
                {r}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <PledgesPanel />

      <section className="mt-12">
        <h2 className="text-[18px] font-extrabold tracking-[-0.02em]">By platform</h2>
        <div className="scroll-x mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] border-t border-line text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-line text-[12.5px] text-ink-muted">
                <th className="py-2.5 pr-4 font-medium">Platform</th>
                <th className="w-[26%] py-2.5 pr-4 font-medium">Times seen</th>
                <th className="py-2.5 pr-4 text-right font-medium">Reached</th>
                <th className="py-2.5 pr-4 text-right font-medium">Likes</th>
                <th className="py-2.5 pr-4 text-right font-medium">Comments</th>
                <th className="py-2.5 pr-4 text-right font-medium">Shares</th>
                <th className="py-2.5 pr-4 text-right font-medium">New followers</th>
                <th className="py-2.5 text-right font-medium">Posts</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {s.platforms.map((p) => (
                <tr key={p.platform} className="border-b border-line">
                  <th scope="row" className="py-3 pr-4 font-semibold">
                    <span className="flex items-center gap-2">
                      <PlatformDot platform={p.platform} size={18} /> {PLATFORMS[p.platform].label}
                    </span>
                  </th>
                  <td className="py-3 pr-4">
                    <span className="flex items-center gap-2.5">
                      <span className="h-2 flex-1 rounded-r-[4px] bg-paper">
                        <span className="block h-full rounded-r-[4px]" style={{ width: `${(p.impressions / maxImp) * 100}%`, background: BAR }} />
                      </span>
                      <span className="w-[52px] text-right font-semibold">{num(p.impressions)}</span>
                      <span className="w-[52px] text-[12.5px]">{p.posts > 0 && <Change value={p.impressionsChange} />}</span>
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right">{p.reach === null ? <span className="text-ink-faint">not given</span> : num(p.reach)}</td>
                  <td className="py-3 pr-4 text-right">{num(p.likes)}</td>
                  <td className="py-3 pr-4 text-right">{num(p.comments)}</td>
                  <td className="py-3 pr-4 text-right">{num(p.shares)}</td>
                  <td className="py-3 pr-4 text-right">{num(p.followers)}</td>
                  <td className="py-3 text-right">{p.posts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[12.5px] leading-relaxed text-ink-faint">
          {notReported.length > 0 && `${[...new Set(notReported)].join(" and ")} did not come back in these figures. `}
          Figures for each single post are not part of what HighLevel returns, so this page shows days and platforms rather than a ranking of posts.
        </p>
      </section>

      <div className="mt-12 grid gap-x-14 gap-y-10 lg:grid-cols-2">
        <section>
          <h2 className="text-[18px] font-extrabold tracking-[-0.02em]">Who is following</h2>
          <p className="mt-1 text-[13px] text-ink-muted">Ages of the {num(s.audience.age.reduce((a, b) => a + b[1], 0))} followers the platforms describe.</p>
          <ul className="mt-4 space-y-2">
            {s.audience.age.map(([label, n]) => (
              <li key={label} className="flex items-center gap-3 text-[13px]">
                <span className="w-[84px] shrink-0 text-ink-muted">{label}</span>
                <span className="h-2.5 flex-1">
                  <span className="block h-full rounded-r-[4px]" style={{ width: `${(n / maxAge) * 100}%`, background: BAR }} title={`${label}: ${n}`} />
                </span>
                <span className="w-8 text-right font-semibold tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[13px] text-ink-muted">
            {s.audience.gender.map(([label, n], i) => (
              <span key={label}>
                {i > 0 && " · "}
                <span className="font-semibold text-ink">{Math.round((n / people) * 100)}%</span> {label.toLowerCase()}
              </span>
            ))}
          </p>
        </section>

        <section>
          <h2 className="text-[18px] font-extrabold tracking-[-0.02em]">Emails</h2>
          <p className="mt-1 text-[13px] text-ink-muted">Opens and clicks for each campaign are on the Emails page.</p>
          <ul className="mt-4 border-t border-line">
            {emails
              .filter((e) => stats.emails[e.id] && !/resend/i.test(e.name))
              .slice(0, 4)
              .map((e) => {
                const st = stats.emails[e.id];
                return (
                  <li key={e.id} className="flex items-center gap-4 border-b border-line py-2.5 text-[13px] tabular-nums">
                    <span className="min-w-0 flex-1 truncate font-medium" title={e.name}>
                      {e.name}
                    </span>
                    <span className="shrink-0">
                      <span className="font-semibold">{Math.round(st.openRate)}%</span> <span className="text-ink-muted">opened</span>
                    </span>
                    <span className="w-[84px] shrink-0 text-right">
                      <span className="font-semibold">{st.clickRate}%</span> <span className="text-ink-muted">clicked</span>
                    </span>
                  </li>
                );
              })}
          </ul>
          <Link to="/plan?view=emails" className="mt-3 inline-flex items-center gap-1 text-[13.5px] font-semibold text-sky-ink hover:underline">
            See every campaign <ArrowRight size={14} />
          </Link>
        </section>
      </div>

      <section className="mt-12">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[18px] font-extrabold tracking-[-0.02em]">What went out</h2>
          <Segmented value={filter} onChange={setFilter} options={[["all", "All"] as const, ...platformsPosted.map((p) => [p, PLATFORMS[p].label] as const)]} />
        </div>
        <ul className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {shown.map((p) => {
            const m = p.media[0];
            return (
              <li key={p.id}>
                <button type="button" onClick={() => openPost(p.id)} className="group block w-full overflow-hidden rounded-xl border border-line text-left transition hover:border-navy/40">
                  {m &&
                    (m.type.startsWith("video/") ? (
                      <video src={`${m.url}#t=0.1`} poster={p.thumbnail ?? undefined} muted playsInline preload="metadata" className="aspect-[4/5] w-full bg-paper object-cover" />
                    ) : (
                      <img src={m.url} alt="" loading="lazy" className="aspect-[4/5] w-full bg-paper object-cover" />
                    ))}
                  <div className="border-t border-line p-3">
                    <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-muted">
                      {isPlatform(p.platform) && <PlatformDot platform={p.platform} size={16} />} <span className="capitalize">{p.type}</span>
                      {p.media.length > 1 && `, ${p.media.length} slides`}
                    </p>
                    <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug">{p.caption || <span className="text-ink-faint">No caption</span>}</p>
                    <p className="mt-1.5 text-[12px] text-ink-faint">{prDateTime(p.at)}</p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
