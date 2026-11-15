/* eslint-disable @typescript-eslint/no-explicit-any -- HighLevel's API answers in loosely shaped JSON */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildPosts, cannotSchedule, mapAccounts, mapPosts, mapStats, type HubAccount, type UploadedFile } from "./map.ts";
import { type Channel, commentMessages, commentThreads, mapConversation, mapMessages, replyRequest, type Thread } from "./inbox.ts";
import { canSend, pickAudience, scheduleBody } from "./send.ts";

// The Kindness Hub's only door to HighLevel. The screens never hold the HighLevel token: they
// call this with the signed-in person's own session, and this decides what that person may do.
//
//   everyone in the hub   accounts, posts, emails, stats, inbox, thread   (reading)
//                         reply        (a person answering one message or comment; it is logged)
//                         newsletter   (saves a template and a draft campaign; nothing is sent)
//                         emailTags, audience   (who a newsletter could go to: tag names and a count)
//   approvers and admins  schedule, updatePost, removePost      (posts that reach the public)
//                         sendNewsletter   (sends or schedules an approved newsletter to a list)
//
// The gateway checks that the caller's session is real (verify_jwt stays on for this function);
// the hub role is then read from the database with that same session's user id.
//
// Secrets: HUB_GHL_TOKEN (a HighLevel Private Integration token, set from the GitHub secret of
// the same name by the deploy workflow; falls back to the site's existing GHL_API_KEY),
// GHL_LOCATION_ID (already set), and optionally HUB_GHL_USER_ID (the HighLevel user that posts
// are created under; without it the first admin user in the sub-account is used).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TOKEN = Deno.env.get("HUB_GHL_TOKEN") || Deno.env.get("GHL_API_KEY");
const LOCATION = Deno.env.get("GHL_LOCATION_ID");
const BASE = "https://services.leadconnectorhq.com";
const BUCKET = "hub-media";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

/** An error whose message is written for the person using the hub, and is safe to show them. */
class Friendly extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

async function ghl(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, Version: "2021-07-28", Accept: "application/json", ...(init.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}), ...(init.headers ?? {}) },
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    console.error("HighLevel refused", init.method ?? "GET", path, res.status, text.slice(0, 500));
    // deno-lint-ignore no-explicit-any
    const said = (body as any)?.message;
    const detail = Array.isArray(said) ? said.join("; ") : typeof said === "string" ? said : "";
    if (res.status === 401 || res.status === 403) throw new Friendly("HighLevel did not accept the hub's key for this. Ask an admin to check the key's permissions.", 502);
    throw new Friendly(detail ? `HighLevel said: ${detail}` : "HighLevel could not do that just now. Try again in a minute.", 502);
  }
  return body;
}

const accounts = async (): Promise<HubAccount[]> => mapAccounts(await ghl(`/social-media-posting/${LOCATION}/accounts`));

async function posts(from: string, to: string, accts: HubAccount[]) {
  const all: unknown[] = [];
  for (let skip = 0; skip < 500; skip += 100) {
    // deno-lint-ignore no-explicit-any
    const page: any = await ghl(`/social-media-posting/${LOCATION}/posts/list`, { method: "POST", body: JSON.stringify({ type: "all", skip: String(skip), limit: "100", fromDate: from, toDate: to }) });
    const got = page?.results?.posts ?? [];
    all.push(...got);
    if (got.length < 100) break;
  }
  return mapPosts({ results: { posts: all } }, accts);
}

const GHL_APP = `https://app.gohighlevel.com/v2/location/${LOCATION}`;
const COMMENT_PLATFORMS: Channel[] = ["instagram", "facebook", "tiktok", "linkedin", "youtube"];

/** An account's id in HighLevel ends with the platform's own id, which comments are filed under. */
const originOf = (accountId: string) => accountId.replace(/^[^_]+_[^_]+_/, "").replace(/_(page|profile|business|channel)$/, "");

/** Our own accounts, by id and name, so our replies are told apart from people's comments. */
function ourselves(accts: HubAccount[]) {
  const ours = new Set<string>();
  for (const a of accts) {
    ours.add(originOf(a.id));
    if (a.name) ours.add(a.name);
  }
  return ours;
}

