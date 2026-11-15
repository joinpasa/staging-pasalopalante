import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, Copy, ExternalLink, Plus, Trash2 } from "lucide-react";
import { Avatar, cx, EmbedCtx, FormatBadge, LeverChip, PageHead, PauseMark, Segmented } from "@/components/bits";
import { useAct, useBriefs, useHub, useItems, useMe, useMembers, useStats, useTasks } from "@/lib/hub";
import { LEVER_ORDER, LEVERS } from "@/lib/levers";
import { stageMeta } from "@/lib/stages";
import { longDate, prTime } from "@/lib/time";
import type { Lever, Member, Task } from "@/lib/types";
import { addDays, briefFor, cardsOn, dayShort, nearDay, planWeek, todayKey, weekDays } from "@/lib/week";
import ResultsPage, { readings } from "./ResultsPage";

/** Growth: the work that grows reach besides posting, planned by day, and what the week did. */
export default function GrowthPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "results" ? "results" : "week";
  const setTab = (t: "week" | "results") =>
    setParams((p) => {
      const next = new URLSearchParams(p);
      if (t === "week") next.delete("tab");
      else next.set("tab", t);
      return next;
    });

  return (
    <>
      <PageHead
        title="Growth"
        sub="Posting is half of it. The other half is replying, joining trends, partners, collabs, email and the website. Plan it by day, tick it off, and see what the week did."
        actions={
          <Segmented
            value={tab}
            onChange={setTab}
            options={
              [
                ["week", "This week's plan"],
                ["results", "Results"],
              ] as const
            }
          />
        }
      />
      {tab === "week" ? (
        <WeekPlan />
      ) : (
        <EmbedCtx.Provider value={true}>
          <ResultsPage />
        </EmbedCtx.Provider>
      )}
    </>
  );
}

