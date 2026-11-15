// Checks a week's plan before it goes into the hub: the shape, the house wording, the owners, and
// that every growth task says what we have, what is missing and how to do it.
//
//   npx tsx tools/check-plan.mts plan.json
//
// Exits with 1 and lists each problem when something needs fixing; prints "Plan looks right" when not.

import fs from "node:fs";
import { checkCaption } from "../src/lib/checks";
import { LEVER_ORDER } from "../src/lib/levers";
import type { Brief, Item, Kit, Task } from "../src/lib/types";

type Plan = { cards?: Partial<Item>[]; tasks?: Partial<Task>[]; briefs?: Partial<Brief>[]; kit?: Partial<Kit>; videos?: unknown[] };

const file = process.argv[2];
if (!file) {
  console.error("Give the plan file: npx tsx tools/check-plan.mts plan.json");
  process.exit(2);
}
const plan = JSON.parse(fs.readFileSync(file, "utf8")) as Plan;
const problems: string[] = [];
const warn: string[] = [];
const say = (where: string, what: string) => problems.push(`${where}: ${what}`);

const OPEN = ["idea", "planning"];
const FORMATS = ["reel", "story", "carousel", "image", "video", "email"];
const OWNERS = ["m-simone", "m-mark", "m-dee", "m-edith", "m-rohini", "simone", "mark", "dee", "edith", "rohini"];
const PERSONAL = /[\w.+-]+@[\w-]+\.[\w.]+|\+?\d[\d\s().-]{8,}\d/;

function words(where: string, text: string | undefined, opts: { caption?: boolean } = {}) {
  if (!text?.trim()) return;
  for (const f of checkCaption(text, { needsHashtag: !!opts.caption })) {
    if (f.level === "block") say(where, f.title);
    else if (f.level === "warn") warn.push(`${where}: ${f.title}`);
  }
  // an email address or a phone number never goes into the plan; merge tags like {{business.email}} are fine
  const plain = text.replace(/\{\{[^}]+\}\}/g, "").replace(/https?:\/\/\S+/g, "");
  if (PERSONAL.test(plain)) say(where, "looks like it holds an email address or phone number");
}

const brief = plan.briefs?.[0];
if (!brief) say("brief", "missing");
const weekStart = brief?.weekStart ?? "";
if (brief) {
  const d = new Date(`${weekStart}T12:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.getUTCDay() !== 1) say("brief", `weekStart ${weekStart} is not a Monday`);
  for (const k of ["headline", "summary", "goal"] as const) if (!String(brief[k] ?? "").trim()) say("brief", `no ${k}`);
  for (const k of ["headline", "summary", "goal"] as const) words(`brief ${k}`, String(brief[k] ?? ""));
  for (const i of brief.ideas ?? []) words(`idea "${i.title}"`, `${i.title} ${i.why} ${i.hook ?? ""}`);
}
const inWeek = (iso?: string) => {
  if (!iso || !weekStart) return false;
  const start = new Date(`${weekStart}T04:00:00Z`).getTime();
  const t = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).getTime();
  return t >= start && t < start + 7 * 86_400_000;
};

const cardIds = new Set<string>();
for (const c of plan.cards ?? []) {
  const where = `card "${c.title ?? c.id}"`;
  if (c.id) cardIds.add(c.id);
  if (!c.title?.trim()) say(where, "no title");
  if (!OPEN.includes(String(c.stage))) say(where, `stage ${c.stage}: a new card starts in Idea or Planning`);
  if (!FORMATS.includes(String(c.format))) say(where, `format ${c.format} is not one the hub knows`);
  if (!c.ownerId || !OWNERS.includes(String(c.ownerId).toLowerCase())) say(where, "no owner from the team");
  if (!inWeek(c.publishAt)) say(where, "its time is not in the plan's week");
  if (c.format !== "email" && !(c.accountIds?.length)) say(where, "no accounts chosen");
  if (c.format === "email" && !c.subject?.trim()) say(where, "an email needs a subject");
  words(`${where} notes`, c.notes);
  words(`${where} English caption`, c.captionEn, { caption: c.format !== "email" && c.format !== "story" });
  words(`${where} Spanish caption`, c.captionEs, { caption: c.format !== "email" && c.format !== "story" });
}

const days = new Set<string>();
for (const t of plan.tasks ?? []) {
  const where = `task "${t.title ?? t.id}"`;
  if (!t.title?.trim()) say(where, "no title");
  if (!inWeek(t.day)) say(where, `day ${t.day} is not in the plan's week`);
  else days.add(String(t.day));
  if (!LEVER_ORDER.includes(t.lever as never)) say(where, `kind of work ${t.lever} is not one the hub knows`);
  if (!t.ownerId || !OWNERS.includes(String(t.ownerId).toLowerCase())) say(where, "no owner from the team");
  if (!t.have?.trim()) say(where, "does not say what we already have and where");
  if (!t.steps?.length) say(where, "has no steps");
  if (t.itemId && !cardIds.has(t.itemId)) say(where, `points at a card ${t.itemId} that is not in the plan`);
  words(`${where}`, [t.title, t.detail, t.have, t.missing, ...(t.steps ?? []).map((s) => s.text)].join("\n"));
}
if ((plan.tasks ?? []).length && days.size < 5) warn.push(`growth work is planned on only ${days.size} days`);
const cardDays = new Set((plan.cards ?? []).map((c) => (c.publishAt ? new Date(new Date(c.publishAt).getTime() - 4 * 3_600_000).toISOString().slice(0, 10) : "")));
if ((plan.cards ?? []).length && cardDays.size < 7) warn.push(`posts go out on ${cardDays.size} of 7 days`);
if (plan.kit) {
  if (!plan.kit.askEn?.trim() || !plan.kit.askEs?.trim()) say("kit", "the ask needs both English and Spanish");
  words("kit", `${plan.kit.askEn ?? ""}\n${plan.kit.askEs ?? ""}`);
}

for (const w of warn) console.log(`note  ${w}`);
if (problems.length) {
  for (const p of problems) console.log(`fix   ${p}`);
  console.log(`\n${problems.length} thing${problems.length === 1 ? "" : "s"} to fix before this goes into the hub.`);
  process.exit(1);
}
console.log(`Plan looks right: ${(plan.cards ?? []).length} cards, ${(plan.tasks ?? []).length} tasks, week of ${weekStart}.`);