async function commentList(platform: Channel, originIds: string[], extra: Record<string, unknown>) {
  // deno-lint-ignore no-explicit-any
  const raw: any = await ghl(`/social-media-posting/comments/${platform}/list?locationId=${LOCATION}`, { method: "POST", body: JSON.stringify({ originIds, limit: 50, ...extra }) });
  // deno-lint-ignore no-explicit-any
  return (raw?.results?.comments ?? []) as any[];
}

/** Conversations and comments for the Inbox. A part HighLevel refuses is left out and said so. */
async function inbox(teamNames: string[]) {
  const notes: string[] = [];
  const threads: Thread[] = [];
  try {
    // deno-lint-ignore no-explicit-any
    const raw: any = await ghl(`/conversations/search?locationId=${LOCATION}&limit=100&sortBy=last_message_date&sort=desc`);
    // text messages, calls and WhatsApp stay in HighLevel itself
    // deno-lint-ignore no-explicit-any
    for (const c of (raw?.conversations ?? []) as any[]) if (!/WHATSAPP|SMS|CALL/.test(String(c.lastMessageType ?? ""))) threads.push(mapConversation(c, GHL_APP));
  } catch (e) {
    notes.push(e instanceof Friendly ? `Messages: ${e.message}` : "Messages could not be read just now.");
  }
  const accts = await accounts();
  const ours = ourselves(accts);
  const team = new Set(teamNames.map((n) => n.trim().toLowerCase().split(/\s+/)[0]).filter(Boolean));
  const to = new Date().toISOString();
  const from = new Date(Date.now() - 21 * 86_400_000).toISOString();
  let lookups = 0;
  for (const platform of COMMENT_PLATFORMS) {
    const originIds = accts.filter((a) => a.platform === platform).map((a) => originOf(a.id));
    if (!originIds.length) continue;
    try {
      const posts = (await commentList(platform, originIds, { fromDate: from, toDate: to })).filter((p) => p.isPost && Number(p.replyCount) > 0).slice(0, 15);
      const comments: Record<string, unknown[]> = {};
      const replies: Record<string, unknown[]> = {};
      for (const p of posts) {
        comments[p._id] = await commentList(platform, originIds, { parentId: p._id });
        // deno-lint-ignore no-explicit-any
        for (const c of comments[p._id] as any[]) {
          if (Number(c.replyCount) > 0 && lookups < 40) {
            lookups++;
            replies[c._id] = await commentList(platform, originIds, { parentId: c._id });
          }
        }
      }
      threads.push(...commentThreads(posts, comments, replies, ours, team));
    } catch (e) {
      notes.push(e instanceof Friendly ? `${platform} comments: ${e.message}` : `${platform} comments could not be read just now.`);
    }
  }
  threads.sort((a, b) => b.at.localeCompare(a.at));
  const waiting: Partial<Record<Channel, number>> = {};
  for (const t of threads) if (t.waiting) waiting[t.channel] = (waiting[t.channel] ?? 0) + 1;
  return { threads, counts: { at: to, waiting, unread: threads.reduce((n, t) => n + (t.unread ?? 0), 0) }, notes };
}

async function thread(kind: string, id: string, channel: Channel) {
  if (kind === "comment") {
    const accts = await accounts();
    const originIds = accts.filter((a) => a.platform === channel).map((a) => originOf(a.id));
    return commentMessages(null, await commentList(channel, originIds, { parentId: id }), ourselves(accts));
  }
  return mapMessages(await ghl(`/conversations/${encodeURIComponent(id)}/messages?limit=30`));
}

/** The sub-account's contact tags, by name. */
async function emailTags(): Promise<{ id: string; name: string }[]> {
  // deno-lint-ignore no-explicit-any
  const raw: any = await ghl(`/locations/${LOCATION}/tags`);
  // deno-lint-ignore no-explicit-any
  return ((raw?.tags ?? []) as any[]).map((t) => ({ id: String(t.id), name: String(t.name) }));
}

