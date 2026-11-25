// The Kindness Hub's API, without the Deno and Supabase parts, so it can be tested on its own.
//
// It lets a trusted tool (Claude, a script, a spreadsheet) read and change the hub's own tables:
// cards, growth tasks, briefs, the kit, the story bank, videos and suggestions. It cannot post,
// schedule, email or message anyone, and it cannot approve anything: approval stays with a person.
// Every change it makes is written to hub_api_log, and on a card's own history.

export type Row = Record<string, unknown>;

export interface ListQuery {
  eq?: [string, unknown][];
  gte?: [string, string][];
  lt?: [string, string][];
  search?: [string[], string];
  order?: [string, boolean][];
  limit?: number;
}

/** What the API needs from the database. The edge function fills this in with supabase-js. */
export interface ApiStore {
  list(table: string, q: ListQuery): Promise<Row[]>;
  get(table: string, key: string, value: string): Promise<Row | null>;
  insert(table: string, row: Row): Promise<Row>;
  update(table: string, key: string, value: string, row: Row): Promise<Row | null>;
  remove(table: string, key: string, value: string): Promise<boolean>;
  log(entry: { actor: string; action: "create" | "update" | "delete" | "import"; resource: string; record_id: string | null; summary: string }): Promise<void>;
  /** A one-time link to put a file straight into the hub's private file store. */
  signedUpload(path: string, bucket?: string): Promise<{ uploadUrl: string }>;
}

export interface ApiRequest {
  method: string;
  /** the part of the address after /hub-api, for example "/tasks/123" */
  path: string;
  query: URLSearchParams;
  body: unknown;
  /** the key the caller sent */
  key: string | null;
  /** who is calling, for the log ("Claude for Simone") */
  actor: string;
}

