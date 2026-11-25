import type { Lang } from "./i18n";

/** The season's moments, as told in the company deck and the partner kit (Puerto Rico time). */
export interface Moment {
  date: string; // YYYY-MM-DD
  en: string;
  es: string;
}

export const MOMENTS: Moment[] = [
  { date: "2026-11-01", en: "The season opens", es: "Empieza la temporada" },
  { date: "2026-11-11", en: "First global wave", es: "Primera ola global" },
  { date: "2026-12-21", en: "Second global moment", es: "Segundo momento global" },
  { date: "2027-01-27", en: "Youth and education moment", es: "Momento de la juventud y la educación" },
  { date: "2027-01-31", en: "The season closes", es: "Cierra la temporada" },
];

/** The next moment from today (or the last one once the season is over). */
export function nextMoment(now: Date = new Date()): Moment & { days: number } {
  const today = new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  const m = MOMENTS.find((x) => x.date >= today) ?? MOMENTS[MOMENTS.length - 1];
  const days = Math.max(0, Math.round((new Date(`${m.date}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 86_400_000));
  return { ...m, days };
}

export function momentLabel(m: Moment, lang: Lang) {
  return lang === "es" ? m.es : m.en;
}

export function formatDay(date: string, locale: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" }) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(locale, opts);
}