/** Everyone with an email and one of the included tags, minus the excluded tags. Up to 10,000 people. */
async function audienceIds(include: string[], exclude: string[]): Promise<string[]> {
  // deno-lint-ignore no-explicit-any
  const contacts: any[] = [];
  for (const tag of include) {
    // deno-lint-ignore no-explicit-any
    let after: any[] | undefined;
    for (let page = 0; page < 100; page++) {
      // deno-lint-ignore no-explicit-any
      const raw: any = await ghl(`/contacts/search`, {
        method: "POST",
        body: JSON.stringify({ locationId: LOCATION, pageLimit: 100, projection: ["id", "email", "tags"], filters: [{ field: "tags", operator: "contains", value: tag }, { field: "email", operator: "exists" }], ...(after ? { searchAfter: after } : {}) }),
      });
      // deno-lint-ignore no-explicit-any
      const batch: any[] = raw?.contacts ?? [];
      contacts.push(...batch.map((c) => ({ ...c, tags: c.tags ?? [tag] })));
      if (batch.length < 100) break;
      after = batch[batch.length - 1]?.searchAfter;
      if (!after) break;
    }
  }
  return pickAudience(contacts, { include, exclude });
}

/** Saves an email card's design to HighLevel: a template and a draft campaign, or updates the campaign it already has. */
// deno-lint-ignore no-explicit-any
async function saveToHighLevel(card: any, lang: "en" | "es", html: string, myName: string) {
  const d = card.design;
  const userId = await postingUser();
  const name = `${card.title} (${lang === "en" ? "English" : "Spanish"})`;
  const before = d.saved?.[lang];
  if (before?.campaignId) {
    await ghl(`/emails/locations/${LOCATION}/campaigns/emails/${before.campaignId}`, { method: "PATCH", body: JSON.stringify({ name, editorType: "html", editorContent: html, userId }) });
    return { templateId: before.templateId as string, campaignId: before.campaignId as string, userId };
  }
  // deno-lint-ignore no-explicit-any
  const tpl: any = await ghl(`/emails/locations/${LOCATION}/templates`, {
    method: "POST",
    body: JSON.stringify({ name, editorType: "html", editorContent: html, subjectLine: d.subject?.[lang] ?? "", previewText: d.preview?.[lang] ?? "", fromName: d.fromName?.[lang] ?? "", fromEmail: d.fromEmail?.[lang] ?? "", userId }),
  });
  const templateId = String(tpl?.id ?? tpl?.template?.id ?? "");
  let campaignId: string | undefined;
  try {
    // a draft campaign from the template
    // deno-lint-ignore no-explicit-any
    const camp: any = await ghl(`/emails/locations/${LOCATION}/campaigns/emails`, { method: "POST", body: JSON.stringify({ name, editorType: "html", templateId, editorContent: html, timeZone: "America/Puerto_Rico", userId, userName: myName }) });
    campaignId = camp?.id ? String(camp.id) : undefined;
  } catch (e) {
    console.error("draft campaign not made, template kept", e);
  }
  return { templateId, campaignId, userId };
}

async function emails() {
  // deno-lint-ignore no-explicit-any
  const raw: any = await ghl(`/emails/locations/${LOCATION}/campaigns/emails?limit=20&status=all`);
  // deno-lint-ignore no-explicit-any
  return (raw?.campaigns ?? []).filter((c: any) => !c.deleted).map((c: any) => ({ id: String(c.id), name: String(c.name ?? ""), status: String(c.status ?? ""), at: String(c.updatedAt || c.createdAt || ""), sourceId: c.sourceId ? String(c.sourceId) : undefined }));
}

async function stats(accts: HubAccount[]) {
  const profileIds = accts.map((a) => a.profileId).filter(Boolean);
  // HighLevel's default window: the seven days before today, compared with the seven before those
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end.getTime() - 7 * 86_400_000);
  const raw = await ghl(`/social-media-posting/statistics?locationId=${LOCATION}`, { method: "POST", body: JSON.stringify({ profileIds }) });
  const social = mapStats(raw, start.toISOString().slice(0, 10), new Date(end.getTime() - 86_400_000).toISOString().slice(0, 10));
  const emailStats: Record<string, unknown> = {};
  for (const c of (await emails()).filter((c: { status: string; sourceId?: string }) => c.sourceId && /sent|complete/i.test(c.status)).slice(0, 8)) {
    try {
      // deno-lint-ignore no-explicit-any
      const s: any = ((await ghl(`/emails/locations/${LOCATION}/campaigns/stats/email-campaigns/${c.sourceId}`)) as any)?.stats ?? {};
      const n = (k: string) => Number(s[k]?.count ?? s[k] ?? 0) || 0;
      const sent = n("sent") || n("total"), delivered = n("delivered"), opened = n("opened"), clicked = n("clicked");
      emailStats[c.id] = { sent, delivered, opened, clicked, unsubscribed: n("unsubscribed"), openRate: delivered ? opened / delivered : 0, clickRate: delivered ? clicked / delivered : 0, bounceRate: sent ? (n("bounced") || Math.max(0, sent - delivered)) / sent : 0 };
    } catch (e) {
      console.error("email stats skipped", c.id, e);
    }
  }
  return { social, emails: emailStats };
}

