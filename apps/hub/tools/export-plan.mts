// Writes a plan ready for `node tools/hub.mjs import <file>`: a week's cards, growth tasks, brief
// and kit, plus the video gallery. The week comes from the preview's private plan
// (src/private/plan.json, never committed) unless another file is given.
//
//   npx tsx tools/export-plan.mts out.json [week.json]
//
// Cards that already went out are left out, and cards that were approved arrive in Review,
// because approval is given in the hub by a person.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SEED_VIDEOS } from "../src/lib/seed-videos";
import type { Brief, Item, Kit, Task } from "../src/lib/types";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] ?? "plan.json";
const source = process.argv[3] ?? path.join(here, "..", "src", "private", "plan.json");
if (!fs.existsSync(source)) {
  console.error(`No plan at ${source}. Give a week file: npx tsx tools/export-plan.mts out.json week.json`);
  process.exit(2);
}
const week = JSON.parse(fs.readFileSync(source, "utf8")) as { cards: Item[]; tasks: Task[]; briefs: Brief[]; kit: Kit };
const open = ["idea", "planning", "creating", "review"];

const plan = {
  cards: week.cards
    .filter((i) => i.stage !== "posted")
    .map(({ activity: _a, approvedBy: _b, approvedAt: _c, ghlPostId: _d, createdAt: _e, updatedAt: _f, ...i }) => ({ ...i, stage: open.includes(i.stage) ? i.stage : "review" })),
  tasks: week.tasks,
  briefs: week.briefs,
  kit: week.kit,
  videos: SEED_VIDEOS,
};

fs.writeFileSync(out, JSON.stringify(plan, null, 2));
console.log(`Wrote ${out}: ${plan.cards.length} cards, ${plan.tasks.length} tasks, ${plan.briefs.length} brief, ${plan.videos.length} videos.`);
