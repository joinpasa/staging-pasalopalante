/** Global Kindness Season — Puerto Rico time (UTC-4, no DST). */
export const SEASON_START = new Date("2026-11-01T00:00:00-04:00");
export const SEASON_END = new Date("2027-01-31T23:59:59-04:00");

export type SeasonPhase = "before" | "during" | "after";

export interface Countdown {
  phase: SeasonPhase;
  days: number;
  hours: number;
  minutes: number;
}

export function seasonCountdown(now: Date = new Date()): Countdown {
  const phase: SeasonPhase = now < SEASON_START ? "before" : now <= SEASON_END ? "during" : "after";
  const target = phase === "before" ? SEASON_START : SEASON_END;
  const ms = Math.max(0, target.getTime() - now.getTime());
  const totalMinutes = Math.floor(ms / 60_000);
  return {
    phase,
    days: Math.floor(totalMinutes / (60 * 24)),
    hours: Math.floor((totalMinutes % (60 * 24)) / 60),
    minutes: totalMinutes % 60,
  };
}

/** Today's date as YYYY-MM-DD in the viewer's own time zone (for <input type="date">). */
export function todayISO(now: Date = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}
