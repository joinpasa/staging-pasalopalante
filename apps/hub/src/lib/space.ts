// The community space: where partner organisations and ambassadors meet each other.
// Preview only for now. Everything lives in this browser, nothing is sent anywhere, and
// nobody signs in: the "Viewing as" menu stands in for the partner portal's login.

import { useSyncExternalStore } from "react";

export type Lang = "en" | "es";

/** A short note from the Kindness Forward team to every partner. */
export interface Notice {
  id: string;
  at: string;
  titleEn: string;
  titleEs: string;
  bodyEn: string;
  bodyEs: string;
  pinned?: boolean;
  image?: string;
}

/** Something a partner shares with the others. Waits for the team's yes before anyone else sees it. */
export interface WallPost {
  id: string;
  at: string;
  org: string;
  kind: string;
  text: string;
  image?: string;
  /** the sender ticked that the people shown agreed to be shared */
  consent: boolean;
  status: "waiting" | "live" | "declined";
  kudos: number;
  /** who has left a kudos, so nobody counts twice */
  kudosBy: string[];
  /** set once the team has saved it to the story bank */
  storyId?: string;
}

/** "We need" or "we can offer". The team makes the introduction, so no contact details are shown. */
export interface BoardEntry {
  id: string;
  at: string;
  org: string;
  side: "need" | "offer";
  text: string;
  /** partners who said they can help, or would like it */
  hands: string[];
  introduced?: boolean;
}

export interface SpaceDate {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  label: string;
  /** left out for the Kindness Forward calendar itself */
  org?: string;
  note?: string;
}

/** One partner asking the team to introduce them to another. */
export interface Hello {
  id: string;
  at: string;
  from: string;
  to: string;
  done?: boolean;
}

export interface Challenge {
  titleEn: string;
  titleEs: string;
  bodyEn: string;
  bodyEs: string;
  goal: number;
  done: number;
  /** YYYY-MM-DD */
  ends: string;
  joined: string[];
}

export interface SpaceState {
  /** the organisation the preview is being viewed as */
  me: string;
  notices: Notice[];
  wall: WallPost[];
  board: BoardEntry[];
  dates: SpaceDate[];
  hellos: Hello[];
  challenge: Challenge;
}

const KEY = "kindness-hub-space-v2";
export const AMBASSADOR = "An ambassador";

const SEED: SpaceState = {
  me: "",
  notices: [
    {
      id: "n1",
      at: "2026-11-16T12:00:00Z",
      pinned: true,
      titleEn: "Friday is World Children's Day: wear blue",
      titleEs: "El viernes es el Día Mundial de la Infancia: vístete de azul",
      bodyEn: "On Friday 20 November, wear something blue, share the ten kindness ideas for children from this week's kit, and tag us so we can share what your team did.",
      bodyEs: "El viernes 20 de noviembre, ponte algo azul, comparte las diez ideas de bondad para niños del kit de esta semana y etiquétanos para compartir lo que hizo tu equipo.",
    },
    {
      id: "n2",
      at: "2026-11-12T15:00:00Z",
      titleEn: "The Global Kindness Season runs to 31 January",
      titleEs: "La Global Kindness Season sigue hasta el 31 de enero",
      bodyEn: "Every act your team logs in the partner portal between now and then is part of the season. If you would like a hand getting started, write it under Asks and offers and another partner may already have the answer.",
      bodyEs: "Cada acto que tu equipo registre en el portal de aliados hasta esa fecha forma parte de la temporada. Si necesitas ayuda para empezar, escríbelo en Pedidos y ofertas; puede que otro aliado ya tenga la respuesta.",
    },
    {
      id: "n3",
      at: "2026-11-10T14:00:00Z",
      titleEn: "New here? Three good first steps",
      titleEs: "¿Llegaste hace poco? Tres primeros pasos",
      bodyEn: "Say hello on the wall, pick up this week's kit, and add your next event under Dates so we can plan a mention in time.",
      bodyEs: "Saluda en el muro, recoge el kit de esta semana y añade tu próximo evento en Fechas para que podamos mencionarlo a tiempo.",
    },
  ],
  // empty until partners post: nothing here is made up
  wall: [],
  board: [],
  dates: [
    { id: "d1", date: "2026-11-16", label: "International Day for Tolerance" },
    { id: "d2", date: "2026-11-20", label: "World Children's Day", note: "Wear blue. A good day for schools and youth partners" },
    { id: "d3", date: "2026-11-21", label: "World Hello Day" },
    { id: "d4", date: "2026-12-01", label: "GivingTuesday" },
    { id: "d5", date: "2026-12-05", label: "International Volunteer Day" },
    { id: "d7", date: "2027-01-31", label: "Global Kindness Season ends" },
  ],
  hellos: [],
  challenge: {
    titleEn: "One act with another partner before 31 January",
    titleEs: "Un acto junto a otro aliado antes del 31 de enero",
    bodyEn: "Find one partner here and do one act of kindness together: a school with a business, a municipality with a nonprofit. Log it in the partner portal and tell the story on the wall.",
    bodyEs: "Busca aquí a otro aliado y hagan juntos un acto de bondad: una escuela con un negocio, un municipio con una organización. Regístrenlo en el portal de aliados y cuenten la historia en el muro.",
    goal: 50,
    done: 0,
    ends: "2027-01-31",
    joined: [],
  },
};

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function load(): SpaceState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...clone(SEED), ...(JSON.parse(raw) as SpaceState) };
  } catch {
    // unreadable or blocked storage: start fresh
  }
  return clone(SEED);
}

