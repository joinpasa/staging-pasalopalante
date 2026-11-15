import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Check, ChevronRight, Send } from "lucide-react";
import { Avatar, cx, FormatBadge, LeverChip, PauseMark, StagePill } from "@/components/bits";
import { blockers } from "@/lib/checks";
import { useBriefs, useGhlPosts, useHub, useItems, useKit, useMe, useMembers, useStats, useSuggestions, useTasks } from "@/lib/hub";
import { spaceWaiting, useSpace } from "@/lib/space";
import { stageMeta } from "@/lib/stages";
import { longDate, prDateKey, prDateTime, prTime } from "@/lib/time";
import type { Item, Member, Task } from "@/lib/types";
import { addDays, briefFor, cardsOn, dayShort, goingOut, nearDay, planWeek, postsOn, todayKey, weekDays } from "@/lib/week";

const num = (n: number) => n.toLocaleString("en-US");

/** What is waiting on this person, with the reason in plain words. */
function waitingFor(me: Member | undefined, items: Item[]): { item: Item; why: string }[] {
  if (!me) return [];
  const out: { item: Item; why: string }[] = [];
  for (const item of items) {
    const mine = item.ownerId === me.id;
    const canApprove = me.role !== "member";
    if (item.needsChanges && mine) out.push({ item, why: `Sent back to you: ${item.needsChanges}` });
    else if (item.stage === "review" && canApprove && (!mine || me.role === "admin")) out.push({ item, why: "Waiting for your review" });
    else if (item.stage === "approved" && canApprove) {
      const stop = blockers(item)[0];
      out.push({ item, why: stop ? `Approved, but it can't go out yet: ${stop.title.toLowerCase()}` : "Approved and ready to schedule" });
    } else if (mine && ["idea", "planning", "creating"].includes(item.stage) && item.publishAt && new Date(item.publishAt).getTime() - Date.now() < 3 * 86400_000 && new Date(item.publishAt).getTime() > Date.now())
      out.push({ item, why: `Yours, and due ${prDateTime(item.publishAt)}` });
  }
  return out;
}

