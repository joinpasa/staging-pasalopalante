import { mondayKey } from "./store";
import { prDateKey } from "./time";
import type { Brief, GhlPost, Item } from "./types";

export const todayKey = () => prDateKey(new Date().toISOString());

export function addDays(key: string, n: number): string {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** The seven days of a week, Monday first. */
export const weekDays = (weekStart: string) => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

/**
 * The week the team is working on: this week, or on a Sunday with nothing planned for it yet,
 * the week that starts tomorrow.
 */
export function planWeek(briefs: Brief[], today = todayKey()): string {
  const monday = mondayKey(today);
  if (briefs.some((b) => b.weekStart === monday)) return monday;
  const next = briefs.map((b) => b.weekStart).filter((w) => w > today && w <= addDays(today, 7)).sort()[0];
  return next ?? monday;
}

export const briefFor = (briefs: Brief[], week: string) => briefs.find((b) => b.weekStart === week);

/** "Today", "Tomorrow", or nothing. */
export function nearDay(key: string, today = todayKey()): string | undefined {
  if (key === today) return "Today";
  if (key === addDays(today, 1)) return "Tomorrow";
  return undefined;
}

export const dayName = (key: string) => new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(new Date(`${key}T12:00:00Z`));
export const dayShort = (key: string) => new Intl.DateTimeFormat("en-US", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${key}T12:00:00Z`));

/** Cards that go out on a day, in time order. */
export const cardsOn = (items: Item[], day: string) => items.filter((i) => i.publishAt && prDateKey(i.publishAt) === day).sort((a, b) => a.publishAt!.localeCompare(b.publishAt!));

/** Posts HighLevel has for a day that no card in the hub stands for. */
export const postsOn = (posts: GhlPost[], items: Item[], day: string) => {
  const linked = new Set(items.flatMap((i) => (i.ghlPostId ?? "").split(",").filter(Boolean)));
  return posts.filter((p) => p.at && prDateKey(p.at) === day && !linked.has(p.id) && p.status !== "draft");
};

/** A card counts as going out once it is approved; a post once HighLevel has it scheduled or published. */
export const goingOut = (i: Item) => ["approved", "scheduled", "posted"].includes(i.stage);
