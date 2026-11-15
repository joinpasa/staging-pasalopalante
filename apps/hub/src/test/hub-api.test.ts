import { describe, expect, it } from "vitest";
import { type ApiStore, handle, type ListQuery, type Row } from "../../../../supabase/functions/hub-api/core";

/** An in-memory stand-in for the hub's tables. */
function memoryStore() {
  const tables: Record<string, Row[]> = { hub_members: [{ id: "11111111-1111-4111-8111-111111111111", name: "Simone", role: "admin", color: "#d81b60", email: "never@example.org" }, { id: "22222222-2222-4222-8222-222222222222", name: "Mark", role: "member", color: "#0e234b", email: "hidden@example.org" }] };
  const log: Row[] = [];
  let n = 0;
  const t = (name: string) => (tables[name] ??= []);
  const store: ApiStore = {
    async list(table: string, q: ListQuery) {
      let rows = [...t(table)];
      for (const [c, v] of q.eq ?? []) rows = rows.filter((r) => r[c] === v);
      for (const [c, v] of q.gte ?? []) rows = rows.filter((r) => String(r[c] ?? "") >= v);
      for (const [c, v] of q.lt ?? []) rows = rows.filter((r) => String(r[c] ?? "") < v);
      if (q.search) rows = rows.filter((r) => q.search![0].some((c) => String(r[c] ?? "").toLowerCase().includes(q.search![1].toLowerCase())));
      return rows.slice(0, q.limit ?? 500);
    },
    async get(table: string, key: string, value: string) {
      return t(table).find((r) => String(r[key]) === value) ?? null;
    },
    async insert(table: string, row: Row) {
      if (table === "hub_videos" && t(table).some((r) => r.url === row.url)) throw new Error("That is already in the hub.");
      const saved = { id: `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`, ...row };
      t(table).push(saved);
      return saved;
    },
    async update(table: string, key: string, value: string, row: Row) {
      const r = t(table).find((x) => String(x[key]) === value);
      if (!r) return null;
      Object.assign(r, row);
      return r;
    },
    async remove(table: string, key: string, value: string) {
      tables[table] = t(table).filter((x) => String(x[key]) !== value);
      return true;
    },
    async log(entry) {
      log.push(entry);
    },
    async signedUpload(path: string) {
      return { uploadUrl: `https://storage.example.org/upload/${path}?token=t` };
    },
  };
  return { store, tables, log };
}

const KEY = "test-key-0123456789";
const now = new Date("2026-11-16T15:00:00Z");

function client() {
  const mem = memoryStore();
  const call = (method: string, path: string, body?: unknown, key: string | null = KEY) => {
    const [p, qs] = path.split("?");
    return handle({ method, path: p, query: new URLSearchParams(qs ?? ""), body, key, actor: "Claude for Simone" }, { store: mem.store, apiKey: KEY, now });
  };
  return { ...mem, call };
}