/** Home: this week's goal, how the work moves, what needs you, and the week day by day. */
export default function HomePage() {
  const { open } = useHub();
  const { data: briefs = [] } = useBriefs();
  const { data: items = [] } = useItems();
  const { data: posts = [] } = useGhlPosts();
  const { data: suggestions = [] } = useSuggestions();
  const { data: members = [] } = useMembers();
  const { data: tasks = [] } = useTasks();
  const { data: kit } = useKit();
  const { data: stats } = useStats();
  const { data: me } = useMe();
  const space = useSpace();

  const today = todayKey();
  const week = planWeek(briefs, today);
  const brief = briefFor(briefs, week);
  const days = weekDays(week);
  const end = addDays(week, 7);
  const inWeek = (key?: string) => !!key && key >= week && key < end;
  const weekTasks = tasks.filter((t) => t.weekStart === week);
  const weekCards = items.filter((i) => i.publishAt && inWeek(prDateKey(i.publishAt)));
  const member = (id?: string) => members.find((m) => m.id === id);

  // the five steps every piece of work goes through, with how many are at each one
  const flow = [
    { label: "Inbox", n: suggestions.filter((s) => s.status === "new").length + spaceWaiting(space), what: "new from the team, partners and ambassadors", to: "/inbox", bar: "bg-sky" },
    { label: "Making", n: items.filter((i) => ["idea", "planning", "creating"].includes(i.stage)).length, what: "ideas and posts being made", to: "/plan", bar: "bg-orange" },
    { label: "Review", n: items.filter((i) => i.stage === "review").length, what: "waiting for a second pair of eyes", to: "/plan?view=board", bar: "bg-rose" },
    { label: "Going out", n: weekCards.filter(goingOut).length, what: "approved or scheduled this week", to: "/plan?view=calendar", bar: "bg-sun" },
    { label: "Growing", n: weekTasks.filter((t) => t.done).length, of: weekTasks.length, what: "growth tasks done this week", to: "/growth", bar: "bg-navy" },
  ];

  const waiting = waitingFor(me, items);
  const myTasks = weekTasks.filter((t) => !t.done && t.ownerId === me?.id).slice(0, 4);
  const startsIn = week > today ? (week === addDays(today, 1) ? "starts tomorrow" : `starts ${dayShort(week)}`) : "this week";

  // the goal, measured from what is actually in the hub
  const postDays = days.filter((d) => cardsOn(items, d).some((i) => i.format !== "email" && goingOut(i)) || postsOn(posts, items, d).length > 0).length;
  const emailOut = weekCards.some((i) => i.format === "email" && goingOut(i)) ? 1 : 0;
  const meters = [
    { label: "Days with a post going out", n: postDays, of: 7 },
    { label: "Growth tasks done", n: weekTasks.filter((t) => t.done).length, of: Math.max(1, weekTasks.length) },
    { label: "Partners who shared the kit", n: kit?.weekStart === week ? kit.shares : 0, of: 10 },
    { label: "Weekly email approved", n: emailOut, of: 1 },
  ];

  return (
    <>
      {/* the week, in one glance */}
      <section className="max-w-[860px]">
        <p className="mb-4 flex flex-wrap items-center gap-2 text-[13.5px] font-semibold text-ink-muted">
          <PauseMark className="h-3.5" /> Week of {longDate(week)}, {startsIn}
        </p>
        <h1 className="text-[34px] font-extrabold leading-[1.06] tracking-[-0.03em] md:text-[44px]">{brief?.headline ?? "This week"}</h1>
        {brief?.summary && <p className="mt-5 max-w-[700px] text-[16px] leading-[1.65] text-ink-muted">{brief.summary}</p>}
        {brief?.goal && (
          <p className="mt-6 inline-flex max-w-[700px] items-start gap-3 rounded-xl bg-navy px-5 py-4 text-[15.5px] font-semibold leading-snug text-white">
            <span className="mt-[3px] shrink-0 text-[12px] font-bold text-sun">Goal</span> {brief.goal}
          </p>
        )}
      </section>

      {/* how the work moves, and where it is now */}
      <section className="mt-10" aria-labelledby="flow-title">
        <h2 id="flow-title" className="mb-3 text-[13px] font-semibold text-ink-muted">
          How the work moves
        </h2>
        <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5 lg:gap-0">
          {flow.map((s, i) => (
            <li key={s.label} className="relative lg:pr-6">
              <Link to={s.to} className="group block h-full overflow-hidden rounded-xl border border-line bg-white transition hover:border-navy/25 hover:shadow-pop">
                <span className={cx("block h-1.5", s.bar)} />
                <span className="block px-4 pb-4 pt-3">
                  <span className="flex items-center justify-between text-[13px] font-bold">
                    {s.label}
                    <ArrowUpRight size={15} className="text-ink-faint transition group-hover:text-navy" />
                  </span>
                  <span className="mt-2 block text-[32px] font-extrabold leading-none tracking-[-0.03em] tabular-nums">
                    {s.n}
                    {s.of !== undefined && <span className="text-[18px] font-bold text-ink-faint"> of {s.of}</span>}
                  </span>
                  <span className="mt-1.5 block text-[12.5px] leading-snug text-ink-muted">{s.what}</span>
                </span>
              </Link>
              {i < flow.length - 1 && (
                <span className="absolute right-0 top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center text-ink-faint lg:flex" aria-hidden>
                  <ChevronRight size={18} strokeWidth={2.4} />
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-12 grid gap-x-14 gap-y-12 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 space-y-12">
          {/* what needs this person */}
          <section>
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-[20px] font-extrabold tracking-[-0.02em]">Needs you</h2>
              {waiting.some((w) => w.item.stage === "review") && (
                <Link to="/review" className="flex shrink-0 items-center gap-1 text-[13.5px] font-semibold text-sky-ink hover:underline">
                  Review them one by one <ArrowRight size={14} />
                </Link>
              )}
            </div>
            {waiting.length === 0 && myTasks.length === 0 ? (
              <p className="mt-3 border-t border-line py-4 text-[14.5px] text-ink-muted">Nothing is waiting on you right now.</p>
            ) : (
              <ul className="mt-3 border-t border-line">
                {waiting.map(({ item, why }) => (
                  <li key={item.id} className="border-b border-line">
                    <button type="button" onClick={() => open(item.id)} className="group flex w-full items-center gap-4 py-3.5 text-left transition hover:bg-paper">
                      <StagePill stage={item.stage} className="w-[96px] shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-semibold">{item.title || "Untitled"}</span>
                        <span className="block truncate text-[13px] text-ink-muted">{why}</span>
                      </span>
                      <Avatar member={member(item.ownerId)} size={24} />
                      <ArrowRight size={16} className="mr-1 shrink-0 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-navy" />
                    </button>
                  </li>
                ))}
                {myTasks.map((t) => (
                  <li key={t.id} className="border-b border-line">
                    <Link to={`/growth#${t.day}`} className="group flex w-full items-center gap-4 py-3.5 text-left transition hover:bg-paper">
                      <LeverChip lever={t.lever} className="w-[96px] justify-start" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-semibold">{t.title}</span>
                        <span className="block truncate text-[13px] text-ink-muted">Your growth work for {dayShort(t.day)}</span>
                      </span>
                      <ArrowRight size={16} className="mr-1 shrink-0 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-navy" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* the week, day by day */}
          <section>
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-[20px] font-extrabold tracking-[-0.02em]">The week, day by day</h2>
                <p className="mt-1 text-[14px] text-ink-muted">What goes out each day, and the growth work around it.</p>
              </div>
              <Link to="/growth" className="hidden shrink-0 items-center gap-1 text-[13.5px] font-semibold text-sky-ink hover:underline sm:flex">
                Open the week in Growth <ArrowRight size={14} />
              </Link>
            </div>
            <ol className="mt-4 border-t border-line">
              {days.map((d) => (
                <DayRow key={d} day={d} today={today} cards={cardsOn(items, d)} extra={postsOn(posts, items, d).length} tasks={weekTasks.filter((t) => t.day === d)} events={(brief?.dates ?? []).filter((x) => x.date === d).map((x) => x.label)} />
              ))}
            </ol>
          </section>
        </div>

        {/* side column */}
        <aside className="space-y-10">
          <section className="rounded-xl border border-line p-5">
            <h2 className="section-title">This week's goal, so far</h2>
            <ul className="mt-4 space-y-4">
              {meters.map((m) => (
                <li key={m.label}>
                  <p className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="text-ink-muted">{m.label}</span>
                    <span className="font-bold tabular-nums">
                      {m.n} <span className="font-semibold text-ink-faint">of {m.of}</span>
                    </span>
                  </p>
                  <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-paper">
                    <span className={cx("block h-full rounded-full", m.n >= m.of ? "bg-sky" : "bg-navy")} style={{ width: `${Math.min(100, (m.n / m.of) * 100)}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {stats && (
            <section>
              <div className="flex items-baseline justify-between">
                <h2 className="section-title">Last week</h2>
                <Link to="/growth?tab=results" className="text-[12.5px] font-semibold text-sky-ink hover:underline">
                  Results
                </Link>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-line pt-4">
                {[
                  { label: "People reached", n: stats.social.totals.reach, c: stats.social.change.reach },
                  { label: "Times seen", n: stats.social.totals.impressions, c: stats.social.change.impressions },
                  { label: "New followers", n: stats.social.totals.followers },
                  { label: "Comments", n: stats.social.totals.comments },
                ].map((k) => (
                  <div key={k.label}>
                    <dt className="text-[12px] font-medium text-ink-muted">{k.label}</dt>
                    <dd className="mt-0.5 text-[22px] font-extrabold leading-none tracking-[-0.02em] tabular-nums">
                      {num(k.n)}
                      {k.c !== undefined && <span className="ml-1.5 text-[12px] font-bold text-sky-ink">{k.c >= 0 ? "up" : "down"} {Math.abs(Math.round(k.c))}%</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {brief?.formats.length ? (
            <section>
              <h2 className="section-title">What to lean into</h2>
              <ul className="mt-3 space-y-3.5">
                {brief.formats.map((f) => (
                  <li key={f.title} className="border-l-2 border-sun pl-3">
                    <p className="text-[13.5px] font-bold">{f.title}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-ink-muted">{f.body}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </>
  );
}

function DayRow({ day, today, cards, extra, tasks, events }: { day: string; today: string; cards: Item[]; extra: number; tasks: Task[]; events: string[] }) {
  const { open } = useHub();
  const near = nearDay(day, today);
  const done = tasks.filter((t) => t.done).length;
  return (
    <li id={`home-${day}`} className={cx("grid gap-x-5 gap-y-2 border-b border-line py-4 sm:grid-cols-[118px_minmax(0,1fr)_128px]", day < today && "opacity-60")}>
      <div>
        <p className="text-[14.5px] font-extrabold tracking-[-0.01em]">{dayShort(day)}</p>
        {near && <p className="text-[12px] font-bold text-orange-ink">{near}</p>}
        {events.map((e) => (
          <p key={e} className="mt-1 text-[12px] font-semibold leading-snug text-sky-ink">
            {e}
          </p>
        ))}
      </div>
      <ul className="min-w-0 space-y-1.5">
        {cards.length === 0 && extra === 0 && <li className="text-[13.5px] text-ink-faint">Nothing planned yet</li>}
        {cards.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => open(c.id)} className="group flex w-full items-center gap-3 rounded-lg px-2 py-1 text-left -mx-2 transition hover:bg-paper">
              <span className={cx("h-6 w-[3px] shrink-0 rounded-full", stageMeta(c.stage).bar)} title={stageMeta(c.stage).label} />
              <span className="w-[62px] shrink-0 whitespace-nowrap text-[12.5px] font-semibold tabular-nums text-ink-muted">{prTime(c.publishAt)}</span>
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{c.title}</span>
              <span className="hidden shrink-0 xl:inline">
                <FormatBadge format={c.format} />
              </span>
              <span className="shrink-0 text-[12px] font-semibold text-ink-faint">{stageMeta(c.stage).label}</span>
            </button>
          </li>
        ))}
        {extra > 0 && (
          <li className="flex items-center gap-2 text-[13px] text-ink-muted">
            <Send size={14} className="text-ink-faint" /> {extra} more {extra === 1 ? "post" : "posts"} in HighLevel
          </li>
        )}
      </ul>
      <Link to={`/growth#${day}`} className="flex items-center gap-2 self-start text-[13px] text-ink-muted hover:text-navy sm:justify-end">
        {tasks.length > 0 ? (
          <>
            {done === tasks.length ? <Check size={14} className="text-sky-ink" /> : null}
            <span>
              <span className="font-bold tabular-nums text-ink">{done}</span> of {tasks.length} growth tasks
            </span>
          </>
        ) : (
          <span className="text-ink-faint">No growth tasks</span>
        )}
      </Link>
    </li>
  );
}