function WeekPlan() {
  const act = useAct();
  const { hash } = useLocation();
  const { data: briefs = [] } = useBriefs();
  const { data: tasks = [] } = useTasks();
  const { data: items = [] } = useItems();
  const { data: members = [] } = useMembers();
  const { data: stats } = useStats();
  const { data: me } = useMe();
  const today = todayKey();
  const [week, setWeek] = useState(() => planWeek(briefs, today));
  const [who, setWho] = useState<"all" | "mine">("all");
  const [lever, setLever] = useState<Lever | "all">("all");

  // the brief arrives after the first render; land on its week once it does
  useEffect(() => setWeek(planWeek(briefs, today)), [briefs.length]); // eslint-disable-line react-hooks/exhaustive-deps
  // a link from Home to a day scrolls to it
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash, tasks.length]);

  const brief = briefFor(briefs, week);
  const days = weekDays(week);
  const all = tasks.filter((t) => t.weekStart === week);
  const shown = all.filter((t) => (who === "all" || t.ownerId === me?.id) && (lever === "all" || t.lever === lever));
  const done = all.filter((t) => t.done).length;
  const notes = useMemo(() => (stats ? readings(stats.social).slice(0, 4) : []), [stats]);
  const lastWeek = tasks.filter((t) => t.weekStart === addDays(week, -7));

  const copyLastWeek = () =>
    act(async (s) => {
      for (const t of lastWeek) await s.addTask({ title: t.title, detail: t.detail, lever: t.lever, ownerId: t.ownerId, day: addDays(t.day, 7) });
    }, `${lastWeek.length} tasks copied from last week`);

  return (
    <>
      {/* the week and how far along it is */}
      <section className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="rounded-xl border border-line p-5">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-ghost w-9 px-0" onClick={() => setWeek(addDays(week, -7))} aria-label="The week before">
              <ChevronLeft size={17} />
            </button>
            <p className="min-w-[200px] text-center text-[15px] font-bold">
              <PauseMark className="mr-2 h-3.5 align-[-1px]" />
              Week of {longDate(week)}
            </p>
            <button type="button" className="btn-ghost w-9 px-0" onClick={() => setWeek(addDays(week, 7))} aria-label="The week after">
              <ChevronRight size={17} />
            </button>
            <p className="ml-auto text-[14px] text-ink-muted">
              <span className="text-[26px] font-extrabold tabular-nums text-ink">{done}</span> of {all.length} done
            </p>
          </div>
          {brief?.goal && <p className="mt-4 border-l-[3px] border-sun pl-3 text-[15px] font-semibold leading-snug">{brief.goal}</p>}
          {/* one bar, coloured by lever, filled as tasks are done */}
          {all.length > 0 && (
            <div className="mt-5 flex h-3 gap-[2px] overflow-hidden rounded-full bg-paper" role="img" aria-label={`${done} of ${all.length} growth tasks done`}>
              {LEVER_ORDER.flatMap((l) => all.filter((t) => t.lever === l)).map((t) => (
                <span key={t.id} className={cx("flex-1 transition", t.done ? LEVERS[t.lever].dot : "bg-line")} title={`${t.title}${t.done ? ", done" : ""}`} />
              ))}
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Segmented
              value={who}
              onChange={setWho}
              options={
                [
                  ["all", "Everyone"],
                  ["mine", "Mine"],
                ] as const
              }
            />
            <button type="button" onClick={() => setLever("all")} className={cx("h-[30px] rounded-lg border px-2.5 text-[12.5px] font-semibold transition", lever === "all" ? "border-navy bg-navy text-white" : "border-line text-ink-muted hover:text-navy")}>
              Every kind
            </button>
            {LEVER_ORDER.filter((l) => all.some((t) => t.lever === l)).map((l) => {
              const n = all.filter((t) => t.lever === l);
              return (
                <button key={l} type="button" onClick={() => setLever(lever === l ? "all" : l)} title={LEVERS[l].why} className={cx("flex h-[30px] items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] font-semibold transition", lever === l ? "border-navy bg-navy text-white" : "border-line text-ink-muted hover:text-navy")}>
                  <span className={cx("h-2 w-2 rounded-full", LEVERS[l].dot)} />
                  {LEVERS[l].label}
                  <span className="tabular-nums opacity-70">
                    {n.filter((t) => t.done).length}/{n.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl bg-paper p-5">
          <h2 className="section-title">Why these, this week</h2>
          <p className="mt-1 text-[12.5px] text-ink-faint">Read from last week's results in HighLevel.</p>
          <ul className="mt-3 space-y-3">
            {notes.map((n) => (
              <li key={n} className="border-l-2 border-sky pl-3 text-[13px] leading-relaxed text-ink-muted">
                {n}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {all.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-line px-6 py-10 text-center">
          <p className="text-[15px] font-bold">No growth work planned for this week yet</p>
          <p className="mx-auto mt-1 max-w-md text-[14px] text-ink-muted">Add tasks to each day below, or start from last week's plan and adjust it.</p>
          {lastWeek.length > 0 && (
            <button type="button" className="btn-primary mt-5" onClick={() => void copyLastWeek()}>
              <Copy size={15} /> Copy last week's {lastWeek.length} tasks
            </button>
          )}
        </div>
      )}

      {/* the week, day by day: what goes out, and the work that helps it travel */}
      <ol className="mt-8 border-t border-line">
        {days.map((d) => (
          <DayPlan key={d} day={d} today={today} tasks={shown.filter((t) => t.day === d)} members={members} me={me} events={(brief?.dates ?? []).filter((x) => x.date === d).map((x) => x.label)} cards={cardsOn(items, d)} />
        ))}
      </ol>

      {/* what each kind of work is for */}
      <section className="mt-12">
        <h2 className="text-[18px] font-extrabold tracking-[-0.02em]">What each kind of work does</h2>
        <ul className="mt-4 grid gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          {LEVER_ORDER.map((l) => (
            <li key={l}>
              <LeverChip lever={l} />
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">{LEVERS[l].why}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function DayPlan({ day, today, tasks, members, me, events, cards }: { day: string; today: string; tasks: Task[]; members: Member[]; me?: Member; events: string[]; cards: ReturnType<typeof cardsOn> }) {
  const { open } = useHub();
  const act = useAct();
  const near = nearDay(day, today);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [lever, setLever] = useState<Lever>("engage");
  const [owner, setOwner] = useState(me?.id ?? "");

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const t = await act((s) => s.addTask({ title: title.trim(), lever, day, ownerId: owner || undefined }), "Added to the day");
    if (t) {
      setTitle("");
      setAdding(false);
    }
  };

  return (
    <li id={day} className={cx("grid scroll-mt-20 gap-x-8 gap-y-4 border-b border-line py-6 lg:grid-cols-[150px_minmax(0,5fr)_minmax(0,7fr)]", near === "Today" && "bg-sun-soft/40 -mx-5 px-5 md:-mx-10 md:px-10")}>
      <div>
        <p className="text-[17px] font-extrabold tracking-[-0.015em]">{dayShort(day)}</p>
        {near && <p className="text-[12.5px] font-bold text-orange-ink">{near}</p>}
        {events.map((e) => (
          <p key={e} className="mt-1.5 inline-block rounded-md bg-sky-soft px-2 py-0.5 text-[12px] font-bold leading-snug text-sky-ink">
            {e}
          </p>
        ))}
      </div>

      <div className="min-w-0">
        <p className="eyebrow mb-2">Going out</p>
        {cards.length === 0 ? (
          <p className="text-[13.5px] text-ink-faint">Nothing planned to go out</p>
        ) : (
          <ul className="space-y-2">
            {cards.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => open(c.id)} className="group flex w-full items-start gap-3 rounded-lg border border-line px-3 py-2.5 text-left transition hover:border-navy/25 hover:bg-paper">
                  <span className={cx("mt-0.5 h-9 w-[3px] shrink-0 rounded-full", stageMeta(c.stage).bar)} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold leading-snug">{c.title}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[12.5px] text-ink-muted">
                      <span className="tabular-nums">{prTime(c.publishAt)}</span>
                      <FormatBadge format={c.format} />
                      <span className="font-semibold">{stageMeta(c.stage).label}</span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="min-w-0">
        <p className="eyebrow mb-2">Growth work</p>
        {tasks.length === 0 && !adding && <p className="text-[13.5px] text-ink-faint">Nothing planned</p>}
        <ul className="space-y-1.5">
          {tasks.map((t) => (
            <TaskRow key={t.id} t={t} members={members} />
          ))}
        </ul>
        {adding ? (
          <form onSubmit={add} className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-line p-2">
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing" aria-label="What needs doing" className="field h-9 min-w-[200px] flex-1 py-1" />
            <select value={lever} onChange={(e) => setLever(e.target.value as Lever)} aria-label="Kind of work" className="field h-9 w-auto py-1 pr-7">
              {LEVER_ORDER.map((l) => (
                <option key={l} value={l}>
                  {LEVERS[l].label}
                </option>
              ))}
            </select>
            <select value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="Who does it" className="field h-9 w-auto py-1 pr-7">
              <option value="">Nobody yet</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <button type="submit" className="btn-primary h-9" disabled={!title.trim()}>
              Add
            </button>
            <button type="button" className="btn-quiet h-9" onClick={() => setAdding(false)}>
              Cancel
            </button>
          </form>
        ) : (
          <button type="button" className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-sky-ink hover:underline" onClick={() => setAdding(true)}>
            <Plus size={14} /> Add growth work
          </button>
        )}
      </div>
    </li>
  );
}

function TaskRow({ t, members }: { t: Task; members: Member[] }) {
  const act = useAct();
  const [openRow, setOpenRow] = useState(false);
  const owner = members.find((m) => m.id === t.ownerId);
  return (
    <li className={cx("rounded-lg border transition", openRow ? "border-line bg-paper" : "border-transparent hover:border-line")}>
      <div className="flex items-start gap-3 px-2.5 py-2">
        <input
          type="checkbox"
          checked={t.done}
          onChange={(e) => void act((s) => s.saveTask(t.id, { done: e.target.checked }), e.target.checked ? "Done" : undefined)}
          aria-label={`${t.title}${t.done ? ", done" : ""}`}
          className="mt-[3px] h-[18px] w-[18px] shrink-0 cursor-pointer accent-[#0e234b]"
        />
        <button type="button" onClick={() => setOpenRow(!openRow)} className="min-w-0 flex-1 text-left" aria-expanded={openRow}>
          <span className={cx("block text-[14px] font-semibold leading-snug", t.done && "text-ink-faint line-through decoration-ink-faint/60")}>{t.title}</span>
          {!openRow && (
            <span className="mt-0.5 flex min-w-0 items-center gap-2 text-[12.5px] text-ink-muted">
              {t.steps?.length ? <span className="shrink-0 font-semibold text-sky-ink">{t.steps.length} steps</span> : null}
              {t.missing && <span className="shrink-0 font-semibold text-orange-ink">Something is missing</span>}
              {t.detail && <span className="truncate">{t.detail}</span>}
            </span>
          )}
        </button>
        <LeverChip lever={t.lever} className="hidden sm:inline-flex" />
        <Avatar member={owner} size={24} />
        <ChevronDown size={15} className={cx("mt-1 shrink-0 text-ink-faint transition", openRow && "rotate-180")} />
      </div>
      {openRow && (
        <div className="space-y-3 px-2.5 pb-3 pl-[42px]">
          {t.detail && <p className="text-[13.5px] leading-relaxed text-ink-muted">{t.detail}</p>}
          <TaskGuide t={t} />
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-muted">
              Who
              <select value={t.ownerId ?? ""} onChange={(e) => void act((s) => s.saveTask(t.id, { ownerId: e.target.value || undefined }))} className="field h-8 w-auto py-0 pr-7 text-[13px]">
                <option value="">Nobody yet</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-muted">
              Day
              <input type="date" value={t.day} onChange={(e) => e.target.value && void act((s) => s.saveTask(t.id, { day: e.target.value }), "Moved")} className="field h-8 w-auto py-0 text-[13px]" />
            </label>
            <button type="button" className="btn-quiet ml-auto h-8 text-[13px] text-ink-muted hover:text-rose-ink" onClick={() => void act((s) => s.deleteTask(t.id), "Removed")}>
              <Trash2 size={14} /> Remove
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

/** What exists, what does not, and the steps, so anyone can pick up a task without asking around. */
function TaskGuide({ t }: { t: Task }) {
  if (!t.have && !t.missing && !t.steps?.length) return null;
  return (
    <div className="space-y-3">
      {(t.have || t.missing) && (
        <div className={cx("grid gap-2", t.have && t.missing && "md:grid-cols-2")}>
          {t.have && (
            <div className="rounded-lg border-l-[3px] border-sky bg-white px-3 py-2">
              <p className="text-[12.5px] font-bold text-sky-ink">What we already have</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-ink">{t.have}</p>
            </div>
          )}
          {t.missing && (
            <div className="rounded-lg border-l-[3px] border-orange bg-white px-3 py-2">
              <p className="text-[12.5px] font-bold text-orange-ink">Not there yet</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-ink">{t.missing}</p>
            </div>
          )}
        </div>
      )}
      {t.steps?.length ? (
        <ol className="space-y-2">
          {t.steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-[1px] flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-navy text-[12px] font-bold text-white tabular-nums">{i + 1}</span>
              <span className="min-w-0 text-[13.5px] leading-relaxed text-ink">
                {s.text}
                {s.link && (
                  <>
                    {" "}
                    {s.link.startsWith("/") ? (
                      <Link to={s.link} className="whitespace-nowrap font-semibold text-sky-ink hover:underline">
                        {s.linkLabel ?? "Open"} <ArrowRight size={13} className="inline -mt-0.5" />
                      </Link>
                    ) : (
                      <a href={s.link} target="_blank" rel="noreferrer" className="whitespace-nowrap font-semibold text-sky-ink hover:underline">
                        {s.linkLabel ?? "Open"} <ExternalLink size={13} className="inline -mt-0.5" />
                      </a>
                    )}
                  </>
                )}
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