describe("the hub API", () => {
  it("stays shut without the key, and when the key is not set at all", async () => {
    const { call, store } = client();
    expect((await call("GET", "/tasks", undefined, null)).status).toBe(401);
    expect((await call("GET", "/tasks", undefined, "nearly-the-key")).status).toBe(401);
    const off = await handle({ method: "GET", path: "/tasks", query: new URLSearchParams(), body: undefined, key: KEY, actor: "x" }, { store, apiKey: undefined });
    expect(off.status).toBe(503);
  });

  it("adds a task with its steps, works out the week, and finds the owner by name", async () => {
    const { call, log } = client();
    const res = await call("POST", "/tasks", { title: "Reply to the six comments", day: "2026-11-18", lever: "engage", ownerId: "Mark", steps: [{ text: "Open the post", link: "https://www.instagram.com/p/DfreyMSFcGU/" }] });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: "Reply to the six comments", weekStart: "2026-11-16", ownerId: "22222222-2222-4222-8222-222222222222", steps: [{ text: "Open the post", link: "https://www.instagram.com/p/DfreyMSFcGU/" }] });
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ action: "create", resource: "tasks", actor: "Claude for Simone" });
  });

  it("refuses fields it does not know, and someone who is not in the hub", async () => {
    const { call } = client();
    expect((await call("POST", "/tasks", { title: "x", day: "2026-11-18", colour: "red" })).body).toMatchObject({ error: expect.stringContaining('"colour"') });
    expect((await call("POST", "/tasks", { title: "x", day: "2026-11-18", ownerId: "Stranger" })).status).toBe(400);
    expect((await call("POST", "/tasks", { day: "2026-11-18" })).body).toMatchObject({ error: expect.stringContaining("needs title") });
  });

  it("never approves, schedules or posts a card", async () => {
    const { call, tables } = client();
    expect((await call("POST", "/cards", { title: "Skip the queue", stage: "approved" })).status).toBe(403);
    const made = (await call("POST", "/cards", { title: "Tolerance Day tiles", stage: "creating" })).body as Row;
    expect((await call("PATCH", `/cards/${made.id}`, { stage: "scheduled" })).status).toBe(403);
    expect((await call("PATCH", `/cards/${made.id}`, { approvedBy: "11111111-1111-4111-8111-111111111111" })).status).toBe(400);
    // once a person approves it in the hub, the API can only touch its notes
    Object.assign(tables.hub_items[0], { stage: "approved" });
    expect((await call("PATCH", `/cards/${made.id}`, { captionEn: "Changed after approval" })).status).toBe(403);
    expect((await call("PATCH", `/cards/${made.id}`, { notes: "Cover is on the drive" })).status).toBe(200);
    expect((await call("DELETE", `/cards/${made.id}`)).status).toBe(403);
  });

  it("writes every card change into the card's own history", async () => {
    const { call } = client();
    const made = (await call("POST", "/cards", { title: "Ten ideas", stage: "idea" })).body as Row;
    const changed = (await call("PATCH", `/cards/${made.id}`, { captionEn: "Ten small acts" })).body as Row;
    const activity = changed.activity as Row[];
    expect(activity[0].text).toMatch(/Changed captionEn \(through the API, Claude for Simone\)/);
    expect(activity).toHaveLength(2);
  });

  it("lists a week, and never hands out members' email addresses", async () => {
    const { call } = client();
    await call("POST", "/tasks", [
      { title: "Monday", day: "2026-11-16" },
      { title: "Next week", day: "2026-11-23" },
    ]);
    await call("POST", "/cards", [
      { title: "Sunday night in Puerto Rico", publishAt: "2026-11-23T03:00:00Z" },
      { title: "Monday morning", publishAt: "2026-11-23T13:00:00Z" },
    ]);
    const week = (await call("GET", "/week?start=2026-11-18")).body as { weekStart: string; tasks: Row[]; cards: Row[] };
    expect(week.weekStart).toBe("2026-11-16");
    expect(week.tasks.map((t) => t.title)).toEqual(["Monday"]);
    expect(week.cards.map((c) => c.title)).toEqual(["Sunday night in Puerto Rico"]);
    const people = (await call("GET", "/members")).body as Row[];
    expect(people[0]).not.toHaveProperty("email");
    expect((await call("POST", "/members", { name: "Me" })).status).toBe(405);
  });

  it("imports a plan once, linking tasks and ideas to the new cards", async () => {
    const { call, tables } = client();
    const plan = {
      cards: [{ id: "c-email", title: "Weekly email", stage: "review", format: "email", publishAt: "2026-11-19T15:11:00Z", ownerId: "m-simone" }],
      tasks: [{ id: "t8", title: "Approve the email", day: "2026-11-18", lever: "email", ownerId: "m-simone", itemId: "c-email", done: false }],
      briefs: [{ id: "b1", weekStart: "2026-11-16", headline: "Children's week", ideas: [{ id: "i1", title: "Email", itemId: "c-email" }] }],
      kit: { weekStart: "2026-11-16", askEn: "Wear blue", askEs: "Vístete de azul", shares: 0 },
      videos: [{ id: "v1", title: "The film", url: "https://files.example.org/film.mp4", group: "ours", rights: "ours", tags: [], addedAt: "2026-11-15T20:00:00Z", itemIds: ["c-email"] }],
    };
    const first = await call("POST", "/import", plan);
    expect(first.body).toEqual({ added: { cards: 1, tasks: 1, briefs: 1, kit: 1, videos: 1 }, alreadyThere: {} });
    const cardId = tables.hub_items[0].id;
    expect(tables.hub_tasks[0].item_id).toBe(cardId);
    expect((tables.hub_briefs[0].ideas as Row[])[0].itemId).toBe(cardId);
    expect(tables.hub_videos[0].item_ids).toEqual([cardId]);
    const second = await call("POST", "/import", plan);
    expect(second.body).toEqual({ added: {}, alreadyThere: { cards: 1, tasks: 1, briefs: 1, kit: 1, videos: 1 } });
  });

  it("puts a file on a card in two steps, and keeps one cover", async () => {
    const { call, tables } = client();
    const card = (await call("POST", "/cards", { title: "Ten ideas", stage: "creating" })).body as Row;
    expect((await call("POST", "/files", { cardId: card.id, name: "notes.pdf", mime: "application/pdf", size: 10 })).status).toBe(400);
    expect((await call("POST", "/files", { cardId: card.id, name: "big.mp4", mime: "video/mp4", size: 60 * 1024 * 1024 })).status).toBe(400);
    const ask = (await call("POST", "/files", { cardId: card.id, name: "Ten Ideas Cover.png", mime: "image/png", size: 1000 })).body as Row;
    expect(String(ask.path)).toMatch(new RegExp(`^cards/${card.id}/.+-ten-ideas-cover[.]png$`));
    expect(String(ask.uploadUrl)).toContain("token=");
    await call("POST", "/attach", { cardId: card.id, path: ask.path, name: "cover.png", mime: "image/png", kind: "cover" });
    await call("POST", "/attach", { cardId: card.id, path: `cards/${card.id}/x-second.png`, name: "second.png", mime: "image/png", kind: "cover" });
    const assets = tables.hub_items[0].assets as Row[];
    expect(assets.filter((a) => a.kind === "cover")).toHaveLength(1);
    expect(assets[0].name).toBe("second.png");
    // a path from another card, or from nowhere, is refused
    expect((await call("POST", "/attach", { cardId: card.id, path: "cards/other/file.png", name: "x", mime: "image/png" })).status).toBe(400);
  });
});
