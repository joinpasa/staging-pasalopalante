/**
 * Static content for the Pásalo mobile app screens.
 *
 * The original beta was a prototype with no accounts and no server — every
 * number lived on the device. These values mirror that prototype exactly so
 * the rebuilt screens read the same. Swap this module for real queries when
 * the app screens are wired to the backend.
 */

export type ActKind = "did" | "saw";

export interface RecentAct {
  id: string;
  emoji: string;
  text: string;
  when: string;
  kind: ActKind;
}

export interface EarnedBadge {
  id: string;
  glyph: string;
  label: string;
  tone: "gold" | "teal" | "coral";
}

export interface WallPost {
  id: string;
  tag: "Help" | "Gift" | "Hug";
  initials: string;
  name: string;
  place: string;
  ago: string;
  text: string;
  carried: number;
}

export interface MapPin {
  id: string;
  label: string;
  count: number;
  /** Percentage offsets within the map canvas. */
  x: number;
  y: number;
  tone: "coral" | "teal";
}

export interface NearbyAct {
  id: string;
  emoji: string;
  title: string;
  meta: string;
  distance: string;
}

export interface Milestone {
  id: string;
  glyph: string;
  label: string;
  requirement: string;
  tone: "gold" | "teal" | "coral";
  earned: boolean;
}

export const appUser = {
  greeting: "Hola",
  firstName: "Marisol",
  chainNumber: 4912,
  place: "San Juan, PR",
  language: "EN",
  newCount: 12,
  actsPassedForward: 49,
  globalToday: 1842313,
  globalGoal: 1_000_000_000,
  rippleDepth: 6,
  dayStreak: 12,
  peoplePassedTo: 9,
  codeCarriedForward: 9,
};

export const recentActs: RecentAct[] = [
  { id: "a1", emoji: "☕", text: "Bought coffee for the person behind me", when: "Today · 8:12 AM", kind: "did" },
  { id: "a2", emoji: "🤗", text: "Sat with a neighbor after the storm", when: "Yesterday", kind: "did" },
  { id: "a3", emoji: "👋", text: "Saw a driver let a whole line merge", when: "2 days ago", kind: "saw" },
  { id: "a4", emoji: "🎁", text: "Left groceries at Doña Ana's door", when: "3 days ago", kind: "did" },
];

export const earnedBadges: EarnedBadge[] = [
  { id: "b1", glyph: "5", label: "Five Forward", tone: "gold" },
  { id: "b2", glyph: "7", label: "Week Streak", tone: "teal" },
  { id: "b3", glyph: "∞", label: "Chain Starter", tone: "coral" },
  { id: "b4", glyph: "25", label: "Twenty-Five", tone: "gold" },
  { id: "b5", glyph: "◎", label: "Ripple Maker", tone: "teal" },
];

export const wallPosts: WallPost[] = [
  {
    id: "w1",
    tag: "Help",
    initials: "DR",
    name: "Diego R.",
    place: "Ponce, PR",
    ago: "4m",
    text: "Changed a stranger's tire in the rain. He asked how to pay me back — I told him to pásalo pa'lante.",
    carried: 23,
  },
  {
    id: "w2",
    tag: "Gift",
    initials: "AK",
    name: "Amara K.",
    place: "Lagos, NG",
    ago: "26m",
    text: "Paid the bus fare for two students. Scanned their code so they can keep it moving.",
    carried: 8,
  },
  {
    id: "w3",
    tag: "Hug",
    initials: "LM",
    name: "Luis M.",
    place: "Chicago, IL",
    ago: "1h",
    text: "My barber had a rough week, so I just listened for twenty minutes.",
    carried: 41,
  },
];

export const wallFilters = ["Near me", "Worldwide", "My chain"] as const;

export const mapPins: MapPin[] = [
  { id: "p1", label: "Santurce", count: 48, x: 22, y: 27, tone: "coral" },
  { id: "p2", label: "Río Piedras", count: 31, x: 62, y: 39, tone: "coral" },
  { id: "p3", label: "Condado", count: 12, x: 38, y: 60, tone: "teal" },
  { id: "p4", label: "Carolina", count: 7, x: 76, y: 68, tone: "teal" },
  { id: "p5", label: "Ocean Park", count: 19, x: 30, y: 80, tone: "teal" },
];

export const nearbyActs: NearbyAct[] = [
  { id: "n1", emoji: "☕", title: "Coffee paid forward", meta: "Café Cuatro Sombras · 6 acts today", distance: "0.4 mi" },
  { id: "n2", emoji: "🤝", title: "Grocery run for a neighbor", meta: "Calle Loíza · 3 acts today", distance: "0.9 mi" },
  { id: "n3", emoji: "🌿", title: "Beach cleanup crew", meta: "Ocean Park · 18 acts today", distance: "1.6 mi" },
];

export const nextMilestone = { label: "Fifty Forward", current: 49, target: 50 };

export const milestones: Milestone[] = [
  { id: "m1", glyph: "1", label: "First Step", requirement: "1 act", tone: "gold", earned: true },
  { id: "m2", glyph: "5", label: "Five Forward", requirement: "5 acts", tone: "teal", earned: true },
  { id: "m3", glyph: "7", label: "Week Streak", requirement: "7 days", tone: "coral", earned: true },
  { id: "m4", glyph: "∞", label: "Chain Starter", requirement: "3 passes", tone: "gold", earned: true },
  { id: "m5", glyph: "25", label: "Twenty-Five", requirement: "25 acts", tone: "teal", earned: true },
  { id: "m6", glyph: "◎", label: "Ripple Maker", requirement: "depth 5", tone: "coral", earned: true },
  { id: "m7", glyph: "50", label: "Fifty Forward", requirement: "50 acts", tone: "gold", earned: false },
  { id: "m8", glyph: "⚑", label: "Ambassador", requirement: "10 passes", tone: "teal", earned: false },
  { id: "m9", glyph: "100", label: "Century", requirement: "100 acts", tone: "coral", earned: false },
];

const CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * Pass codes are single-use in the prototype: a fresh one is minted whenever
 * the My code tab opens, so a screenshot of an old code can never pass for you.
 */
export function mintPassCode(): string {
  const letters = Array.from(
    { length: 2 },
    () => CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)],
  ).join("");
  const digits = String(Math.floor(Math.random() * 9000) + 1000);
  return `${letters}-${digits}`;
}
