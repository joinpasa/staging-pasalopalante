// Time, the way the team talks about it: Puerto Rico time first, your own time second.
// Puerto Rico is UTC-4 all year (no daylight saving), which keeps this simple and exact.

export const PR_TZ = "America/Puerto_Rico";
const PR_OFFSET = "-04:00";

/** "2026-11-11T08:11" typed as Puerto Rico time -> ISO in UTC. */
export function prInputToIso(local: string): string | undefined {
  if (!local) return undefined;
  const d = new Date(`${local.length === 16 ? local + ":00" : local}${PR_OFFSET}`);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** ISO in UTC -> "2026-11-11T08:11" in Puerto Rico time, for a datetime-local input. */
export function isoToPrInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pr = new Date(d.getTime() - 4 * 3600_000);
  return pr.toISOString().slice(0, 16);
}

// Times read the American way (11:11 AM); dates read day first (Wed 11 Nov), as the team writes them.
const fmt = (opts: Intl.DateTimeFormatOptions, tz?: string) => new Intl.DateTimeFormat(opts.hour ? "en-US" : "en-GB", { ...opts, timeZone: tz });

export function prTime(iso?: string): string {
  if (!iso) return "";
  return fmt({ hour: "numeric", minute: "2-digit" }, PR_TZ).format(new Date(iso));
}

export function prDay(iso?: string): string {
  if (!iso) return "";
  return fmt({ weekday: "short", day: "numeric", month: "short" }, PR_TZ).format(new Date(iso));
}

export function prDateTime(iso?: string): string {
  if (!iso) return "";
  return `${prDay(iso)}, ${prTime(iso)}`;
}

/** The same moment on the viewer's own clock, e.g. "Wed 11 Nov, 8:11 PM your time". */
export function localDateTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${fmt({ weekday: "short", day: "numeric", month: "short" }).format(d)}, ${fmt({ hour: "numeric", minute: "2-digit" }).format(d)}`;
}

/** YYYY-MM-DD of a moment, in Puerto Rico. */
export function prDateKey(iso: string): string {
  const d = new Date(new Date(iso).getTime() - 4 * 3600_000);
  return d.toISOString().slice(0, 10);
}

/** Hour of the day (0-23) in Puerto Rico. */
export function prHour(iso: string): number {
  return new Date(new Date(iso).getTime() - 4 * 3600_000).getUTCHours();
}

/** "3 hours before", "20 minutes after", "at the same time". */
export function relativeTo(iso: string, eventIso: string): { text: string; after: boolean } {
  const diffMin = Math.round((new Date(iso).getTime() - new Date(eventIso).getTime()) / 60000);
  const abs = Math.abs(diffMin);
  if (abs < 1) return { text: "at the same time as the event", after: false };
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const d = Math.floor(h / 24);
  let span: string;
  if (d >= 2) span = `${d} days`;
  else if (h >= 1) span = m && h < 6 ? `${h} h ${m} min` : `${h} hour${h === 1 ? "" : "s"}`;
  else span = `${m} minute${m === 1 ? "" : "s"}`;
  return { text: `${span} ${diffMin > 0 ? "after" : "before"} the event`, after: diffMin > 0 };
}

/** Monday of the week containing the date, as YYYY-MM-DD. */
export function mondayOf(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

export function longDate(key: string): string {
  return fmt({ day: "numeric", month: "long" }, "UTC").format(new Date(`${key}T12:00:00Z`));
}

export function shortDate(key: string): string {
  return fmt({ weekday: "short", day: "numeric", month: "short" }, "UTC").format(new Date(`${key}T12:00:00Z`));
}
