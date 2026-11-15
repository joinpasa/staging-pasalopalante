// The live driver: the same HubStore the screens already use, backed by the hub's own tables
// (Supabase) and by HighLevel through the hub-ghl edge function. The rules that matter are
// enforced on the server (see supabase/migrations/*_kindness_hub.sql); what is checked here as
// well is only so a person gets a clear sentence before a round trip, not instead of it.

import { blockers, checkCaption } from "./checks";
import { callHub, hubDb } from "./client";
import { SEED_COMMUNITY } from "./seed";
import { stageMeta } from "./stages";
import { consentOk } from "./stories";
import type { HubStore } from "./store";
import type { Account, Activity, Asset, Brief, Consent, EmailCampaign, GhlPost, InboxCounts, Item, Kit, Lever, Member, NewsletterDesign, PledgeDay, PledgeSource, Stage, Stats, Story, Suggestion, Task, TaskStep, Thread, ThreadMessage, Video } from "./types";
import { videoKind } from "./videos";
import { mondayKey } from "./store";

const BUCKET = "hub-media";
const uid = () => crypto.randomUUID();
const nowIso = () => new Date().toISOString();

// deno-style rows in, the hub's own shapes out
type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const toTask = (r: Row): Task => ({
  id: r.id,
  weekStart: r.week_start,
  day: r.day,
  title: r.title,
  detail: r.detail ?? "",
  lever: r.lever as Lever,
  ownerId: r.owner_id ?? undefined,
  itemId: r.item_id ?? undefined,
  done: !!r.done,
  doneAt: r.done_at ?? undefined,
  have: r.have || undefined,
  missing: r.missing || undefined,
  steps: Array.isArray(r.steps) && r.steps.length ? (r.steps as TaskStep[]) : undefined,
});

const toVideo = (r: Row): Video => ({
  id: r.id,
  title: r.title,
  url: r.url,
  kind: r.kind,
  group: r.grp,
  rights: r.rights,
  source: r.source ?? "",
  date: r.made_on ?? undefined,
  seconds: r.seconds ?? undefined,
  orientation: r.orientation ?? undefined,
  lang: r.lang ?? undefined,
  poster: r.poster ?? undefined,
  people: r.people ?? undefined,
  notes: r.notes || undefined,
  tags: r.tags ?? [],
  itemIds: r.item_ids?.length ? r.item_ids : undefined,
  addedAt: r.added_at,
});

/** The hub's video fields, as the table names them. */
function videoRow(v: Partial<Video>): Row {
  const row: Row = {};
  const map: [keyof Video, string][] = [
    ["title", "title"], ["url", "url"], ["kind", "kind"], ["group", "grp"], ["rights", "rights"], ["source", "source"], ["date", "made_on"], ["seconds", "seconds"],
    ["orientation", "orientation"], ["lang", "lang"], ["poster", "poster"], ["people", "people"], ["notes", "notes"], ["tags", "tags"], ["itemIds", "item_ids"],
  ];
  for (const [k, col] of map) if (k in v) row[col] = v[k] ?? null;
  if ("notes" in v) row.notes = v.notes ?? "";
  if ("source" in v) row.source = v.source ?? "";
  if ("tags" in v) row.tags = v.tags ?? [];
  if ("itemIds" in v) row.item_ids = v.itemIds ?? [];
  return row;
}

/** Supabase's errors, said the way the hub talks. The database's own refusals are already plain sentences. */
function fail(error: { message?: string; code?: string } | null, fallback: string): never {
  const msg = error?.message ?? "";
  if (error?.code === "P0001" && msg) throw new Error(msg);
  if (/row-level security|permission denied|JWT/i.test(msg)) throw new Error("You are not signed in to the hub, or have not been added to it yet.");
  throw new Error(fallback);
}

/** A stored asset keeps a `path` in the hub's private bucket; the screens need a link they can show. */
type StoredAsset = Omit<Asset, "url"> & { path?: string; url?: string };

async function signed(paths: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return out;
  const { data } = await hubDb.storage.from(BUCKET).createSignedUrls(unique, 3600);
  for (const d of data ?? []) if (d.path && d.signedUrl) out.set(d.path, d.signedUrl);
  return out;
}

