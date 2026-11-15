// How the screens talk to the data. One interface, two drivers:
//   - demoStore (this file): everything lives in the browser, seeded from a real snapshot.
//     Nothing is sent anywhere, so it is safe to show to anyone.
//   - a live driver (Supabase + HighLevel) plugs into the same interface later.

import { blockers, checkCaption } from "./checks";
import { SEED_EMAIL_STATS, SEED_SOCIAL_STATS } from "./seed-stats";
import { SEED_ACCOUNTS, SEED_BRIEFS, SEED_COMMUNITY, SEED_EMAILS, SEED_ITEMS, SEED_KIT, SEED_MEMBERS, SEED_POSTS, SEED_STORIES, SEED_SUGGESTIONS, SEED_TASKS } from "./seed";
import { SEED_VIDEOS } from "./seed-videos";
import hubPrivate from "virtual:hub-private";
import { videoKind } from "./videos";
import { SEED_PLEDGES } from "./seed-pledges";
import { stageMeta } from "./stages";
import { consentOk } from "./stories";
import type { Account, Asset, Brief, Community, EmailCampaign, GhlPost, InboxCounts, Item, Kit, Member, Pledges, SendOptions, Stage, Stats, Story, Suggestion, Task, Thread, ThreadMessage, Video } from "./types";
import { SEED_EMAIL_TAGS, SEED_INBOX_COUNTS } from "./seed";

export interface HubStore {
  mode: "demo" | "live";
  me(): Promise<Member>;
  members(): Promise<Member[]>;
  accounts(): Promise<Account[]>;
  items(): Promise<Item[]>;
  createItem(seed?: Partial<Item>): Promise<Item>;
  saveItem(id: string, patch: Partial<Item>): Promise<Item>;
  moveItem(id: string, stage: Stage, note?: string): Promise<Item>;
  deleteItem(id: string): Promise<void>;
  addAsset(itemId: string, file: File, kind: Asset["kind"]): Promise<Item>;
  addAssetFromBlob(itemId: string, blob: Blob, name: string, kind: Asset["kind"]): Promise<Item>;
  removeAsset(itemId: string, assetId: string): Promise<Item>;
  comment(itemId: string, text: string): Promise<Item>;
  /** Queue an approved item to go out (through HighLevel's Social Planner). */
  schedule(itemId: string): Promise<Item>;
  briefs(): Promise<Brief[]>;
  claimIdea(briefId: string, ideaId: string): Promise<Item>;
  suggestions(): Promise<Suggestion[]>;
  addSuggestion(s: { from: string; text: string; link?: string; group?: Suggestion["group"]; kind?: Suggestion["kind"]; consent?: boolean }): Promise<Suggestion>;
  resolveSuggestion(id: string, action: "accept" | "decline"): Promise<Item | null>;
  /** Keep a story someone sent us in the story bank. */
  bankSuggestion(id: string): Promise<Story>;
  stories(): Promise<Story[]>;
  addStory(seed: Partial<Story> & Pick<Story, "kind">, file?: Blob, poster?: string): Promise<Story>;
  saveStory(id: string, patch: Partial<Story>): Promise<Story>;
  deleteStory(id: string): Promise<void>;
  /** Put a story's file (or words) on a card. */
  attachStory(storyId: string, itemId: string): Promise<Item>;
  /** Start a new card from a story. */
  startFromStory(storyId: string): Promise<Item>;
  ghlPosts(): Promise<GhlPost[]>;
  /** Change the time or caption of a post that has not gone out yet. */
  updatePost(id: string, patch: { at?: string; caption?: string }): Promise<GhlPost>;
  /** Take a post that has not gone out yet off the schedule. */
  removePost(id: string): Promise<void>;
  emails(): Promise<EmailCampaign[]>;
  /** Reach, engagement and email figures, as HighLevel reports them. */
  stats(): Promise<Stats>;
  community(): Promise<Community>;
  kit(): Promise<Kit>;
  saveKit(patch: Partial<Pick<Kit, "askEn" | "askEs">>): Promise<Kit>;
  /** A partner or ambassador tapped "I shared it" on the kit page. */
  markShared(): Promise<Kit>;
  /** The growth work planned for the weeks the hub knows about. */
  tasks(): Promise<Task[]>;
  addTask(seed: Pick<Task, "title" | "day" | "lever"> & Partial<Task>): Promise<Task>;
  saveTask(id: string, patch: Partial<Task>): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  /** Every video the team has or has found. */
  videos(): Promise<Video[]>;
  addVideo(seed: Pick<Video, "title" | "url"> & Partial<Video>): Promise<Video>;
  saveVideo(id: string, patch: Partial<Video>): Promise<Video>;
  deleteVideo(id: string): Promise<void>;
  /** Messages (emails, direct messages) and comments on our posts, from HighLevel. */
  inbox(): Promise<{ threads: Thread[]; counts?: InboxCounts; live: boolean }>;
  threadMessages(t: Thread): Promise<ThreadMessage[]>;
  /** Send a reply through HighLevel. Only ever called when a person presses Send. */
  reply(t: Thread, text: string): Promise<ThreadMessage>;
  /** The contact tags a newsletter can go to. */
  emailTags(): Promise<{ id: string; name: string }[]>;
  /** How many people with an email have one of these tags and none of those. */
  audience(include: string[], exclude: string[]): Promise<{ count: number; exact: boolean }>;
  /** Send or schedule an approved newsletter through HighLevel. Approvers and admins only. */
  sendNewsletter(itemId: string, lang: "en" | "es", html: string, opts: SendOptions): Promise<{ count: number; when: string }>;
  /** Pledges made on the website: by day, and by the link that brought them. */
  pledges(): Promise<Pledges>;
  /** Save an email card's design to HighLevel as a template and a draft campaign. Nothing is sent. */
  saveNewsletter(itemId: string, lang: "en" | "es", html: string): Promise<{ templateId: string; campaignId?: string }>;
  setMe(memberId: string): Promise<Member>;
  reset(): Promise<void>;
}

