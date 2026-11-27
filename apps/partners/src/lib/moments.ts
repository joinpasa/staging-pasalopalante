import type { Lang } from "./i18n";

/**
 * The season's moments, as told in the company deck and the partner kit (Puerto Rico time).
 * The one-line ideas are suggestions for what members can do that day, not descriptions of the
 * moment itself, whose details are still being confirmed (27 Nov 2026).
 */
export interface Moment {
  date: string; // YYYY-MM-DD
  en: string;
  es: string;
  ideaEn?: string;
  ideaEs?: string;
}

export const MOMENTS: Moment[] = [
  { date: "2026-11-01", en: "The season opens", es: "Empieza la temporada" },
  { date: "2026-11-11", en: "First global wave", es: "Primera ola global" },
  {
    date: "2026-12-21",
    en: "Second global moment",
    es: "Segundo momento global",
    ideaEn: "Share what your kindness has added up to so far, and bring one more person in.",
    ideaEs: "Comparte lo que ha sumado tu bondad hasta ahora y suma a una persona más.",
  },
  {
    date: "2027-01-27",
    en: "Youth and education moment",
    es: "Momento de la juventud y la educación",
    ideaEn: "A day for schools, classes and youth groups to take part together.",
    ideaEs: "Un día para que escuelas, clases y grupos juveniles participen juntos.",
  },
  {
    date: "2027-01-31",
    en: "The season closes",
    es: "Cierra la temporada",
    ideaEn: "Log your last acts and celebrate what you did together.",
    ideaEs: "Registra tus últimos actos y celebra lo que lograron juntos.",
  },
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