const toItem = (r: Row, links: Map<string, string>): Item => ({
  id: r.id,
  title: r.title,
  notes: r.notes,
  stage: r.stage,
  format: r.format,
  ownerId: r.owner_id ?? undefined,
  accountIds: r.account_ids ?? [],
  publishAt: r.publish_at ?? undefined,
  eventAt: r.event_at ?? undefined,
  captionEn: r.caption_en,
  captionEs: r.caption_es,
  subject: r.subject ?? undefined,
  design: r.design ?? undefined,
  inKit: r.in_kit,
  assets: ((r.assets ?? []) as StoredAsset[]).map((a) => ({ ...a, url: (a.path && links.get(a.path)) || a.url || "" })),
  approvedBy: r.approved_by ?? undefined,
  approvedAt: r.approved_at ?? undefined,
  needsChanges: r.needs_changes ?? undefined,
  ghlPostId: r.ghl_post_id ?? undefined,
  source: r.source,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  activity: r.activity ?? [],
});

/** Only the fields a person may change by hand. Stage, approval and the HighLevel link have their own paths. */
function itemPatch(p: Partial<Item>): Row {
  const row: Row = {};
  if (p.title !== undefined) row.title = p.title;
  if (p.notes !== undefined) row.notes = p.notes;
  if (p.format !== undefined) row.format = p.format;
  if ("ownerId" in p) row.owner_id = p.ownerId ?? null;
  if (p.accountIds !== undefined) row.account_ids = p.accountIds;
  if ("publishAt" in p) row.publish_at = p.publishAt ?? null;
  if ("eventAt" in p) row.event_at = p.eventAt ?? null;
  if (p.captionEn !== undefined) row.caption_en = p.captionEn;
  if (p.captionEs !== undefined) row.caption_es = p.captionEs;
  if ("subject" in p) row.subject = p.subject ?? null;
  if ("design" in p) row.design = (p.design as NewsletterDesign | undefined) ?? null;
  if (p.inKit !== undefined) row.in_kit = p.inKit;
  if ("needsChanges" in p) row.needs_changes = p.needsChanges ?? null;
  if (p.source !== undefined) row.source = p.source;
  return row;
}

const toStory = (r: Row, links: Map<string, string>): Story => ({
  id: r.id,
  kind: r.kind,
  title: r.title,
  url: (r.path && links.get(r.path)) || r.url || undefined,
  mime: r.mime ?? undefined,
  poster: (r.poster_path && links.get(r.poster_path)) || undefined,
  words: r.words ?? undefined,
  people: r.people,
  source: r.source,
  partner: r.partner ?? undefined,
  country: r.country ?? undefined,
  tags: r.tags ?? [],
  consent: r.consent as Consent,
  consentNote: r.consent_note ?? undefined,
  minors: r.minors,
  credit: r.credit ?? undefined,
  addedBy: r.added_by ?? "",
  addedAt: r.added_at,
});

const toSuggestion = (r: Row): Suggestion => ({
  id: r.id,
  from: r.from_name,
  text: r.body,
  link: r.link ?? undefined,
  at: r.created_at,
  status: r.status,
  itemId: r.item_id ?? undefined,
  group: r.grp ?? undefined,
  kind: r.kind ?? undefined,
  consent: r.consent ?? undefined,
  storyId: r.story_id ?? undefined,
});

const toMember = (r: Row): Member => ({ id: r.id, name: r.name || String(r.email).split("@")[0], role: r.role, color: r.color });

/** The Monday of this week in Puerto Rico, as YYYY-MM-DD. */
function weekStart(now = new Date()): string {
  const pr = new Date(now.getTime() - 4 * 3_600_000);
  const day = (pr.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(pr.getUTCFullYear(), pr.getUTCMonth(), pr.getUTCDate() - day)).toISOString().slice(0, 10);
}

const safeName = (name: string) => name.normalize("NFKD").replace(/[^\w.\- ]+/g, "").trim().replace(/\s+/g, "-").slice(-80) || "file";