let state = load();
const listeners = new Set<() => void>();
const tell = () => listeners.forEach((l) => l());

// The team's tab and the partner's page are often open side by side in two browser tabs.
// A change in one shows up in the other without a reload.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    state = load();
    tell();
  });
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useSpace(): SpaceState {
  return useSyncExternalStore(subscribe, () => state);
}

/** Change the space, keep it in this browser, and refresh every screen showing it. */
export function changeSpace(fn: (draft: SpaceState) => void) {
  const next = clone(state);
  fn(next);
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // a photo too large for the browser's storage: the change still shows until the page is reloaded
  }
  tell();
}

export function resetSpace() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing stored
  }
  state = clone(SEED);
  tell();
}

/** One introduction for the team to make: a raised hand on an ask or an offer, or a "please introduce us". */
export interface Intro {
  key: string;
  at: string;
  a: string;
  b: string;
  line: string;
  done: boolean;
  mark: () => void;
}

export function introductions(space: SpaceState): Intro[] {
  return [
    ...space.board.flatMap((b) =>
      b.hands.map((h) => ({
        key: `${b.id}:${h}`,
        at: b.at,
        a: h,
        b: b.org,
        line: b.side === "need" ? `${h} can help with what ${b.org} asked for: "${b.text}"` : `${h} would like what ${b.org} offered: "${b.text}"`,
        done: !!b.introduced,
        mark: () => changeSpace((s) => void (s.board.find((x) => x.id === b.id)!.introduced = true)),
      })),
    ),
    ...space.hellos.map((h) => ({ key: h.id, at: h.at, a: h.from, b: h.to, line: `${h.from} asked to be introduced to ${h.to}.`, done: !!h.done, mark: () => changeSpace((s) => void (s.hellos.find((x) => x.id === h.id)!.done = true)) })),
  ];
}

/** Wall posts and introductions waiting on the team. */
export const spaceWaiting = (space: SpaceState) => space.wall.filter((p) => p.status === "waiting").length + introductions(space).filter((i) => !i.done).length;

export const spaceId = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

/** A photo small enough to keep in the browser: longest side 1000px. */
export async function shrinkPhoto(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1000 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.8);
}

export const spaceDay = (iso: string, lang: Lang) => new Intl.DateTimeFormat(lang === "es" ? "es-PR" : "en-US", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso));

export function daysUntil(date: string, today = new Date()): number {
  const a = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((Date.parse(`${date}T00:00:00Z`) - a) / 86_400_000);
}