const KEY = "kindness-hub-demo-v6";

// Real comments read from HighLevel for the local preview. The folder is git-ignored, so a fresh
// checkout simply has none, and the public repository never holds anyone's messages.
const SNAPSHOT = (hubPrivate.inbox ?? undefined) as { read: string; threads: Thread[]; messages: Record<string, ThreadMessage[]> } | undefined;

interface State {
  me: string;
  items: Item[];
  briefs: Brief[];
  suggestions: Suggestion[];
  /** changes made here to posts that are already scheduled */
  postEdits: Record<string, { at?: string; caption?: string }>;
  postsRemoved: string[];
  kit: Kit;
  stories: Story[];
  tasks: Task[];
  videos: Video[];
  /** replies written in the preview, kept so the thread shows them; nothing is sent */
  replies: Record<string, ThreadMessage[]>;
  answered: string[];
}

/** The Monday of the week a day falls in (YYYY-MM-DD). */
export function mondayKey(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;
const nowIso = () => new Date().toISOString();
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function fresh(): State {
  return { me: "m-simone", items: clone(SEED_ITEMS), briefs: clone(SEED_BRIEFS), suggestions: clone(SEED_SUGGESTIONS), postEdits: {}, postsRemoved: [], kit: clone(SEED_KIT), stories: clone(SEED_STORIES), tasks: clone(SEED_TASKS), videos: clone(SEED_VIDEOS), replies: {}, answered: [] };
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...fresh(), ...(JSON.parse(raw) as Partial<State>) };
  } catch {
    /* fall through to fresh */
  }
  return fresh();
}

/** Files added in the demo stay in this tab's memory (videos are too big for browser storage). */
const blobUrls = new Map<string, string>();

function fileToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export function createDemoStore(): HubStore {
  let state = load();

  const persist = () => {
    try {
      // object URLs do not survive a reload, so drop those assets from what is saved
      const saved: State = { ...state, items: state.items.map((i) => ({ ...i, assets: i.assets.filter((a) => !a.url.startsWith("blob:")) })), stories: state.stories.filter((s) => !s.url?.startsWith("blob:")) };
      localStorage.setItem(KEY, JSON.stringify(saved));
    } catch {
      /* storage full or blocked: the demo still works for this visit */
    }
  };

  const find = (id: string) => {
    const item = state.items.find((i) => i.id === id);
    if (!item) throw new Error("That card no longer exists.");
    return item;
  };

  const log = (item: Item, text: string, by = state.me) => {
    item.activity = [{ id: uid("act"), at: nowIso(), by, text }, ...item.activity];
    item.updatedAt = nowIso();
  };

  const meMember = () => SEED_MEMBERS.find((m) => m.id === state.me) ?? SEED_MEMBERS[0];

  const store: HubStore = {
    mode: "demo",
    async me() {
      return meMember();
    },
    async setMe(memberId) {
      state.me = memberId;
      persist();
      return meMember();
    },
    async members() {
      return SEED_MEMBERS;
    },
    async accounts() {
      return SEED_ACCOUNTS;
    },
    async items() {
      return clone(state.items);
    },
    async createItem(seed = {}) {
      const t = nowIso();
      const item: Item = {
        id: uid("it"),
        title: "",
        notes: "",
        stage: "idea",
        format: "reel",
        accountIds: [],
        captionEn: "",
        captionEs: "",
        assets: [],
        source: "manual",
        createdAt: t,
        updatedAt: t,
        activity: [],
        ...seed,
      };
      log(item, "Created");
      state.items = [item, ...state.items];
      persist();
      return clone(item);
    },
    async saveItem(id, patch) {
      const item = find(id);
      Object.assign(item, patch, { updatedAt: nowIso() });
      persist();
      return clone(item);
    },
    async moveItem(id, stage, note) {
      const item = find(id);
      const me = meMember();
      if (stage === item.stage) return clone(item);
      if (stage === "scheduled" || stage === "posted") throw new Error("Open the approved card and press Schedule. The hub moves it to Scheduled and Posted by itself.");
      if (stage === "approved") {
        if (me.role === "member") throw new Error("Only an approver can approve a card.");
        if (item.ownerId === me.id && me.role !== "admin") throw new Error("A second pair of eyes approves it. Ask another approver.");
        item.approvedBy = me.id;
        item.approvedAt = nowIso();
        item.needsChanges = undefined;
      } else {
        item.approvedBy = undefined;
        item.approvedAt = undefined;
      }
      if (stage === "review") item.needsChanges = undefined;
      if (note) item.needsChanges = note;
      if (stage !== "idea" && !item.ownerId) item.ownerId = me.id;
      const from = stageMeta(item.stage).label;
      item.stage = stage;
      log(item, note ? `Sent back to ${stageMeta(stage).label}: ${note}` : stage === "approved" ? "Approved" : `Moved from ${from} to ${stageMeta(stage).label}`);
      persist();
      return clone(item);
    },
    async deleteItem(id) {
      state.items = state.items.filter((i) => i.id !== id);
      for (const b of state.briefs) for (const idea of b.ideas) if (idea.itemId === id) idea.itemId = undefined;
      for (const s of state.suggestions) if (s.itemId === id) s.itemId = undefined;
      persist();
    },
    async addAsset(itemId, file, kind) {
      return store.addAssetFromBlob(itemId, file, file.name, kind);
    },
    async addAssetFromBlob(itemId, blob, name, kind) {
      const item = find(itemId);
      const small = blob.size < 1_500_000 && blob.type.startsWith("image/");
      const url = small ? await fileToDataUrl(blob) : URL.createObjectURL(blob);
      const asset: Asset = { id: uid("as"), kind, url, mime: blob.type || "application/octet-stream", name, size: blob.size };
      if (!small) blobUrls.set(asset.id, url);
      if (kind === "cover") item.assets = item.assets.filter((a) => a.kind !== "cover");
      item.assets = [...item.assets, asset];
      log(item, kind === "cover" ? "Added a cover" : `Added ${name}`);
      persist();
      return clone(item);
    },
    async removeAsset(itemId, assetId) {
      const item = find(itemId);
      const url = blobUrls.get(assetId);
      if (url) URL.revokeObjectURL(url);
      item.assets = item.assets.filter((a) => a.id !== assetId);
      item.updatedAt = nowIso();
      persist();
      return clone(item);
    },
    async comment(itemId, text) {
      const item = find(itemId);
      log(item, text);
      persist();
      return clone(item);
    },
    async schedule(itemId) {
      const item = find(itemId);
      const me = meMember();
      if (item.stage !== "approved") throw new Error("A card has to be approved before it can be scheduled.");
      if (me.role === "member") throw new Error("Only an approver can schedule a post.");
      const blocks = blockers(item);
      if (blocks.length) throw new Error(`Not sent yet: ${blocks[0].title.toLowerCase()}.`);
      item.stage = "scheduled";
      item.ghlPostId = `demo-${uid("ghl")}`;
      log(item, item.format === "email" ? "Scheduled the email (preview: nothing was really sent)" : `Scheduled for ${item.accountIds.length} account${item.accountIds.length === 1 ? "" : "s"} (preview: nothing was really posted)`);
      persist();
      return clone(item);
    },
    async briefs() {
      return clone(state.briefs);
    },
    async claimIdea(briefId, ideaId) {
      const brief = state.briefs.find((b) => b.id === briefId);
      const idea = brief?.ideas.find((i) => i.id === ideaId);
      if (!brief || !idea) throw new Error("That idea is no longer in the brief.");
      if (idea.itemId && state.items.some((i) => i.id === idea.itemId)) throw new Error("Someone has already claimed that idea.");
      const item = await store.createItem({ title: idea.title, notes: idea.why + (idea.hook ? `\n\nHook: ${idea.hook}` : ""), format: idea.format, stage: "planning", ownerId: state.me, source: "brief" });
      const real = find(item.id);
      real.activity[0].text = "Claimed from the weekly brief";
      idea.itemId = item.id;
      persist();
      return clone(real);
    },
    async suggestions() {
      return clone(state.suggestions);
    },
    async addSuggestion(s) {
      const anon = s.group === "ambassador" ? "An ambassador" : s.group === "partner" ? "A partner" : "Someone on the team";
      const sug: Suggestion = { id: uid("s"), from: s.from.trim() || anon, text: s.text.trim(), link: s.link?.trim() || undefined, at: nowIso(), status: "new", group: s.group, kind: s.kind, consent: s.consent };
      state.suggestions = [sug, ...state.suggestions];
      persist();
      return clone(sug);
    },
    async resolveSuggestion(id, action) {
      const sug = state.suggestions.find((s) => s.id === id);
      if (!sug) throw new Error("That suggestion is gone.");
      if (action === "decline") {
        sug.status = "declined";
        persist();
        return null;
      }
      const title = sug.text.length > 70 ? `${sug.text.slice(0, 67).trimEnd()}...` : sug.text;
      const consent = sug.group ? `\n\nConsent to share: ${sug.consent ? "ticked by the sender. Keep it on file before posting." : "not confirmed yet. Ask before posting."}` : "";
      const item = await store.createItem({ title, notes: `${sug.kind === "story" ? "Story from" : "Suggested by"} ${sug.from}: ${sug.text}${sug.link ? `\n${sug.link}` : ""}${consent}`, source: "suggestion", stage: "idea" });
      const real = find(item.id);
      real.activity[0].text = `Accepted from the suggestion box (from ${sug.from})`;
      sug.status = "accepted";
      sug.itemId = item.id;
      persist();
      return clone(real);
    },
    async bankSuggestion(id) {
      const sug = state.suggestions.find((s) => s.id === id);
      if (!sug) throw new Error("That message is gone.");
      const title = sug.text.length > 56 ? `${sug.text.slice(0, 53).trimEnd()}...` : sug.text;
      const st = await store.addStory({
        kind: "words",
        title,
        words: sug.text,
        people: sug.from,
        source: sug.group === "partner" ? "Sent by a partner through the kit page" : sug.group === "ambassador" ? "Sent by an ambassador through the kit page" : "Sent through the suggestion box",
        consent: sug.consent ? "partner" : "unknown",
        consentNote: sug.consent ? "The sender ticked that the people shown agreed to be shared." : undefined,
      });
      sug.status = "accepted";
      sug.storyId = st.id;
      persist();
      return st;
    },
    async stories() {
      return clone(state.stories);
    },
    async addStory(seed, file, poster) {
      let url = seed.url;
      let mime = seed.mime;
      if (file) {
        const small = file.size < 1_500_000 && file.type.startsWith("image/");
        url = small ? await fileToDataUrl(file) : URL.createObjectURL(file);
        mime = file.type || "application/octet-stream";
      }
      const st: Story = { id: uid("st"), title: "", people: "", source: "", tags: [], consent: "unknown", addedBy: state.me, addedAt: nowIso(), ...seed, url, mime, poster: poster ?? seed.poster };
      if (file && url?.startsWith("blob:")) blobUrls.set(st.id, url);
      state.stories = [st, ...state.stories];
      persist();
      return clone(st);
    },
    async saveStory(id, patch) {
      const st = state.stories.find((s) => s.id === id);
      if (!st) throw new Error("That story is no longer in the bank.");
      Object.assign(st, patch);
      // cards that use it always show the bank's current answer on consent
      for (const item of state.items) for (const a of item.assets) if (a.storyId === id) Object.assign(a, { consent: st.consent, minors: st.minors });
      persist();
      return clone(st);
    },
    async deleteStory(id) {
      const url = blobUrls.get(id);
      if (url) URL.revokeObjectURL(url);
      state.stories = state.stories.filter((s) => s.id !== id);
      persist();
    },
    async attachStory(storyId, itemId) {
      const st = state.stories.find((s) => s.id === storyId);
      if (!st) throw new Error("That story is no longer in the bank.");
      const item = find(itemId);
      if (item.stage === "scheduled" || item.stage === "posted") throw new Error("That card has already been scheduled, so nothing can be added to it.");
      if (st.minors && !consentOk(st.consent, true)) throw new Error("A child appears in this, and consent is not on file yet. Record it in the story bank first.");
      if (st.url) {
        if (item.assets.some((a) => a.storyId === st.id)) throw new Error("That is already on this card.");
        item.assets = [...item.assets, { id: uid("as"), kind: "media", url: st.url, mime: st.mime ?? "image/jpeg", name: st.title || "From the story bank", storyId: st.id, consent: st.consent, minors: st.minors }];
        if (st.poster && !item.assets.some((a) => a.kind === "cover")) item.assets = [...item.assets, { id: uid("as"), kind: "cover", url: st.poster, mime: "image/jpeg", name: "cover.jpg" }];
      }
      if (st.words && !item.notes.includes(st.words)) item.notes = `${item.notes ? `${item.notes}\n\n` : ""}"${st.words}" ${st.people}`.trim();
      log(item, `Added "${st.title || "a story"}" from the story bank`);
      persist();
      return clone(item);
    },
    async startFromStory(storyId) {
      const st = state.stories.find((s) => s.id === storyId);
      if (!st) throw new Error("That story is no longer in the bank.");
      if (st.minors && !consentOk(st.consent, true)) throw new Error("A child appears in this, and consent is not on file yet. Record it in the story bank first.");
      const item = await store.createItem({ title: st.title, stage: "planning", ownerId: state.me, format: st.kind === "clip" ? "reel" : "image", notes: st.credit ? `Credit: ${st.credit}` : "" });
      return store.attachStory(storyId, item.id);
    },
    async ghlPosts() {
      return SEED_POSTS.filter((p) => !state.postsRemoved.includes(p.id)).map((p) => ({ ...p, ...state.postEdits[p.id] }));
    },
    async updatePost(id, patch) {
      const post = SEED_POSTS.find((p) => p.id === id);
      if (!post || state.postsRemoved.includes(id)) throw new Error("That post is no longer on the schedule.");
      if (meMember().role === "member") throw new Error("Only an approver can change a scheduled post.");
      if (post.status !== "scheduled") throw new Error("This post has already gone out, so it can't be changed here.");
      if (patch.at && new Date(patch.at).getTime() < Date.now()) throw new Error("That time has already passed. Choose a time that is still to come.");
      if (patch.caption !== undefined) {
        const stop = checkCaption(patch.caption).find((f) => f.level === "block");
        if (stop) throw new Error(`Not saved: ${stop.title.toLowerCase()}.`);
      }
      state.postEdits[id] = { ...state.postEdits[id], ...patch };
      persist();
      return { ...post, ...state.postEdits[id] };
    },
    async removePost(id) {
      const post = SEED_POSTS.find((p) => p.id === id);
      if (!post) throw new Error("That post is no longer on the schedule.");
      if (meMember().role === "member") throw new Error("Only an approver can take a post off the schedule.");
      if (post.status !== "scheduled") throw new Error("This post has already gone out. To take it down, remove it on the platform itself.");
      state.postsRemoved = [...state.postsRemoved, id];
      persist();
    },
    async emails() {
      return SEED_EMAILS;
    },
    async stats() {
      return { social: SEED_SOCIAL_STATS, emails: SEED_EMAIL_STATS };
    },
    async community() {
      return SEED_COMMUNITY;
    },
    async kit() {
      return clone(state.kit);
    },
    async saveKit(patch) {
      state.kit = { ...state.kit, ...patch };
      persist();
      return clone(state.kit);
    },
    async markShared() {
      state.kit = { ...state.kit, shares: state.kit.shares + 1 };
      persist();
      return clone(state.kit);
    },
    async tasks() {
      return clone(state.tasks);
    },
    async addTask(seed) {
      const t: Task = { id: uid("tk"), weekStart: mondayKey(seed.day), detail: "", done: false, ownerId: state.me, ...seed };
      state.tasks = [...state.tasks, t];
      persist();
      return clone(t);
    },
    async saveTask(id, patch) {
      const t = state.tasks.find((x) => x.id === id);
      if (!t) throw new Error("That task no longer exists.");
      Object.assign(t, patch);
      if (patch.done !== undefined) t.doneAt = patch.done ? nowIso() : undefined;
      if (patch.day) t.weekStart = mondayKey(patch.day);
      persist();
      return clone(t);
    },
    async deleteTask(id) {
      state.tasks = state.tasks.filter((x) => x.id !== id);
      persist();
    },
    async videos() {
      return clone(state.videos);
    },
    async addVideo(seed) {
      const url = seed.url.trim();
      if (!/^https?:\/\//i.test(url)) throw new Error("Paste a full link, starting with https://");
      if (state.videos.some((v) => v.url === url)) throw new Error("That video is already in the gallery.");
      const v: Video = { id: uid("vd"), kind: videoKind(url), group: "partner", rights: "ask", source: "", tags: [], addedAt: nowIso(), ...seed, url };
      state.videos = [v, ...state.videos];
      persist();
      return clone(v);
    },
    async saveVideo(id, patch) {
      const v = state.videos.find((x) => x.id === id);
      if (!v) throw new Error("That video is no longer in the gallery.");
      Object.assign(v, patch);
      persist();
      return clone(v);
    },
    async deleteVideo(id) {
      state.videos = state.videos.filter((x) => x.id !== id);
      persist();
    },
    async inbox() {
      const threads = clone(SNAPSHOT?.threads ?? []).map((t) => (state.answered.includes(t.id) ? { ...t, waiting: false } : t));
      return { threads, counts: SEED_INBOX_COUNTS, live: false };
    },
    async threadMessages(t) {
      return [...clone(SNAPSHOT?.messages[t.id] ?? []), ...clone(state.replies[t.id] ?? [])];
    },
    async reply(t, text) {
      const body = text.trim();
      if (!body) throw new Error("Write the reply first.");
      const m: ThreadMessage = { id: uid("rp"), at: nowIso(), from: "us", who: "Preview", text: body };
      state.replies = { ...state.replies, [t.id]: [...(state.replies[t.id] ?? []), m] };
      state.answered = [...new Set([...state.answered, t.id])];
      persist();
      return clone(m);
    },
    async pledges() {
      return clone(SEED_PLEDGES);
    },
    async emailTags() {
      return SEED_EMAIL_TAGS.map(({ id, name }) => ({ id, name }));
    },
    async audience(include, exclude) {
      // the preview only knows each tag's own count, so it adds them up; live, HighLevel counts exactly
      const count = SEED_EMAIL_TAGS.filter((t) => include.includes(t.name)).reduce((n, t) => n + t.count, 0);
      return { count, exact: include.length <= 1 && exclude.length === 0 };
    },
    async sendNewsletter() {
      throw new Error("This is the preview, so nothing is sent. Once the hub is live, this sends the email through HighLevel.");
    },
    async saveNewsletter() {
      throw new Error("This is the preview, so nothing goes to HighLevel. Once the hub is live, this saves the email there as a template and a draft campaign.");
    },
    async reset() {
      for (const url of blobUrls.values()) URL.revokeObjectURL(url);
      blobUrls.clear();
      state = fresh();
      try {
        localStorage.removeItem(KEY);
      } catch {
        /* ignore */
      }
    },
  };
  return store;
}