export interface ApiResponse {
  status: number;
  body: unknown;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type FieldMap = Record<string, string>;

interface Resource {
  table: string;
  /** the column a record is found by */
  key: string;
  /** fields the API may write: API name -> column */
  write: FieldMap;
  /** extra fields it hands back but never writes */
  read: FieldMap;
  required: string[];
  /** how a list is narrowed to one week */
  week?: { column: string; kind: "date" | "timestamp" };
  order: [string, boolean][];
  search?: string[];
  readOnly?: boolean;
  noDelete?: boolean;
}

const COMMON_READ: FieldMap = { id: "id" };

export const RESOURCES: Record<string, Resource> = {
  cards: {
    table: "hub_items",
    key: "id",
    write: {
      title: "title",
      notes: "notes",
      stage: "stage",
      format: "format",
      ownerId: "owner_id",
      accountIds: "account_ids",
      publishAt: "publish_at",
      eventAt: "event_at",
      captionEn: "caption_en",
      captionEs: "caption_es",
      subject: "subject",
      design: "design",
      inKit: "in_kit",
      assets: "assets",
      needsChanges: "needs_changes",
      source: "source",
    },
    read: { ...COMMON_READ, approvedBy: "approved_by", approvedAt: "approved_at", ghlPostId: "ghl_post_id", activity: "activity", createdAt: "created_at", updatedAt: "updated_at" },
    required: ["title"],
    week: { column: "publish_at", kind: "timestamp" },
    order: [["publish_at", true]],
    search: ["title", "notes", "caption_en", "caption_es"],
  },
  tasks: {
    table: "hub_tasks",
    key: "id",
    write: {
      day: "day",
      title: "title",
      detail: "detail",
      lever: "lever",
      ownerId: "owner_id",
      itemId: "item_id",
      done: "done",
      have: "have",
      missing: "missing",
      steps: "steps",
    },
    read: { ...COMMON_READ, weekStart: "week_start", doneAt: "done_at", createdAt: "created_at", updatedAt: "updated_at" },
    required: ["title", "day"],
    week: { column: "week_start", kind: "date" },
    order: [["day", true], ["created_at", true]],
    search: ["title", "detail", "have", "missing"],
  },
  briefs: {
    table: "hub_briefs",
    key: "id",
    write: { weekStart: "week_start", headline: "headline", summary: "summary", goal: "goal", dates: "dates", formats: "formats", ideas: "ideas" },
    read: { ...COMMON_READ, updatedAt: "updated_at" },
    required: ["weekStart"],
    week: { column: "week_start", kind: "date" },
    order: [["week_start", false]],
  },
  kit: {
    table: "hub_kit",
    key: "week_start",
    write: { weekStart: "week_start", askEn: "ask_en", askEs: "ask_es" },
    read: { shares: "shares", updatedAt: "updated_at" },
    required: ["weekStart"],
    week: { column: "week_start", kind: "date" },
    order: [["week_start", false]],
    noDelete: true,
  },
  stories: {
    table: "hub_stories",
    key: "id",
    write: {
      kind: "kind",
      title: "title",
      url: "url",
      mime: "mime",
      words: "words",
      people: "people",
      source: "source",
      partner: "partner",
      country: "country",
      tags: "tags",
      consent: "consent",
      consentNote: "consent_note",
      minors: "minors",
      credit: "credit",
    },
    read: { ...COMMON_READ, addedAt: "added_at" },
    required: ["kind", "title"],
    order: [["added_at", false]],
    search: ["title", "words", "people", "source"],
  },
  videos: {
    table: "hub_videos",
    key: "id",
    write: {
      title: "title",
      url: "url",
      kind: "kind",
      group: "grp",
      rights: "rights",
      source: "source",
      date: "made_on",
      seconds: "seconds",
      orientation: "orientation",
      lang: "lang",
      poster: "poster",
      people: "people",
      notes: "notes",
      tags: "tags",
      itemIds: "item_ids",
    },
    read: { ...COMMON_READ, addedAt: "added_at", updatedAt: "updated_at" },
    required: ["title", "url"],
    order: [["added_at", false]],
    search: ["title", "source", "notes"],
  },
  suggestions: {
    table: "hub_suggestions",
    key: "id",
    write: { from: "from_name", text: "body", link: "link", status: "status", group: "grp", kind: "kind", consent: "consent", itemId: "item_id" },
    read: { ...COMMON_READ, at: "created_at" },
    required: ["text"],
    order: [["created_at", false]],
    search: ["body", "from_name"],
  },
  // Partners Hub (25 Nov 2026): the kit partners download, and the weekly update they read
  partnerKit: {
    table: "partner_kit_items",
    key: "id",
    write: {
      title: "title",
      titleEs: "title_es",
      description: "description",
      descriptionEs: "description_es",
      section: "section",
      audience: "audience",
      lang: "lang",
      filePath: "file_path",
      thumbPath: "thumb_path",
      url: "url",
      mime: "mime",
      sizeBytes: "size_bytes",
      width: "width",
      height: "height",
      caption: "caption",
      captionEs: "caption_es",
      sort: "sort",
      hidden: "hidden",
    },
    read: { ...COMMON_READ, addedAt: "added_at" },
    required: ["title"],
    order: [["sort", true], ["added_at", false]],
    search: ["title", "description"],
  },
  partnerUpdates: {
    table: "partner_updates",
    key: "id",
    write: {
      weekStart: "week_start",
      title: "title",
      titleEs: "title_es",
      intro: "intro",
      introEs: "intro_es",
      items: "items",
      spotlightPartnerId: "spotlight_partner_id",
      spotlightText: "spotlight_text",
      spotlightTextEs: "spotlight_text_es",
      imagePath: "image_path",
    },
    // publishing is for people in the hub, never the API
    read: { ...COMMON_READ, publishedAt: "published_at", updatedAt: "updated_at" },
    required: ["weekStart"],
    week: { column: "week_start", kind: "date" },
    order: [["week_start", false]],
  },
  members: {
    table: "hub_members",
    key: "id",
    // names and roles only: never the email addresses
    write: {},
    read: { ...COMMON_READ, name: "name", role: "role", color: "color" },
    required: [],
    order: [["name", true]],
    readOnly: true,
  },
  log: {
    table: "hub_api_log",
    key: "id",
    write: {},
    read: { ...COMMON_READ, at: "at", actor: "actor", action: "action", resource: "resource", recordId: "record_id", summary: "summary" },
    required: [],
    order: [["at", false]],
    readOnly: true,
  },
};

/** Stages a card can be put in from outside. Approval, scheduling and posting stay with people and the hub. */
const OPEN_STAGES = ["idea", "planning", "creating", "review"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Constant-time comparison, so the key cannot be guessed a character at a time. */
export function sameKey(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

/** The Monday of the week a day falls in (YYYY-MM-DD). */
export function mondayOf(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** This week's Monday in Puerto Rico (UTC-4, no daylight saving). */
export function thisWeek(now: Date): string {
  return mondayOf(new Date(now.getTime() - 4 * 3_600_000).toISOString().slice(0, 10));
}

const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** A row as the API hands it back: the hub's own field names. */
export function out(res: Resource, row: Row): Row {
  const o: Row = {};
  for (const [name, col] of Object.entries({ ...res.read, ...res.write })) if (col in row) o[name] = row[col];
  return o;
}

function isObject(v: unknown): v is Row {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

interface Ctx {
  store: ApiStore;
  actor: string;
  now: Date;
  members?: Row[];
}

async function members(ctx: Ctx): Promise<Row[]> {
  if (!ctx.members) ctx.members = await ctx.store.list("hub_members", { order: [["name", true]] });
  return ctx.members;
}

/** Accepts a member's id or their name ("Simone"). */
async function memberId(ctx: Ctx, v: unknown): Promise<string | null> {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).trim();
  const list = await members(ctx);
  if (UUID.test(s) && list.some((m) => m.id === s)) return s;
  const bare = s.replace(/^m-/, "").toLowerCase();
  const m = list.find((x) => String(x.name ?? "").trim().toLowerCase() === bare);
  if (!m) throw new ApiError(400, `Nobody called "${s}" is in the hub. Add them in Settings first, or leave the owner empty.`);
  return String(m.id);
}

/** Turns what the caller sent into a row for the table, checking what can be checked before the database does. */
async function toRow(ctx: Ctx, name: string, res: Resource, input: Row, creating: boolean): Promise<Row> {
  const row: Row = {};
  const unknown = Object.keys(input).filter((k) => !(k in res.write) && !(k in res.read));
  if (unknown.length) throw new ApiError(400, `${name} has no field called ${unknown.map((u) => `"${u}"`).join(", ")}. It has: ${Object.keys(res.write).join(", ")}.`);
  const locked = Object.keys(input).filter((k) => !(k in res.write) && k in res.read && k !== "id");
  if (locked.length) throw new ApiError(400, `${locked.join(", ")} cannot be written through the API.`);
  for (const [k, col] of Object.entries(res.write)) if (k in input) row[col] = input[k] === undefined ? null : input[k];
  if (creating) for (const r of res.required) if (input[r] === undefined || input[r] === null || input[r] === "") throw new ApiError(400, `A new entry in ${name} needs ${r}.`);

  if ("owner_id" in row) row.owner_id = await memberId(ctx, row.owner_id);
  if (name === "cards") {
    if ("stage" in row && !OPEN_STAGES.includes(String(row.stage))) throw new ApiError(403, `The API can put a card in ${OPEN_STAGES.join(", ")}. Approving, scheduling and posting are done in the hub by a person.`);
    if ("assets" in row && !Array.isArray(row.assets)) throw new ApiError(400, "assets must be a list.");
  }
  if (name === "tasks") {
    if ("day" in row) {
      if (!DAY.test(String(row.day))) throw new ApiError(400, "day must be a date written YYYY-MM-DD.");
      row.week_start = mondayOf(String(row.day));
    }
    if ("done" in row) row.done_at = row.done ? ctx.now.toISOString() : null;
    if ("steps" in row) {
      const steps = row.steps;
      if (!Array.isArray(steps) || steps.some((s) => !isObject(s) || typeof s.text !== "string" || !s.text.trim())) throw new ApiError(400, 'steps must be a list like [{"text": "Open HighLevel", "link": "https://..."}].');
      row.steps = steps.map((s) => {
        const o = s as Row;
        return { text: String(o.text).trim(), ...(o.link ? { link: String(o.link) } : {}), ...(o.linkLabel ? { linkLabel: String(o.linkLabel) } : {}) };
      });
    }
    if (creating) {
      row.detail ??= "";
      row.lever ??= "engage";
    }
  }
  if (name === "videos" && "url" in row && !/^https?:\/\//i.test(String(row.url))) throw new ApiError(400, "url must be a full link starting with https://");
  if ((name === "briefs" || name === "kit") && "week_start" in row) {
    if (!DAY.test(String(row.week_start))) throw new ApiError(400, "weekStart must be a date written YYYY-MM-DD.");
    row.week_start = mondayOf(String(row.week_start));
  }
  return row;
}

const summarise = (name: string, r: Row) => {
  const label = r.title ?? r.headline ?? r.body ?? r.week_start ?? r.id ?? "";
  return `${name}: ${String(label).slice(0, 120)}`;
};

/** A card's own history gets a line whenever the API changes it. */
function withActivity(ctx: Ctx, existing: Row | null, row: Row, text: string): Row {
  const prior = Array.isArray(existing?.activity) ? (existing!.activity as Row[]) : [];
  const entry = { id: `api-${ctx.now.getTime().toString(36)}`, at: ctx.now.toISOString(), by: "hub", text: `${text} (through the API, ${ctx.actor})` };
  return { ...row, activity: [entry, ...prior].slice(0, 100) };
}

async function create(ctx: Ctx, name: string, res: Resource, input: Row): Promise<Row> {
  let row = await toRow(ctx, name, res, input, true);
  if (name === "cards") row = withActivity(ctx, null, { source: "manual", ...row }, "Added");
  if (name === "videos") row.kind ??= guessKind(String(row.url));
  const saved = await ctx.store.insert(res.table, row);
  await ctx.store.log({ actor: ctx.actor, action: "create", resource: name, record_id: String(saved[res.key] ?? ""), summary: summarise(name, saved) });
  return out(res, saved);
}

export function guessKind(url: string): string {
  const u = url.toLowerCase();
  if (/youtube\.com|youtu\.be/.test(u)) return "youtube";
  if (u.includes("instagram.com")) return "instagram";
  if (/facebook\.com|fb\.watch/.test(u)) return "facebook";
  if (u.includes("tiktok.com")) return "tiktok";
  if (u.includes("linkedin.com")) return "linkedin";
  if (u.includes("drive.google.com")) return "drive";
  if (/\.(mp4|mov|m4v|webm)(\?|#|$)/.test(u)) return "file";
  return "link";
}

async function update(ctx: Ctx, name: string, res: Resource, id: string, input: Row): Promise<Row> {
  const existing = await ctx.store.get(res.table, res.key, id);
  if (!existing) throw new ApiError(404, `There is no entry ${id} in ${name}.`);
  let row = await toRow(ctx, name, res, input, false);
  if (name === "cards") {
    const fixed = ["approved", "scheduled", "posted"].includes(String(existing.stage));
    if (fixed && Object.keys(row).some((c) => c !== "notes")) throw new ApiError(403, `This card is ${existing.stage}, so only its notes can change through the API. Send it back from the hub first.`);
    row = withActivity(ctx, existing, row, `Changed ${Object.keys(input).join(", ")}`);
  }
  if (!Object.keys(row).length) return out(res, existing);
  const saved = await ctx.store.update(res.table, res.key, id, row);
  if (!saved) throw new ApiError(404, `There is no entry ${id} in ${name}.`);
  await ctx.store.log({ actor: ctx.actor, action: "update", resource: name, record_id: id, summary: `${summarise(name, saved)} (${Object.keys(input).join(", ")})` });
  return out(res, saved);
}

async function remove(ctx: Ctx, name: string, res: Resource, id: string): Promise<void> {
  if (res.noDelete) throw new ApiError(405, `${name} entries are not removed through the API.`);
  const existing = await ctx.store.get(res.table, res.key, id);
  if (!existing) throw new ApiError(404, `There is no entry ${id} in ${name}.`);
  if (name === "cards" && ["approved", "scheduled", "posted"].includes(String(existing.stage))) throw new ApiError(403, `This card is ${existing.stage}. Remove it in the hub, where it can be taken off the schedule first.`);
  await ctx.store.remove(res.table, res.key, id);
  await ctx.store.log({ actor: ctx.actor, action: "delete", resource: name, record_id: id, summary: summarise(name, existing) });
}

async function list(ctx: Ctx, name: string, res: Resource, query: URLSearchParams): Promise<Row[]> {
  const q: ListQuery = { order: res.order, limit: Math.min(Math.max(Number(query.get("limit")) || 200, 1), 500), eq: [] };
  const week = query.get("week");
  if (week) {
    if (!res.week) throw new ApiError(400, `${name} cannot be listed by week.`);
    if (!DAY.test(week)) throw new ApiError(400, "week must be a date written YYYY-MM-DD.");
    const start = mondayOf(week);
    if (res.week.kind === "date") q.eq!.push([res.week.column, start]);
    else {
      // a Puerto Rico week, Monday 00:00 to the next Monday 00:00 (UTC-4)
      q.gte = [[res.week.column, `${start}T04:00:00Z`]];
      q.lt = [[res.week.column, `${addDays(start, 7)}T04:00:00Z`]];
    }
  }
  for (const [param, field] of [["stage", "stage"], ["owner", "ownerId"], ["lever", "lever"], ["group", "group"], ["rights", "rights"], ["status", "status"], ["done", "done"]] as const) {
    const v = query.get(param);
    if (v === null || !(field in res.write)) continue;
    const col = res.write[field];
    q.eq!.push([col, field === "ownerId" ? await memberId(ctx, v) : field === "done" ? v === "true" : v]);
  }
  const words = query.get("q");
  if (words && res.search) q.search = [res.search, words];
  const rows = await ctx.store.list(res.table, q);
  return rows.map((r) => out(res, r));
}

/**
 * Imports a whole plan in one go: cards, tasks, a brief, the kit and videos, using the ids the
 * file itself uses ("c-email") to link tasks and ideas to cards. Anything already there with the
 * same title on the same day, or the same video link, is skipped, so running it twice is safe.
 */
async function importPlan(ctx: Ctx, body: Row): Promise<Row> {
  const done: Record<string, number> = {};
  const skipped: Record<string, number> = {};
  const cardIds = new Map<string, string>();
  const bump = (m: Record<string, number>, k: string) => (m[k] = (m[k] ?? 0) + 1);
  const arr = (k: string) => (Array.isArray(body[k]) ? (body[k] as Row[]) : []);

  for (const c of arr("cards")) {
    const localId = String(c.id ?? "");
    const { id: _drop, ...fields } = c;
    const stage = OPEN_STAGES.includes(String(fields.stage)) ? fields.stage : "idea";
    const sameDay = (await ctx.store.list("hub_items", { eq: [["title", fields.title]] })).find((r) => String(r.publish_at ?? "").slice(0, 10) === String(fields.publishAt ?? "").slice(0, 10));
    if (sameDay) {
      cardIds.set(localId, String(sameDay.id));
      bump(skipped, "cards");
      continue;
    }
    const saved = await create(ctx, "cards", RESOURCES.cards, pick({ ...fields, stage }, RESOURCES.cards));
    cardIds.set(localId, String(saved.id));
    bump(done, "cards");
  }
  const card = (v: unknown) => (v ? cardIds.get(String(v)) ?? (UUID.test(String(v)) ? String(v) : null) : null);

  for (const t of arr("tasks")) {
    const { id: _drop, ...fields } = t;
    const exists = (await ctx.store.list("hub_tasks", { eq: [["title", fields.title], ["day", fields.day]] })).length > 0;
    if (exists) {
      bump(skipped, "tasks");
      continue;
    }
    await create(ctx, "tasks", RESOURCES.tasks, pick({ ...fields, itemId: card(fields.itemId) }, RESOURCES.tasks));
    bump(done, "tasks");
  }

  for (const b of arr("briefs")) {
    const { id: _drop, ...fields } = b;
    const ideas = Array.isArray(fields.ideas) ? (fields.ideas as Row[]).map((i) => ({ ...i, itemId: card(i.itemId) ?? undefined })) : undefined;
    const existing = await ctx.store.get("hub_briefs", "week_start", mondayOf(String(fields.weekStart)));
    if (existing) {
      bump(skipped, "briefs");
      continue;
    }
    await create(ctx, "briefs", RESOURCES.briefs, pick({ ...fields, ideas }, RESOURCES.briefs));
    bump(done, "briefs");
  }

  if (isObject(body.kit)) {
    const k = body.kit;
    const existing = await ctx.store.get("hub_kit", "week_start", mondayOf(String(k.weekStart)));
    if (existing) bump(skipped, "kit");
    else {
      await create(ctx, "kit", RESOURCES.kit, pick(k, RESOURCES.kit));
      bump(done, "kit");
    }
  }

  for (const v of arr("videos")) {
    const { id: _drop, ...fields } = v;
    const exists = await ctx.store.get("hub_videos", "url", String(fields.url));
    if (exists) {
      bump(skipped, "videos");
      continue;
    }
    const itemIds = Array.isArray(fields.itemIds) ? (fields.itemIds as unknown[]).map(card).filter(Boolean) : undefined;
    await create(ctx, "videos", RESOURCES.videos, pick({ ...fields, itemIds }, RESOURCES.videos));
    bump(done, "videos");
  }

  await ctx.store.log({ actor: ctx.actor, action: "import", resource: "plan", record_id: null, summary: `Imported ${JSON.stringify(done)}; already there ${JSON.stringify(skipped)}` });
  return { added: done, alreadyThere: skipped };
}

/** Keeps only the fields a resource can write, so a whole exported record can be passed in. */
function pick(input: Row, res: Resource): Row {
  const o: Row = {};
  for (const k of Object.keys(res.write)) if (input[k] !== undefined) o[k] = input[k];
  return o;
}

export async function handle(req: ApiRequest, deps: { store: ApiStore; apiKey: string | undefined; now?: Date }): Promise<ApiResponse> {
  try {
    if (!deps.apiKey) throw new ApiError(503, "The hub API is switched off. It starts working once the HUB_API_KEY secret is set.");
    if (!req.key || !sameKey(req.key, deps.apiKey)) throw new ApiError(401, "That key is not right.");
    const ctx: Ctx = { store: deps.store, actor: (req.actor || "API").slice(0, 80), now: deps.now ?? new Date() };
    const parts = req.path.split("/").filter(Boolean);
    const [name, id] = parts;
    const method = req.method.toUpperCase();

    if (!name) {
      if (method !== "GET") throw new ApiError(405, "Use GET here.");
      return {
        status: 200,
        body: {
          about: "The Kindness Hub API. It reads and changes the hub's own data. It never posts, schedules, emails or approves.",
          thisWeek: thisWeek(ctx.now),
          resources: Object.fromEntries(Object.entries(RESOURCES).map(([n, r]) => [n, { fields: Object.keys(r.write), readOnly: !!r.readOnly, byWeek: !!r.week }])),
          also: ["GET /week?start=YYYY-MM-DD", "POST /import", "POST /files then POST /attach (put a picture or video on a card)", "POST /kit-files then POST /partnerKit (add to the partner kit)"],
        },
      };
    }

    if (name === "week") {
      if (method !== "GET") throw new ApiError(405, "Use GET here.");
      const start = mondayOf(req.query.get("start") && DAY.test(req.query.get("start")!) ? req.query.get("start")! : thisWeek(ctx.now));
      const q = new URLSearchParams({ week: start });
      const [cards, tasks, briefs, kit] = await Promise.all([list(ctx, "cards", RESOURCES.cards, q), list(ctx, "tasks", RESOURCES.tasks, q), list(ctx, "briefs", RESOURCES.briefs, q), list(ctx, "kit", RESOURCES.kit, q)]);
      return { status: 200, body: { weekStart: start, brief: briefs[0] ?? null, kit: kit[0] ?? null, cards, tasks } };
    }

    if (name === "kit-files") {
      // a one-time upload link into the public partner-kit bucket; then POST /partnerKit with the path
      if (method !== "POST") throw new ApiError(405, "Use POST to ask for an upload link.");
      if (!isObject(req.body)) throw new ApiError(400, 'Send {"name": "badge.png", "mime": "image/png", "size": 12345}.');
      const b = req.body;
      if (Number(b.size) > 50 * 1024 * 1024) throw new ApiError(400, "That file is over 50 MB. Export a smaller copy.");
      const safe = String(b.name ?? "file").toLowerCase().replace(/[^\w.-]+/g, "-").slice(-80) || "file";
      const folder = String(b.folder ?? "kit").toLowerCase().replace(/[^\w-]+/g, "-").slice(0, 40) || "kit";
      const path = `${folder}/${ctx.now.getTime().toString(36)}-${safe}`;
      const { uploadUrl } = await ctx.store.signedUpload(path, "partner-kit");
      return { status: 201, body: { path, uploadUrl, next: `POST /partnerKit with {"title": "...", "filePath": "${path}"}` } };
    }

    if (name === "files") {
      // step one of putting a file on a card: the API hands out a one-time upload link, the file
      // goes straight to the hub's private storage, and step two (attach) puts it on the card
      if (method !== "POST") throw new ApiError(405, "Use POST to ask for an upload link.");
      if (!isObject(req.body)) throw new ApiError(400, 'Send {"cardId": "...", "name": "film.mp4", "mime": "video/mp4", "size": 12345}.');
      const b = req.body;
      const mime = String(b.mime ?? "");
      if (!/^(image|video)\//.test(mime)) throw new ApiError(400, "Only pictures and videos can go on a card.");
      if (Number(b.size) > 50 * 1024 * 1024) throw new ApiError(400, "That file is over 50 MB, the most the hub holds. Export a smaller copy.");
      const card = await ctx.store.get("hub_items", "id", String(b.cardId ?? ""));
      if (!card) throw new ApiError(404, `There is no card ${b.cardId}.`);
      const safe = String(b.name ?? "file").toLowerCase().replace(/[^\w.-]+/g, "-").slice(-80) || "file";
      const path = `cards/${card.id}/${ctx.now.getTime().toString(36)}-${safe}`;
      const { uploadUrl } = await ctx.store.signedUpload(path);
      return { status: 201, body: { path, uploadUrl, next: `POST /attach with {"cardId": "${card.id}", "path": "${path}", "name": "...", "mime": "${mime}", "kind": "media" or "cover"}` } };
    }

    if (name === "attach") {
      if (method !== "POST") throw new ApiError(405, "Use POST to attach a file.");
      if (!isObject(req.body)) throw new ApiError(400, "Send the card, the file's path and its name.");
      const b = req.body;
      const card = await ctx.store.get("hub_items", "id", String(b.cardId ?? ""));
      if (!card) throw new ApiError(404, `There is no card ${b.cardId}.`);
      if (["approved", "scheduled", "posted"].includes(String(card.stage))) throw new ApiError(403, `This card is ${card.stage}, so its files cannot change through the API.`);
      const path = String(b.path ?? "");
      if (!path.startsWith(`cards/${card.id}/`)) throw new ApiError(400, "Upload the file for this card first (POST /files), then attach the path it gave you.");
      const kind = b.kind === "cover" ? "cover" : "media";
      const asset = { id: `api-${ctx.now.getTime().toString(36)}`, kind, path, mime: String(b.mime ?? ""), name: String(b.name ?? path.split("/").pop()) };
      const prior = Array.isArray(card.assets) ? (card.assets as Row[]) : [];
      // a card has one cover: a new one replaces the old
      const assets = kind === "cover" ? [...prior.filter((a) => a.kind !== "cover"), asset] : [...prior, asset];
      const row = withActivity(ctx, card, { assets }, `Added ${kind === "cover" ? "a cover" : "a file"}: ${asset.name}`);
      const saved = await ctx.store.update("hub_items", "id", String(card.id), row);
      await ctx.store.log({ actor: ctx.actor, action: "update", resource: "cards", record_id: String(card.id), summary: `cards: ${card.title} (attached ${asset.name})` });
      return { status: 200, body: out(RESOURCES.cards, saved ?? card) };
    }

    if (name === "import") {
      if (method !== "POST") throw new ApiError(405, "Use POST to import.");
      if (!isObject(req.body)) throw new ApiError(400, "Send the plan as a JSON object with cards, tasks, briefs, kit and videos.");
      return { status: 200, body: await importPlan(ctx, req.body) };
    }

    const res = RESOURCES[name];
    if (!res) throw new ApiError(404, `There is nothing called "${name}". Try: ${Object.keys(RESOURCES).join(", ")}, week, import.`);
    if (res.readOnly && method !== "GET") throw new ApiError(405, `${name} can only be read through the API.`);

    if (method === "GET") {
      if (id) {
        const row = await ctx.store.get(res.table, res.key, id);
        if (!row) throw new ApiError(404, `There is no entry ${id} in ${name}.`);
        return { status: 200, body: out(res, row) };
      }
      return { status: 200, body: await list(ctx, name, res, req.query) };
    }
    if (method === "POST") {
      if (id) throw new ApiError(405, "To change an entry, use PATCH with its id.");
      const items = Array.isArray(req.body) ? req.body : [req.body];
      if (!items.length || items.some((x) => !isObject(x))) throw new ApiError(400, "Send one entry as a JSON object, or several as a list.");
      if (items.length > 100) throw new ApiError(400, "Send at most 100 entries at a time.");
      const created = [];
      for (const it of items) created.push(await create(ctx, name, res, it as Row));
      return { status: 201, body: Array.isArray(req.body) ? created : created[0] };
    }
    if (method === "PATCH") {
      if (!id) throw new ApiError(400, "Say which entry to change: PATCH /" + name + "/<id>.");
      if (!isObject(req.body)) throw new ApiError(400, "Send the fields to change as a JSON object.");
      return { status: 200, body: await update(ctx, name, res, id, req.body) };
    }
    if (method === "DELETE") {
      if (!id) throw new ApiError(400, "Say which entry to remove: DELETE /" + name + "/<id>.");
      await remove(ctx, name, res, id);
      return { status: 200, body: { removed: id } };
    }
    throw new ApiError(405, "Use GET, POST, PATCH or DELETE.");
  } catch (e) {
    if (e instanceof ApiError) return { status: e.status, body: { error: e.message } };
    const msg = e instanceof Error ? e.message : String(e);
    // the database's own refusals (a check, a duplicate) are worth passing on as they are
    return { status: 400, body: { error: msg || "Something went wrong." } };
  }
}