export function createLiveStore(): HubStore {
  let meCache: Member | null = null;

  const signedIn = async () => !!(await hubDb.auth.getSession()).data.session;

  async function me(): Promise<Member> {
    if (meCache) return meCache;
    const { data: role, error } = await hubDb.rpc("hub_claim");
    if (error) fail(error, "The hub could not check who you are. Try signing in again.");
    if (!role) throw new Error("You have not been added to the hub yet. Ask an admin to add your email.");
    const { data: user } = await hubDb.auth.getUser();
    const { data: row } = await hubDb.from("hub_members").select("*").eq("user_id", user.user?.id ?? "").maybeSingle();
    if (!row) throw new Error("The hub could not find your name. Sign out and in again.");
    meCache = { ...toMember(row), role };
    return meCache;
  }

  async function getItem(id: string): Promise<Item> {
    const { data, error } = await hubDb.from("hub_items").select("*").eq("id", id).maybeSingle();
    if (error) fail(error, "The hub could not open that card.");
    if (!data) throw new Error("That card no longer exists.");
    return toItem(data, await signed(((data.assets ?? []) as StoredAsset[]).map((a) => a.path ?? "")));
  }

  /** Changes a card, optionally adding a line to its history. Returns the card as the database now has it. */
  async function update(id: string, row: Row, note?: string, by?: string): Promise<Item> {
    if (note) {
      const { data: cur } = await hubDb.from("hub_items").select("activity").eq("id", id).maybeSingle();
      const line: Activity = { id: uid(), at: nowIso(), by: by ?? (await me()).id, text: note };
      row.activity = [line, ...((cur?.activity ?? []) as Activity[])];
    }
    const { error } = await hubDb.from("hub_items").update(row).eq("id", id);
    if (error) fail(error, "The card could not be saved. Try again.");
    return getItem(id);
  }

  async function upload(folder: string, blob: Blob, name: string): Promise<string> {
    if (blob.size > 50 * 1024 * 1024) throw new Error("That file is over 50 MB, which is the most the hub can hold. Export a smaller copy and add that.");
    const path = `${folder}/${uid()}-${safeName(name)}`;
    const { error } = await hubDb.storage.from(BUCKET).upload(path, blob, { contentType: blob.type || "application/octet-stream", upsert: false });
    if (error) fail(error, "The file did not upload. Check your connection and try again.");
    return path;
  }

  const store: HubStore = {
    mode: "live",
    me,
    async setMe() {
      return me();
    },
    async members() {
      const { data, error } = await hubDb.from("hub_members").select("*").order("created_at");
      if (error) fail(error, "The hub could not load the team.");
      return (data ?? []).map(toMember);
    },
    async accounts() {
      return (await callHub<{ accounts: Account[] }>("hub-ghl", { action: "accounts" })).accounts;
    },
    async items() {
      // the kit page is open to people without an account, who see only what the team offered them
      if (!(await signedIn())) {
        const { items } = await callHub<{ items: Partial<Item>[] }>("hub-public", { action: "kit" });
        return items.map((i) => ({ notes: "", accountIds: [], source: "manual", createdAt: "", updatedAt: "", activity: [], inKit: true, ...i }) as Item);
      }
      const { data, error } = await hubDb.from("hub_items").select("*").order("updated_at", { ascending: false });
      if (error) fail(error, "The hub could not load the cards.");
      const links = await signed((data ?? []).flatMap((r) => ((r.assets ?? []) as StoredAsset[]).map((a) => a.path ?? "")));
      return (data ?? []).map((r) => toItem(r, links));
    },
    async createItem(seed = {}) {
      const who = await me();
      const line: Activity = { id: uid(), at: nowIso(), by: who.id, text: "Created" };
      const stage = seed.stage && !["approved", "scheduled", "posted"].includes(seed.stage) ? seed.stage : "idea";
      const { data, error } = await hubDb.from("hub_items").insert({ ...itemPatch(seed), stage, activity: [line] }).select("*").single();
      if (error) fail(error, "The card could not be created. Try again.");
      return toItem(data, new Map());
    },
    async saveItem(id, patch) {
      return update(id, itemPatch(patch));
    },
    async moveItem(id, stage, note) {
      const item = await getItem(id);
      const who = await me();
      if (stage === item.stage) return item;
      if (stage === "scheduled" || stage === "posted") throw new Error("Open the approved card and press Schedule. The hub moves it to Scheduled and Posted by itself.");
      const row: Row = { stage };
      if (stage === "review") row.needs_changes = null;
      if (note) row.needs_changes = note;
      if (stage !== "idea" && !item.ownerId) row.owner_id = who.id;
      const text = note ? `Sent back to ${stageMeta(stage).label}: ${note}` : stage === "approved" ? "Approved" : `Moved from ${stageMeta(item.stage).label} to ${stageMeta(stage).label}`;
      return update(id, row, text, who.id);
    },
    async deleteItem(id) {
      const item = await getItem(id);
      const { error } = await hubDb.from("hub_items").delete().eq("id", id);
      if (error) fail(error, "The card could not be removed.");
      const paths = (item.assets as StoredAsset[]).filter((a) => a.path && !a.storyId).map((a) => a.path!);
      if (paths.length) await hubDb.storage.from(BUCKET).remove(paths);
    },
    async addAsset(itemId, file, kind) {
      return store.addAssetFromBlob(itemId, file, file.name, kind);
    },
    async addAssetFromBlob(itemId, blob, name, kind) {
      const { data: cur, error } = await hubDb.from("hub_items").select("assets, stage").eq("id", itemId).maybeSingle();
      if (error || !cur) fail(error, "That card no longer exists.");
      if (cur.stage === "scheduled" || cur.stage === "posted") throw new Error("That card has already been scheduled, so nothing can be added to it.");
      const path = await upload(`cards/${itemId}`, blob, name);
      const asset: StoredAsset = { id: uid(), kind, path, mime: blob.type || "application/octet-stream", name, size: blob.size };
      const before = (cur.assets ?? []) as StoredAsset[];
      const old = kind === "cover" ? before.filter((a) => a.kind === "cover") : [];
      const item = await update(itemId, { assets: [...before.filter((a) => !old.includes(a)), asset] }, kind === "cover" ? "Added a cover" : `Added ${name}`);
      const gone = old.filter((a) => a.path && !a.storyId).map((a) => a.path!);
      if (gone.length) await hubDb.storage.from(BUCKET).remove(gone);
      return item;
    },
    async removeAsset(itemId, assetId) {
      const { data: cur, error } = await hubDb.from("hub_items").select("assets").eq("id", itemId).maybeSingle();
      if (error || !cur) fail(error, "That card no longer exists.");
      const before = (cur.assets ?? []) as StoredAsset[];
      const gone = before.find((a) => a.id === assetId);
      const item = await update(itemId, { assets: before.filter((a) => a.id !== assetId) });
      // a file that came from the story bank stays in the bank
      if (gone?.path && !gone.storyId) await hubDb.storage.from(BUCKET).remove([gone.path]);
      return item;
    },
    async comment(itemId, text) {
      return update(itemId, {}, text);
    },
    async schedule(itemId) {
      const item = await getItem(itemId);
      const who = await me();
      if (item.stage !== "approved") throw new Error("A card has to be approved before it can be scheduled.");
      if (who.role === "member") throw new Error("Only an approver can schedule a post.");
      const blocks = blockers(item);
      if (blocks.length) throw new Error(`Not sent yet: ${blocks[0].title.toLowerCase()}.`);
      await callHub("hub-ghl", { action: "schedule", itemId });
      return getItem(itemId);
    },
    async briefs() {
      const { data, error } = await hubDb.from("hub_briefs").select("*").order("week_start", { ascending: false }).limit(12);
      if (error) fail(error, "The hub could not load the weekly brief.");
      return (data ?? []).map((r): Brief => ({ id: r.id, weekStart: r.week_start, headline: r.headline, summary: r.summary, dates: r.dates ?? [], formats: r.formats ?? [], ideas: r.ideas ?? [], goal: r.goal || undefined }));
    },
    async claimIdea(briefId, ideaId) {
      const { data: brief, error } = await hubDb.from("hub_briefs").select("ideas").eq("id", briefId).maybeSingle();
      const ideas = (brief?.ideas ?? []) as Brief["ideas"];
      const idea = ideas.find((i) => i.id === ideaId);
      if (error || !idea) throw new Error("That idea is no longer in the brief.");
      if (idea.itemId) {
        const { data: taken } = await hubDb.from("hub_items").select("id").eq("id", idea.itemId).maybeSingle();
        if (taken) throw new Error("Someone has already claimed that idea.");
      }
      const who = await me();
      const item = await store.createItem({ title: idea.title, notes: idea.why + (idea.hook ? `\n\nHook: ${idea.hook}` : ""), format: idea.format, stage: "planning", ownerId: who.id, source: "brief" });
      await hubDb.from("hub_briefs").update({ ideas: ideas.map((i) => (i.id === ideaId ? { ...i, itemId: item.id } : i)) }).eq("id", briefId);
      return update(item.id, { activity: [{ id: uid(), at: nowIso(), by: who.id, text: "Claimed from the weekly brief" }] });
    },
    async suggestions() {
      const { data, error } = await hubDb.from("hub_suggestions").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) fail(error, "The hub could not load the suggestions.");
      return (data ?? []).map(toSuggestion);
    },
    async addSuggestion(s) {
      // the same door for everyone, signed in or not, so the form behaves the same on any phone
      await callHub("hub-public", { action: "suggest", from: s.from, text: s.text, link: s.link, group: s.group, kind: s.kind, consent: s.consent });
      return { id: uid(), from: s.from.trim(), text: s.text.trim(), link: s.link?.trim() || undefined, at: nowIso(), status: "new", group: s.group, kind: s.kind, consent: s.consent };
    },
    async resolveSuggestion(id, action) {
      const { data: row, error } = await hubDb.from("hub_suggestions").select("*").eq("id", id).maybeSingle();
      if (error || !row) throw new Error("That suggestion is gone.");
      if (action === "decline") {
        await hubDb.from("hub_suggestions").update({ status: "declined" }).eq("id", id);
        return null;
      }
      const sug = toSuggestion(row);
      const title = sug.text.length > 70 ? `${sug.text.slice(0, 67).trimEnd()}...` : sug.text;
      const consent = sug.group ? `\n\nConsent to share: ${sug.consent ? "ticked by the sender. Keep it on file before posting." : "not confirmed yet. Ask before posting."}` : "";
      const item = await store.createItem({ title, notes: `${sug.kind === "story" ? "Story from" : "Suggested by"} ${sug.from}: ${sug.text}${sug.link ? `\n${sug.link}` : ""}${consent}`, source: "suggestion", stage: "idea" });
      await hubDb.from("hub_suggestions").update({ status: "accepted", item_id: item.id }).eq("id", id);
      return update(item.id, { activity: [{ id: uid(), at: nowIso(), by: (await me()).id, text: `Accepted from the suggestion box (from ${sug.from})` }] });
    },
    async bankSuggestion(id) {
      const { data: row, error } = await hubDb.from("hub_suggestions").select("*").eq("id", id).maybeSingle();
      if (error || !row) throw new Error("That message is gone.");
      const sug = toSuggestion(row);
      const st = await store.addStory({
        kind: "words",
        title: sug.text.length > 56 ? `${sug.text.slice(0, 53).trimEnd()}...` : sug.text,
        words: sug.text,
        people: sug.from,
        source: sug.group === "partner" ? "Sent by a partner through the kit page" : sug.group === "ambassador" ? "Sent by an ambassador through the kit page" : "Sent through the suggestion box",
        consent: sug.consent ? "partner" : "unknown",
        consentNote: sug.consent ? "The sender ticked that the people shown agreed to be shared." : undefined,
      });
      await hubDb.from("hub_suggestions").update({ status: "accepted", story_id: st.id }).eq("id", id);
      return st;
    },
    async stories() {
      const { data, error } = await hubDb.from("hub_stories").select("*").order("added_at", { ascending: false });
      if (error) fail(error, "The hub could not load the story bank.");
      const links = await signed((data ?? []).flatMap((r) => [r.path ?? "", r.poster_path ?? ""]));
      return (data ?? []).map((r) => toStory(r, links));
    },
    async addStory(seed, file, poster) {
      const who = await me();
      const id = uid();
      const row: Row = {
        id,
        kind: seed.kind,
        title: seed.title ?? "",
        words: seed.words ?? null,
        people: seed.people ?? "",
        source: seed.source ?? "",
        partner: seed.partner ?? null,
        country: seed.country ?? null,
        tags: seed.tags ?? [],
        consent: seed.consent ?? "unknown",
        consent_note: seed.consentNote ?? null,
        minors: !!seed.minors,
        credit: seed.credit ?? null,
        added_by: who.id,
        url: file ? null : seed.url ?? null,
        mime: file ? file.type || "application/octet-stream" : seed.mime ?? null,
      };
      if (file) row.path = await upload(`stories/${id}`, file, seed.title || "story");
      // a clip's still arrives as a data: link made in the browser
      if (poster?.startsWith("data:")) row.poster_path = await upload(`stories/${id}`, await (await fetch(poster)).blob(), "poster.jpg");
      const { data, error } = await hubDb.from("hub_stories").insert(row).select("*").single();
      if (error) fail(error, "The story could not be saved. Try again.");
      return toStory(data, await signed([data.path ?? "", data.poster_path ?? ""]));
    },
    async saveStory(id, patch) {
      const row: Row = {};
      const map: [keyof Story, string][] = [["title", "title"], ["words", "words"], ["people", "people"], ["source", "source"], ["partner", "partner"], ["country", "country"], ["tags", "tags"], ["consent", "consent"], ["consentNote", "consent_note"], ["minors", "minors"], ["credit", "credit"]];
      for (const [k, col] of map) if (k in patch) row[col] = patch[k] ?? null;
      const { data, error } = await hubDb.from("hub_stories").update(row).eq("id", id).select("*").maybeSingle();
      if (error) fail(error, "The story could not be saved. Try again.");
      if (!data) throw new Error("That story is no longer in the bank.");
      // cards that use it always show the bank's current answer on consent
      if ("consent" in patch || "minors" in patch) {
        const { data: cards } = await hubDb.from("hub_items").select("id, assets").contains("assets", JSON.stringify([{ storyId: id }]));
        for (const c of cards ?? []) await hubDb.from("hub_items").update({ assets: ((c.assets ?? []) as StoredAsset[]).map((a) => (a.storyId === id ? { ...a, consent: data.consent, minors: data.minors } : a)) }).eq("id", c.id);
      }
      return toStory(data, await signed([data.path ?? "", data.poster_path ?? ""]));
    },
    async deleteStory(id) {
      const { data: used } = await hubDb.from("hub_items").select("id").contains("assets", JSON.stringify([{ storyId: id }])).limit(1);
      if (used?.length) throw new Error("A card is using this story. Take it off the card first.");
      const { data: row } = await hubDb.from("hub_stories").select("path, poster_path").eq("id", id).maybeSingle();
      const { error } = await hubDb.from("hub_stories").delete().eq("id", id);
      if (error) fail(error, "The story could not be removed.");
      const paths = [row?.path, row?.poster_path].filter(Boolean) as string[];
      if (paths.length) await hubDb.storage.from(BUCKET).remove(paths);
    },
    async attachStory(storyId, itemId) {
      const { data: st } = await hubDb.from("hub_stories").select("*").eq("id", storyId).maybeSingle();
      if (!st) throw new Error("That story is no longer in the bank.");
      const { data: cur } = await hubDb.from("hub_items").select("assets, notes, stage").eq("id", itemId).maybeSingle();
      if (!cur) throw new Error("That card no longer exists.");
      if (cur.stage === "scheduled" || cur.stage === "posted") throw new Error("That card has already been scheduled, so nothing can be added to it.");
      if (st.minors && !consentOk(st.consent, true)) throw new Error("A child appears in this, and consent is not on file yet. Record it in the story bank first.");
      let assets = (cur.assets ?? []) as StoredAsset[];
      const row: Row = {};
      if (st.path || st.url) {
        if (assets.some((a) => a.storyId === st.id)) throw new Error("That is already on this card.");
        assets = [...assets, { id: uid(), kind: "media", path: st.path ?? undefined, url: st.path ? undefined : st.url, mime: st.mime ?? "image/jpeg", name: st.title || "From the story bank", storyId: st.id, consent: st.consent, minors: st.minors }];
        if (st.poster_path && !assets.some((a) => a.kind === "cover")) assets = [...assets, { id: uid(), kind: "cover", path: st.poster_path, mime: "image/jpeg", name: "cover.jpg", storyId: st.id }];
        row.assets = assets;
      }
      if (st.words && !String(cur.notes).includes(st.words)) row.notes = `${cur.notes ? `${cur.notes}\n\n` : ""}"${st.words}" ${st.people}`.trim();
      return update(itemId, row, `Added "${st.title || "a story"}" from the story bank`);
    },
    async startFromStory(storyId) {
      const { data: st } = await hubDb.from("hub_stories").select("*").eq("id", storyId).maybeSingle();
      if (!st) throw new Error("That story is no longer in the bank.");
      if (st.minors && !consentOk(st.consent, true)) throw new Error("A child appears in this, and consent is not on file yet. Record it in the story bank first.");
      const who = await me();
      const item = await store.createItem({ title: st.title, stage: "planning", ownerId: who.id, format: st.kind === "clip" ? "reel" : "image", notes: st.credit ? `Credit: ${st.credit}` : "" });
      return store.attachStory(storyId, item.id);
    },
    async ghlPosts() {
      return (await callHub<{ posts: GhlPost[] }>("hub-ghl", { action: "posts" })).posts;
    },
    async updatePost(id, patch) {
      if (patch.caption !== undefined) {
        const stop = checkCaption(patch.caption).find((f) => f.level === "block");
        if (stop) throw new Error(`Not saved: ${stop.title.toLowerCase()}.`);
      }
      await callHub("hub-ghl", { action: "updatePost", id, ...patch });
      const post = (await store.ghlPosts()).find((p) => p.id === id);
      if (!post) throw new Error("That post is no longer on the schedule.");
      return post;
    },
    async removePost(id) {
      await callHub("hub-ghl", { action: "removePost", id });
    },
    async emails() {
      return (await callHub<{ emails: EmailCampaign[] }>("hub-ghl", { action: "emails" })).emails;
    },
    async stats() {
      return (await callHub<{ stats: Stats }>("hub-ghl", { action: "stats" })).stats;
    },
    async community() {
      // the public partner and ambassador lists, as read on the date the snapshot says; a live count comes with the community page
      return SEED_COMMUNITY;
    },
    async kit() {
      if (!(await signedIn())) return (await callHub<{ kit: Kit }>("hub-public", { action: "kit" })).kit;
      const { data, error } = await hubDb.from("hub_kit").select("*").lte("week_start", weekStart()).order("week_start", { ascending: false }).limit(1).maybeSingle();
      if (error) fail(error, "The hub could not load this week's kit.");
      return data ? { weekStart: data.week_start, askEn: data.ask_en, askEs: data.ask_es, shares: data.shares } : { weekStart: weekStart(), askEn: "", askEs: "", shares: 0 };
    },
    async saveKit(patch) {
      const cur = await store.kit();
      const week = weekStart();
      // a new week starts a fresh count of shares, and carries last week's ask until it is rewritten
      const row = { week_start: week, ask_en: patch.askEn ?? cur.askEn, ask_es: patch.askEs ?? cur.askEs, ...(cur.weekStart === week ? {} : { shares: 0 }) };
      const { error } = await hubDb.from("hub_kit").upsert(row, { onConflict: "week_start" });
      if (error) fail(error, "The kit could not be saved. Try again.");
      return store.kit();
    },
    async markShared() {
      const { shares } = await callHub<{ shares: number }>("hub-public", { action: "shared" });
      return { ...(await store.kit()), shares };
    },
    async tasks() {
      // this week, the weeks around it, and anything still open from before
      const from = mondayKey(new Date(Date.now() - 21 * 86400_000).toISOString().slice(0, 10));
      const { data, error } = await hubDb.from("hub_tasks").select("*").gte("week_start", from).order("day").order("created_at");
      if (error) fail(error, "The hub could not load the growth plan.");
      return (data ?? []).map(toTask);
    },
    async addTask(seed) {
      const me = await store.me();
      const row = { week_start: mondayKey(seed.day), day: seed.day, title: seed.title.trim(), detail: seed.detail ?? "", lever: seed.lever, owner_id: seed.ownerId ?? me.id, item_id: seed.itemId ?? null, have: seed.have ?? "", missing: seed.missing ?? "", steps: seed.steps ?? [] };
      const { data, error } = await hubDb.from("hub_tasks").insert(row).select().single();
      if (error) fail(error, "The task could not be added. Try again.");
      return toTask(data);
    },
    async saveTask(id, patch) {
      const row: Row = {};
      if (patch.title !== undefined) row.title = patch.title.trim();
      if (patch.detail !== undefined) row.detail = patch.detail;
      if (patch.lever !== undefined) row.lever = patch.lever;
      if (patch.ownerId !== undefined) row.owner_id = patch.ownerId || null;
      if (patch.itemId !== undefined) row.item_id = patch.itemId || null;
      if (patch.day !== undefined) Object.assign(row, { day: patch.day, week_start: mondayKey(patch.day) });
      if (patch.done !== undefined) Object.assign(row, { done: patch.done, done_at: patch.done ? nowIso() : null });
      if (patch.have !== undefined) row.have = patch.have;
      if (patch.missing !== undefined) row.missing = patch.missing;
      if (patch.steps !== undefined) row.steps = patch.steps;
      const { data, error } = await hubDb.from("hub_tasks").update(row).eq("id", id).select().single();
      if (error) fail(error, "The task could not be saved. Try again.");
      return toTask(data);
    },
    async deleteTask(id) {
      const { error } = await hubDb.from("hub_tasks").delete().eq("id", id);
      if (error) fail(error, "The task could not be removed. Try again.");
    },
    async videos() {
      const { data, error } = await hubDb.from("hub_videos").select("*").order("added_at", { ascending: false });
      if (error) fail(error, "The hub could not load the videos.");
      return (data ?? []).map(toVideo);
    },
    async addVideo(seed) {
      const url = seed.url.trim();
      if (!/^https?:\/\//i.test(url)) throw new Error("Paste a full link, starting with https://");
      const me = await store.me();
      const row = { ...videoRow({ group: "partner", rights: "ask", source: "", tags: [], ...seed, url, kind: seed.kind ?? videoKind(url) }), added_by: me.id };
      const { data, error } = await hubDb.from("hub_videos").insert(row).select().single();
      if (error?.code === "23505") throw new Error("That video is already in the gallery.");
      if (error) fail(error, "The video could not be added. Try again.");
      return toVideo(data);
    },
    async saveVideo(id, patch) {
      const { data, error } = await hubDb.from("hub_videos").update(videoRow(patch)).eq("id", id).select().single();
      if (error) fail(error, "The video could not be saved. Try again.");
      return toVideo(data);
    },
    async deleteVideo(id) {
      const { error } = await hubDb.from("hub_videos").delete().eq("id", id);
      if (error) fail(error, "The video could not be taken out. Try again.");
    },
    async inbox() {
      const out = await callHub<{ threads: Thread[]; counts?: InboxCounts }>("hub-ghl", { action: "inbox" });
      return { threads: out.threads ?? [], counts: out.counts, live: true };
    },
    async threadMessages(t) {
      const out = await callHub<{ messages: ThreadMessage[] }>("hub-ghl", { action: "thread", kind: t.kind, id: t.id, channel: t.channel });
      // a comment's replies come back on their own, so the comment itself goes first
      const lead: ThreadMessage[] = t.kind === "comment" ? [{ id: t.id, at: t.at, from: "them", who: t.who, text: t.preview }] : [];
      return [...lead, ...(out.messages ?? [])];
    },
    async reply(t, text) {
      const out = await callHub<{ message: ThreadMessage }>("hub-ghl", { action: "reply", kind: t.kind, id: t.id, channel: t.channel, contactId: t.contactId, subject: t.subject, text });
      return out.message;
    },
    async pledges() {
      const [days, sources] = await Promise.all([hubDb.rpc("hub_pledges", { _days: 60 }), hubDb.rpc("hub_pledge_sources", { _days: 30 })]);
      if (days.error) fail(days.error, "The hub could not read the pledges.");
      return {
        read: nowIso(),
        days: ((days.data ?? []) as Row[]).map((d): PledgeDay => ({ day: String(d.day), people: Number(d.people), acts: Number(d.acts), orgs: Number(d.orgs), spanish: Number(d.spanish) })),
        sources: ((sources.data ?? []) as Row[]).map((x): PledgeSource => ({ source: String(x.source), medium: String(x.medium ?? ""), campaign: String(x.campaign ?? ""), content: String(x.content ?? ""), people: Number(x.people), acts: Number(x.acts) })),
      };
    },
    async emailTags() {
      return (await callHub<{ tags: { id: string; name: string }[] }>("hub-ghl", { action: "emailTags" })).tags ?? [];
    },
    async audience(include, exclude) {
      const out = await callHub<{ count: number }>("hub-ghl", { action: "audience", include, exclude });
      return { count: out.count ?? 0, exact: true };
    },
    async sendNewsletter(itemId, lang, html, opts) {
      return await callHub<{ count: number; when: string }>("hub-ghl", { action: "sendNewsletter", itemId, lang, html, ...opts });
    },
    async saveNewsletter(itemId, lang, html) {
      const out = await callHub<{ templateId: string; campaignId?: string }>("hub-ghl", { action: "newsletter", itemId, lang, html });
      return out;
    },
    async reset() {
      meCache = null;
    },
  };
  return store;
}

/** Used by Settings: add someone by email, change their role, or take them out. Admins only; the database checks. */
export const team = {
  async add(email: string, name: string, role: Member["role"], color: string) {
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error("That does not look like an email address.");
    const { error } = await hubDb.from("hub_members").insert({ email: clean, name: name.trim(), role, color });
    if (error?.code === "23505") throw new Error("That email is already in the hub.");
    if (error) fail(error, "Only a hub admin can add people.");
  },
  async setRole(id: string, role: Member["role"]) {
    const { data, error } = await hubDb.from("hub_members").update({ role }).eq("id", id).select("id");
    if (error || !data?.length) fail(error, "Only a hub admin can change roles.");
  },
  async remove(id: string) {
    const { data, error } = await hubDb.from("hub_members").delete().eq("id", id).select("id");
    if (error || !data?.length) fail(error, "Only a hub admin can remove people.");
  },
  async emails(): Promise<Record<string, string>> {
    const { data } = await hubDb.from("hub_members").select("id, email");
    return Object.fromEntries((data ?? []).map((r) => [r.id, r.email]));
  },
};

export type { Stage };
