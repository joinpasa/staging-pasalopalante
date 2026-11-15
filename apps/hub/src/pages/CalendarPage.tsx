import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Mail } from "lucide-react";
import { cx, PageHead, PlatformDot } from "@/components/bits";
import { useAccounts, useEmails, useGhlPosts, useHub, useItems } from "@/lib/hub";
import { PLATFORMS, stageMeta } from "@/lib/stages";
import { prDateKey, prTime } from "@/lib/time";
import type { Platform } from "@/lib/types";

interface Entry {
  key: string;
  at: string;
  kind: "card" | "post" | "email";
  label: string;
  sub?: string;
  platform?: Platform;
  /** the stage colour, for cards */
  bar?: string;
  onClick?: () => void;
  done?: boolean;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const monthName = (y: number, m: number) => new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m, 1)));
const firstWords = (s: string, n = 6) => s.replace(/\s+/g, " ").trim().split(" ").slice(0, n).join(" ");
const shortTime = (iso: string) => prTime(iso).replace(":00", "").replace(" ", "").toLowerCase();

/** Everything with a date: cards being made, posts on the schedule, and emails. Shown in Puerto Rico time. */
export default function CalendarPage() {
  const { open, openPost } = useHub();
  const { data: items = [] } = useItems();
  const { data: posts = [] } = useGhlPosts();
  const { data: emails = [] } = useEmails();
  const { data: accounts = [] } = useAccounts();
  const today = prDateKey(new Date().toISOString());
  // open on the month that has something in it, which in the preview is November 2026
  const start = posts[0]?.at ? prDateKey(posts[0].at) : today;
  const [ym, setYm] = useState({ y: Number(start.slice(0, 4)), m: Number(start.slice(5, 7)) - 1 });
  const [show, setShow] = useState({ card: true, post: true, email: true });

  const entries = useMemo(() => {
    const out: Entry[] = [];
    const tracked = new Set(items.map((i) => i.ghlPostId).filter(Boolean));
    if (show.card)
      for (const i of items) {
        if (!i.publishAt) continue;
        const m = stageMeta(i.stage);
        out.push({ key: `c-${i.id}`, at: i.publishAt, kind: "card", label: i.title || "Untitled", sub: m.label, bar: m.bar, onClick: () => open(i.id), done: i.stage === "posted" });
      }
    if (show.post)
      for (const p of posts) {
        if (!p.at || tracked.has(p.id)) continue;
        const text = p.caption ? firstWords(p.caption) : p.type === "story" ? "Story" : "Post";
        out.push({ key: `p-${p.id}`, at: p.at, kind: "post", label: text, sub: `${p.type}, ${p.status}`, platform: (p.platform in PLATFORMS ? p.platform : accounts.find((a) => p.accountIds.includes(a.id))?.platform) as Platform, onClick: () => openPost(p.id), done: p.status === "published" });
      }
    if (show.email) for (const e of emails) out.push({ key: `e-${e.id}`, at: e.at, kind: "email", label: e.name, sub: e.status, done: e.status === "sent" });
    return out.sort((a, b) => a.at.localeCompare(b.at));
  }, [items, posts, emails, accounts, show, open, openPost]);

  const byDay = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of entries) {
      const k = prDateKey(e.at);
      map.set(k, [...(map.get(k) ?? []), e]);
    }
    return map;
  }, [entries]);

  // the weeks of this month, Monday first
  const first = new Date(Date.UTC(ym.y, ym.m, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(ym.y, ym.m + 1, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${ym.y}-${String(ym.m + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`)];
  while (cells.length % 7) cells.push(null);

  const step = (d: number) => setYm(({ y, m }) => ({ y: m + d < 0 ? y - 1 : m + d > 11 ? y + 1 : y, m: (m + d + 12) % 12 }));

  return (
    <>
      <PageHead
        title="Calendar"
        sub="Cards, scheduled posts and emails in one place. Every time is Puerto Rico time."
        actions={
          <div className="flex items-center gap-1">
            <button type="button" className="btn-ghost w-9 px-0" onClick={() => step(-1)} aria-label="Previous month">
              <ChevronLeft size={17} />
            </button>
            <span className="min-w-[148px] text-center text-[15px] font-bold">{monthName(ym.y, ym.m)}</span>
            <button type="button" className="btn-ghost w-9 px-0" onClick={() => step(1)} aria-label="Next month">
              <ChevronRight size={17} />
            </button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
        <span className="font-medium text-ink-faint">Show</span>
        {(
          [
            ["card", "Cards in the pipeline"],
            ["post", "Scheduled and published posts"],
            ["email", "Emails"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" role="checkbox" aria-checked={show[k]} onClick={() => setShow((s) => ({ ...s, [k]: !s[k] }))} className="inline-flex items-center gap-2 font-semibold text-ink">
            <span className={cx("inline-flex h-4 w-4 items-center justify-center rounded-[5px] border transition", show[k] ? "border-navy bg-navy text-white" : "border-line bg-white")}>{show[k] && <Check size={11} strokeWidth={3.4} />}</span>
            {label}
          </button>
        ))}
      </div>

      <div className="scroll-x overflow-x-auto">
        <div className="min-w-[880px] overflow-hidden rounded-xl border border-line">
          <div className="grid grid-cols-7 border-b border-line bg-paper">
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-3 py-2 text-[12.5px] font-semibold text-ink-muted">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((key, i) => {
              const list = key ? (byDay.get(key) ?? []) : [];
              return (
                <div key={i} className={cx("min-h-[124px] border-b border-r border-line px-1.5 pb-2 pt-1.5 [&:nth-child(7n)]:border-r-0 [&:nth-last-child(-n+7)]:border-b-0", !key && "bg-paper/60")}>
                  {key && (
                    <>
                      <p className={cx("mb-1 ml-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[12.5px] font-bold tabular-nums", key === today ? "bg-orange text-white" : "text-ink-muted")}>{Number(key.slice(8))}</p>
                      <ul>
                        {list.map((e) => (
                          <li key={e.key}>
                            <button
                              type="button"
                              onClick={e.onClick}
                              disabled={!e.onClick}
                              title={`${prTime(e.at)}  ${e.label}${e.sub ? `  (${e.sub})` : ""}`}
                              className={cx("flex w-full items-center gap-1.5 rounded-md px-1 py-[3px] text-left text-[11.5px] leading-tight", e.onClick && "cursor-pointer hover:bg-paper", e.done ? "text-ink-faint" : "text-ink")}
                            >
                              {e.kind === "card" && <span className={cx("h-3 w-[3px] shrink-0 rounded-full", e.bar)} />}
                              {e.kind === "email" && <Mail size={12} className="shrink-0 text-sun-ink" />}
                              {e.kind === "post" && (e.platform ? <PlatformDot platform={e.platform} size={13} /> : <span className="h-3 w-[3px] shrink-0 rounded-full bg-line" />)}
                              <span className="shrink-0 tabular-nums text-ink-faint">{shortTime(e.at)}</span>
                              <span className={cx("truncate", e.kind === "card" ? "font-semibold" : "font-medium")}>{e.label}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
