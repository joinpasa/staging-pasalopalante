import type { Lang } from "./i18n";
import type { Kind } from "./kinds";
import { MOMENTS } from "./moments";

/**
 * The Events tab (27 Nov 2026): the season's own moments, events the team adds in the Kindness
 * Hub (partner_events), and international days worth planning for. Dates are calendar days, so
 * they're compared at noon to stay clear of time-zone edges.
 */

export interface PartnerEvent {
  id: string;
  title: string;
  title_es: string | null;
  details: string | null;
  details_es: string | null;
  starts_on: string;
  ends_on: string | null;
  time_text: string | null;
  place: string | null;
  country: string | null;
  url: string | null;
  audience: "all" | Kind;
}

export type CalendarKind = "season" | "team" | "day";

export interface CalendarItem {
  key: string;
  kind: CalendarKind;
  date: string; // YYYY-MM-DD
  end: string | null;
  days: number; // from today; negative once it's passed
  title: string;
  idea: string | null;
  time: string | null;
  place: string | null;
  url: string | null;
  nearYou: boolean;
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const todayIso = (now: Date) => iso(new Date(now.getFullYear(), now.getMonth(), now.getDate()));

export function daysFrom(date: string, now = new Date()) {
  return Math.round((new Date(`${date}T12:00:00`).getTime() - new Date(`${todayIso(now)}T12:00:00`).getTime()) / 86_400_000);
}

/** All five of the season's moments, past ones included (the page shows them as done). */
export function seasonMoments(lang: Lang, now = new Date()): CalendarItem[] {
  return MOMENTS.map((m) => ({
    key: `season-${m.date}`,
    kind: "season",
    date: m.date,
    end: null,
    days: daysFrom(m.date, now),
    title: lang === "es" ? m.es : m.en,
    idea: (lang === "es" ? m.ideaEs : m.ideaEn) ?? null,
    time: null,
    place: null,
    url: null,
    nearYou: false,
  }));
}

/** Events the team added, still on or ahead (an event that spans days stays until its last day). */
export function teamEvents(events: PartnerEvent[], lang: Lang, myCountry: string | null, now = new Date()): CalendarItem[] {
  return events
    .map((e) => ({
      key: `team-${e.id}`,
      kind: "team" as const,
      date: e.starts_on,
      end: e.ends_on && e.ends_on !== e.starts_on ? e.ends_on : null,
      days: daysFrom(e.starts_on, now),
      title: (lang === "es" && e.title_es) || e.title,
      idea: (lang === "es" && e.details_es) || e.details || null,
      time: e.time_text,
      place: e.place,
      url: e.url,
      nearYou: !!myCountry && !!e.country && e.country.trim().toLowerCase() === myCountry.trim().toLowerCase(),
    }))
    .filter((e) => daysFrom(e.end ?? e.date, now) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** International days worth planning for, each with one simple idea. Month and day only. */
const DAYS: { m: number; d: number; en: [string, string]; es: [string, string] }[] = [
  { m: 1, d: 6, en: ["Three Kings Day", "A gift for a child who might not get one."], es: ["Día de Reyes", "Un regalo para un niño o una niña que quizá no reciba uno."] },
  { m: 1, d: 24, en: ["International Day of Education", "Thank a teacher, or give school supplies."], es: ["Día Internacional de la Educación", "Agradece a un maestro o regala útiles escolares."] },
  { m: 2, d: 4, en: ["International Day of Human Fraternity", "Reach out to someone from a different background or faith."], es: ["Día Internacional de la Fraternidad Humana", "Acércate a alguien de otra cultura o fe."] },
  { m: 2, d: 17, en: ["Random Acts of Kindness Day", "Surprise someone you don't know."], es: ["Día de los Actos de Bondad al Azar", "Sorprende a alguien que no conoces."] },
  { m: 2, d: 20, en: ["World Day of Social Justice", "Support a group working for fairness where you live."], es: ["Día Mundial de la Justicia Social", "Apoya a un grupo que trabaja por la justicia donde vives."] },
  { m: 3, d: 8, en: ["International Women's Day", "Celebrate a woman who changed your life."], es: ["Día Internacional de la Mujer", "Celebra a una mujer que cambió tu vida."] },
  { m: 3, d: 20, en: ["International Day of Happiness", "Share what makes your community smile."], es: ["Día Internacional de la Felicidad", "Comparte lo que hace sonreír a tu comunidad."] },
  { m: 4, d: 7, en: ["World Health Day", "Thank a health worker."], es: ["Día Mundial de la Salud", "Agradece a un trabajador de la salud."] },
  { m: 4, d: 22, en: ["Earth Day", "Plant something, or clean up a green space."], es: ["Día de la Tierra", "Siembra algo o limpia un área verde."] },
  { m: 5, d: 15, en: ["International Day of Families", "Do something kind together as a family."], es: ["Día Internacional de las Familias", "Hagan algo amable juntos en familia."] },
  { m: 6, d: 5, en: ["World Environment Day", "A clean-up with your team or class."], es: ["Día Mundial del Medio Ambiente", "Una limpieza con tu equipo o tu clase."] },
  { m: 6, d: 20, en: ["World Refugee Day", "Welcome a family who is new to your area."], es: ["Día Mundial de los Refugiados", "Da la bienvenida a una familia nueva en tu zona."] },
  { m: 7, d: 18, en: ["Nelson Mandela International Day", "Give 67 minutes of service."], es: ["Día Internacional de Nelson Mandela", "Regala 67 minutos de servicio."] },
  { m: 7, d: 30, en: ["International Day of Friendship", "Thank an old friend."], es: ["Día Internacional de la Amistad", "Agradece a una amistad de siempre."] },
  { m: 8, d: 12, en: ["International Youth Day", "Give young people the stage."], es: ["Día Internacional de la Juventud", "Dale el escenario a los jóvenes."] },
  { m: 8, d: 19, en: ["World Humanitarian Day", "Honour the people who help in a crisis."], es: ["Día Mundial de la Asistencia Humanitaria", "Honra a quienes ayudan en una crisis."] },
  { m: 9, d: 5, en: ["International Day of Charity", "Give to a local cause."], es: ["Día Internacional de la Beneficencia", "Apoya una causa local."] },
  { m: 9, d: 21, en: ["International Day of Peace", "Mend a friendship, or bring two people together."], es: ["Día Internacional de la Paz", "Reconcíliate con alguien o une a dos personas."] },
  { m: 10, d: 1, en: ["International Day of Older Persons", "Spend time with an older neighbour."], es: ["Día Internacional de las Personas de Edad", "Comparte tiempo con un vecino mayor."] },
  { m: 10, d: 5, en: ["World Teachers' Day", "Thank a teacher by name."], es: ["Día Mundial de los Docentes", "Agradece a un maestro por su nombre."] },
  { m: 10, d: 10, en: ["World Mental Health Day", "Check in on someone, and on yourself."], es: ["Día Mundial de la Salud Mental", "Pregunta cómo está alguien, y cómo estás tú."] },
  { m: 10, d: 16, en: ["World Food Day", "A food drive for a local pantry."], es: ["Día Mundial de la Alimentación", "Una colecta de alimentos para un banco de comida local."] },
  { m: 11, d: 13, en: ["World Kindness Day", "Share your kindness and invite others to pledge."], es: ["Día Mundial de la Bondad", "Comparte tu bondad e invita a otros a comprometerse."] },
  { m: 11, d: 16, en: ["International Day for Tolerance", "Listen to someone who sees the world differently."], es: ["Día Internacional para la Tolerancia", "Escucha a alguien que ve el mundo de otra manera."] },
  { m: 11, d: 20, en: ["World Children's Day", "Ask children what kindness means to them."], es: ["Día Mundial de la Infancia", "Pregunta a los niños qué significa la bondad para ellos."] },
  { m: 12, d: 3, en: ["International Day of Persons with Disabilities", "Make a space or an event easier for everyone to join."], es: ["Día Internacional de las Personas con Discapacidad", "Haz que un espacio o un evento sea más fácil para que todos participen."] },
  { m: 12, d: 5, en: ["International Volunteer Day", "Thank your volunteers, or volunteer for a day."], es: ["Día Internacional de los Voluntarios", "Agradece a tus voluntarios, o sé voluntario por un día."] },
  { m: 12, d: 10, en: ["Human Rights Day", "Stand with someone who is treated unfairly."], es: ["Día de los Derechos Humanos", "Apoya a alguien que recibe un trato injusto."] },
  { m: 12, d: 20, en: ["International Human Solidarity Day", "Share with someone who has less this season."], es: ["Día Internacional de la Solidaridad Humana", "Comparte con alguien que tiene menos en esta temporada."] },
];

/** GivingTuesday: the Tuesday after the fourth Thursday of November. */
function givingTuesday(year: number) {
  const first = new Date(year, 10, 1);
  const firstThursday = 1 + ((4 - first.getDay() + 7) % 7);
  return new Date(year, 10, firstThursday + 21 + 5);
}

/** International days in the next year, soonest first. */
export function worldDays(lang: Lang, now = new Date()): CalendarItem[] {
  const out: CalendarItem[] = [];
  const day = (date: string, title: string, idea: string): CalendarItem => ({
    key: `day-${date}-${title}`,
    kind: "day",
    date,
    end: null,
    days: daysFrom(date, now),
    title,
    idea,
    time: null,
    place: null,
    url: null,
    nearYou: false,
  });
  for (const year of [now.getFullYear(), now.getFullYear() + 1]) {
    for (const x of DAYS) {
      const [title, idea] = lang === "es" ? x.es : x.en;
      out.push(day(iso(new Date(year, x.m - 1, x.d)), title, idea));
    }
    out.push(
      day(
        iso(givingTuesday(year)),
        "GivingTuesday",
        lang === "es" ? "Un día mundial para dar: tiempo, cosas o palabras amables." : "A global day of giving: time, things or kind words.",
      ),
    );
  }
  return out.filter((x) => x.days >= 0 && x.days <= 366).sort((a, b) => a.date.localeCompare(b.date));
}

// ---------- add to my calendar ----------

const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const icsDate = (date: string) => date.replace(/-/g, "");
const nextDay = (date: string) => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return iso(d);
};

/** One all-day event as an .ics file every calendar app opens. */
export function icsFor(item: CalendarItem, now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const description = [item.idea, item.time, item.url].filter(Boolean).join("\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kindness Forward//Partners Hub//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${item.key}@partners.passkindnessforward.com`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${icsDate(item.date)}`,
    `DTEND;VALUE=DATE:${icsDate(nextDay(item.end ?? item.date))}`,
    `SUMMARY:${icsText(item.title)}`,
    description ? `DESCRIPTION:${icsText(description)}` : "",
    item.place ? `LOCATION:${icsText(item.place)}` : "",
    item.url ? `URL:${item.url}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.join("\r\n");
}

export function downloadIcs(item: CalendarItem) {
  const blob = new Blob([icsFor(item)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${item.title.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").toLowerCase() || "event"}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