async function postingUser(): Promise<string> {
  const fixed = Deno.env.get("HUB_GHL_USER_ID");
  if (fixed) return fixed;
  // deno-lint-ignore no-explicit-any
  const raw: any = await ghl(`/users/?locationId=${LOCATION}`);
  // deno-lint-ignore no-explicit-any
  const users: any[] = raw?.users ?? [];
  const pick = users.find((u) => u?.roles?.role === "admin" && !u.deleted) ?? users.find((u) => !u?.deleted);
  if (!pick?.id) throw new Friendly("The hub could not find a HighLevel user to post as. Ask an admin to set HUB_GHL_USER_ID.", 502);
  return String(pick.id);
}

// deno-lint-ignore no-explicit-any
type Db = any;

/** Copies one of the card's files from the hub's private bucket into HighLevel's media storage, and returns HighLevel's address for it. */
async function toHighLevel(db: Db, asset: { path?: string; url?: string; name?: string; mime?: string }): Promise<string> {
  if (!asset.path) {
    if (asset.url && /^https:\/\/(files\.leadconnectorhq\.com|assets\.cdn\.filesafe\.space)\//.test(asset.url)) return asset.url;
    throw new Friendly(`"${asset.name ?? "A file"}" is not stored in the hub. Add it to the card again.`);
  }
  const { data, error } = await db.storage.from(BUCKET).download(asset.path);
  if (error || !data) throw new Friendly(`The hub could not open "${asset.name ?? "a file"}". Add it to the card again.`);
  const form = new FormData();
  form.append("file", new File([data], asset.name || asset.path.split("/").pop() || "file", { type: asset.mime || data.type }));
  form.append("hosted", "false");
  form.append("name", asset.name || "file");
  // deno-lint-ignore no-explicit-any
  const up: any = await ghl(`/medias/upload-file`, { method: "POST", body: form });
  const url = up?.url ?? up?.fileUrl;
  if (!url) throw new Friendly("HighLevel took the file but did not say where it put it. Try again in a minute.", 502);
  return String(url);
}

async function schedule(db: Db, itemId: string, me: { id: string }) {
  const { data: card, error } = await db.from("hub_items").select("*").eq("id", itemId).maybeSingle();
  if (error || !card) throw new Friendly("That card no longer exists.", 404);
  const accts = await accounts();
  const assets: { kind: "media" | "cover"; path?: string; url?: string; name?: string; mime?: string }[] = Array.isArray(card.assets) ? card.assets : [];
  const shape = assets.map((a) => ({ kind: a.kind, url: "", mime: a.mime ?? "" })) as UploadedFile[];
  const stop = cannotSchedule(card, accts, shape);
  if (stop) throw new Friendly(stop);

  const files: UploadedFile[] = [];
  for (const a of assets) files.push({ kind: a.kind, mime: a.mime ?? "", url: await toHighLevel(db, a) });
  const userId = await postingUser();
  const ids: string[] = [];
  try {
    for (const body of buildPosts(card, accts, files, userId)) {
      // deno-lint-ignore no-explicit-any
      const made: any = await ghl(`/social-media-posting/${LOCATION}/posts`, { method: "POST", body: JSON.stringify(body) });
      const id = made?.results?.post?._id;
      if (!id) throw new Friendly("HighLevel did not confirm the post. Check the planner before trying again.", 502);
      ids.push(String(id));
    }
  } catch (e) {
    // never leave half a card on the schedule: take back whatever was already queued
    for (const id of ids) await ghl(`/social-media-posting/${LOCATION}/posts/${id}`, { method: "DELETE" }).catch((x) => console.error("could not take back", id, x));
    throw e;
  }
  const line = { id: crypto.randomUUID(), at: new Date().toISOString(), by: me.id, text: `Scheduled for ${card.account_ids.length} account${card.account_ids.length === 1 ? "" : "s"}` };
  const { data: saved, error: saveError } = await db.from("hub_items").update({ stage: "scheduled", ghl_post_id: ids.join(","), activity: [line, ...(card.activity ?? [])] }).eq("id", itemId).select("*").single();
  if (saveError) throw new Friendly("The post is on HighLevel's schedule, but the card did not update. Refresh the page.", 500);
  return saved;
}

/** HighLevel replaces a post whole, so a change is sent as the post it already has, with the one thing changed. */
async function changePost(id: string, patch: { at?: string; caption?: string; status?: string }) {
  // deno-lint-ignore no-explicit-any
  const p: any = ((await ghl(`/social-media-posting/${LOCATION}/posts/${id}`)) as any)?.results?.post;
  if (!p) throw new Friendly("That post is no longer on the schedule.", 404);
  if (p.status !== "scheduled") throw new Friendly("This post has already gone out, so it can't be changed here.");
  if (patch.at && new Date(patch.at).getTime() < Date.now() + 5 * 60_000) throw new Friendly("That time has passed or is only minutes away. Choose a later one.");
  const keep: Record<string, unknown> = {};
  for (const k of ["followUpComment", "tiktokPostDetails", "linkedinPostDetails", "pinterestPostDetails", "facebookPostDetails", "instagramPostDetails", "youtubePostDetails"]) {
    if (p[k] && typeof p[k] === "object") keep[k] = Object.fromEntries(Object.entries(p[k]).filter(([, v]) => v !== null));
    else if (p[k]) keep[k] = p[k];
  }
  // deno-lint-ignore no-explicit-any
  const media = (p.media ?? []).map((m: any, i: number) => ({ url: m.url, type: m.type, ...(i === 0 && p.thumbnail ? { thumbnail: p.thumbnail, defaultThumb: "" } : {}) }));
  await ghl(`/social-media-posting/${LOCATION}/posts/${id}`, {
    method: "PUT",
    body: JSON.stringify({ ...keep, accountIds: p.accountIds, summary: patch.caption ?? p.summary ?? "", media, status: patch.status ?? "scheduled", scheduleDate: patch.at ?? p.scheduleDate, type: p.type ?? "post", userId: p.createdBy || (await postingUser()) }),
  });
  return { id, at: patch.at ?? p.scheduleDate, caption: patch.caption ?? p.summary ?? "" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  try {
    if (!TOKEN || !LOCATION) throw new Friendly("The hub is not connected to HighLevel yet. An admin needs to add its key.", 503);
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: who } = await db.auth.getUser(jwt);
    const uid = who?.user?.id;
    if (!uid) throw new Friendly("Sign in to the hub first.", 401);
    const { data: role } = await db.rpc("hub_role", { _user_id: uid });
    if (!role) throw new Friendly("You have not been added to the hub yet. Ask an admin to add your email.", 403);
    const { data: me } = await db.from("hub_members").select("id").eq("user_id", uid).maybeSingle();

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const canPublish = role === "approver" || role === "admin";
    const needPublish = () => {
      if (!canPublish) throw new Friendly("Only an approver can do that.", 403);
    };

    const { data: meRow } = await db.from("hub_members").select("id, name").eq("user_id", uid).maybeSingle();
    const myName = meRow?.name || "Someone in the hub";

    switch (action) {
      case "inbox": {
        const { data: team } = await db.from("hub_members").select("name");
        return json(await inbox((team ?? []).map((m: { name: string }) => m.name)));
      }
      case "thread":
        return json({ messages: await thread(String(body.kind ?? ""), String(body.id ?? ""), String(body.channel ?? "") as Channel) });
      case "reply": {
        const t = { kind: String(body.kind ?? ""), id: String(body.id ?? ""), channel: String(body.channel ?? "") as Channel, contactId: body.contactId ? String(body.contactId) : undefined, subject: body.subject ? String(body.subject) : undefined };
        const req = replyRequest(t, String(body.text ?? ""));
        if ("refuse" in req) throw new Friendly(req.refuse);
        const path = t.kind === "comment" ? `${req.path}?locationId=${LOCATION}` : req.path;
        await ghl(path, { method: "POST", body: JSON.stringify(req.body) });
        const text = String(body.text ?? "").trim();
        // who answered what, where the team can see it
        await db.from("hub_api_log").insert({ actor: myName, action: "create", resource: "reply", record_id: t.id, summary: `${t.channel} ${t.kind} reply: ${text.slice(0, 120)}` });
        return json({ message: { id: crypto.randomUUID(), at: new Date().toISOString(), from: "us", who: myName, text } });
      }
      case "newsletter": {
        const itemId = String(body.itemId ?? "");
        const lang = body.lang === "es" ? "es" : "en";
        const html = String(body.html ?? "");
        if (!html.includes("<html")) throw new Friendly("The email is empty.");
        const { data: card } = await db.from("hub_items").select("id, title, design, activity").eq("id", itemId).maybeSingle();
        if (!card?.design) throw new Friendly("Design the email first.");
        const out = await saveToHighLevel(card, lang, html, myName);
        const saved = { ...(card.design.saved ?? {}), [lang]: { ...(card.design.saved?.[lang] ?? {}), templateId: out.templateId, campaignId: out.campaignId, at: new Date().toISOString() } };
        const line = { id: crypto.randomUUID(), at: new Date().toISOString(), by: meRow?.id ?? "hub", text: `Saved to HighLevel (${lang === "en" ? "English" : "Spanish"}): ${out.campaignId ? "template and draft campaign" : "template"}` };
        await db.from("hub_items").update({ design: { ...card.design, saved }, activity: [line, ...(card.activity ?? [])] }).eq("id", itemId);
        return json({ templateId: out.templateId, campaignId: out.campaignId });
      }
      case "emailTags":
        return json({ tags: await emailTags() });
      case "audience": {
        const include = (Array.isArray(body.include) ? body.include : []).map(String).filter(Boolean);
        const exclude = (Array.isArray(body.exclude) ? body.exclude : []).map(String).filter(Boolean);
        if (!include.length) return json({ count: 0 });
        return json({ count: (await audienceIds(include, exclude)).length });
      }
      case "sendNewsletter": {
        const itemId = String(body.itemId ?? "");
        const lang = body.lang === "es" ? "es" : "en";
        const html = String(body.html ?? "");
        const include = (Array.isArray(body.include) ? body.include : []).map(String).filter(Boolean);
        const exclude = (Array.isArray(body.exclude) ? body.exclude : []).map(String).filter(Boolean);
        const when = body.when === "now" ? "now" : String(body.when ?? "");
        const resendHours = Math.max(0, Math.min(168, Number(body.resendHours) || 0));
        const { data: card } = await db.from("hub_items").select("id, title, stage, format, design, activity").eq("id", itemId).maybeSingle();
        if (!card || card.format !== "email") throw new Friendly("That email card is not in the Plan.");
        if (!card.design) throw new Friendly("Design the email first.");
        if (!html.includes("<html")) throw new Friendly("The email is empty.");
        const d = card.design;
        if (d.saved?.[lang]?.sent) throw new Friendly(`The ${lang === "en" ? "English" : "Spanish"} email has already been sent or scheduled.`);
        // once one language is out the card shows Scheduled; the other language can still go
        const stage = card.stage === "scheduled" ? "approved" : String(card.stage);
        const ids = await audienceIds(include, exclude);
        const refuse = canSend({ role, stage, subject: d.subject?.[lang] ?? "", fromName: d.fromName?.[lang] ?? "", fromEmail: d.fromEmail?.[lang] ?? "", count: ids.length, when, include });
        if (refuse) throw new Friendly(refuse, 403);
        const saved = await saveToHighLevel(card, lang, html, myName);
        if (!saved.campaignId) throw new Friendly("HighLevel did not make the campaign, so nothing was sent. Try again in a minute.", 502);
        // with nobody left out, send to the tags themselves; otherwise to the exact list worked out here
        const tagIds = exclude.length ? undefined : (await emailTags()).filter((t) => include.map((x) => x.toLowerCase()).includes(t.name.toLowerCase())).map((t) => t.id);
        const req = scheduleBody({
          when,
          userId: saved.userId,
          userName: myName,
          subject: d.subject?.[lang] ?? "",
          fromName: d.fromName?.[lang] ?? "",
          fromEmail: d.fromEmail?.[lang] ?? "",
          previewText: d.preview?.[lang] ?? "",
          tagIds: tagIds?.length === include.length ? tagIds : undefined,
          contactIds: ids,
          resendHours,
          resendSubject: lang === "en" ? `In case you missed it: ${d.subject?.en ?? ""}` : `Por si no lo viste: ${d.subject?.es ?? ""}`,
        });
        await ghl(`/emails/locations/${LOCATION}/campaigns/emails/${saved.campaignId}/schedule`, { method: "POST", body: JSON.stringify(req) });
        const at = new Date().toISOString();
        const sent = { at, when, count: ids.length, include, exclude, resendHours, by: myName };
        const design = { ...d, saved: { ...(d.saved ?? {}), [lang]: { ...(d.saved?.[lang] ?? {}), templateId: saved.templateId, campaignId: saved.campaignId, at, sent } } };
        const what = `${lang === "en" ? "English" : "Spanish"} email ${when === "now" ? "sent" : "scheduled"} to ${ids.length} people`;
        const line = { id: crypto.randomUUID(), at, by: meRow?.id ?? "hub", text: what };
        await db.from("hub_items").update({ design, stage: "scheduled", ghl_post_id: saved.campaignId, activity: [line, ...(card.activity ?? [])] }).eq("id", itemId);
        await db.from("hub_api_log").insert({ actor: myName, action: "create", resource: "newsletter", record_id: itemId, summary: `${what} (${include.join(", ")}${exclude.length ? `, leaving out ${exclude.join(", ")}` : ""})` });
        return json({ campaignId: saved.campaignId, count: ids.length, when });
      }
      case "accounts":
        return json({ accounts: await accounts() });
      case "posts": {
        const from = String(body.from ?? new Date(Date.now() - 14 * 86_400_000).toISOString());
        const to = String(body.to ?? new Date(Date.now() + 60 * 86_400_000).toISOString());
        return json({ posts: await posts(from, to, await accounts()) });
      }
      case "emails":
        return json({ emails: await emails() });
      case "stats":
        return json({ stats: await stats(await accounts()) });
      case "schedule":
        needPublish();
        if (!me?.id) throw new Friendly("Sign out and in again so the hub can find your name.", 409);
        return json({ item: await schedule(db, String(body.itemId ?? ""), me) });
      case "updatePost":
        needPublish();
        return json({ post: await changePost(String(body.id ?? ""), { at: body.at ? String(body.at) : undefined, caption: typeof body.caption === "string" ? body.caption : undefined }) });
      case "removePost": {
        needPublish();
        // off the schedule, but kept in HighLevel as a draft, so nothing is lost by a slip
        await changePost(String(body.id ?? ""), { status: "draft" });
        // a card that pointed at it goes back to Approved, ready to be scheduled again
        const { data: cards } = await db.from("hub_items").select("id, ghl_post_id, activity").like("ghl_post_id", `%${String(body.id)}%`);
        for (const c of cards ?? []) {
          const left = String(c.ghl_post_id).split(",").filter((x: string) => x && x !== String(body.id));
          const line = { id: crypto.randomUUID(), at: new Date().toISOString(), by: me?.id ?? "hub", text: "Taken off the schedule" };
          await db.from("hub_items").update(left.length ? { ghl_post_id: left.join(","), activity: [line, ...(c.activity ?? [])] } : { stage: "approved", ghl_post_id: null, activity: [line, ...(c.activity ?? [])] }).eq("id", c.id);
        }
        return json({ ok: true });
      }
      default:
        return json({ error: "Unknown action." }, 400);
    }
  } catch (e) {
    if (e instanceof Friendly) return json({ error: e.message }, e.status);
    console.error("hub-ghl failed", e);
    return json({ error: "Something went wrong in the hub. Try again in a minute." }, 500);
  }
});
