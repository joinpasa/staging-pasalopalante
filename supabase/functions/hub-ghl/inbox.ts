/* eslint-disable @typescript-eslint/no-explicit-any -- HighLevel's API answers in loosely shaped JSON */
// The hub's Inbox, as HighLevel has it: conversations (emails and direct messages) and comments on
// our posts, mapped to the hub's own shapes. No Deno or network code here, so it can be tested.

export type Channel = "email" | "instagram" | "facebook" | "tiktok" | "linkedin" | "youtube" | "chat" | "other";

export interface Thread {
  id: string;
  kind: "message" | "comment";
  channel: Channel;
  account?: string;
  who: string;
  at: string;
  preview: string;
  waiting: boolean;
  unread?: number;
  post?: string;
  link?: string;
  contactId?: string;
  subject?: string;
  team?: boolean;
}

export interface ThreadMessage {
  id: string;
  at: string;
  from: "us" | "them";
  who?: string;
  text: string;
}

// deno-lint-ignore no-explicit-any
type Raw = any;

/** HighLevel's message types, by the channel the hub files them under. */
export function channelOf(type: string | undefined): Channel {
  const t = String(type ?? "");
  if (/EMAIL/.test(t)) return "email";
  if (/INSTAGRAM/.test(t)) return "instagram";
  if (/FACEBOOK/.test(t)) return "facebook";
  if (/LIVE_CHAT|WEBCHAT/.test(t)) return "chat";
  return "other";
}

/** What a reply is sent as, by channel. WhatsApp and text messages are left to HighLevel itself. */
export const REPLY_TYPE: Partial<Record<Channel, string>> = { email: "Email", instagram: "IG", facebook: "FB", chat: "Live_Chat" };

/** The most a comment reply may say, per platform (HighLevel's limits). */
export const COMMENT_LIMIT: Partial<Record<Channel, number>> = { instagram: 2200, facebook: 8000, linkedin: 3000, tiktok: 150, youtube: 10000 };

const ms = (v: unknown) => (typeof v === "number" ? new Date(v).toISOString() : typeof v === "string" ? v : new Date(0).toISOString());
const short = (s: string, n = 240) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** An email's own words, without the quoted message underneath or link noise. */
export function ownWords(body: string): string {
  const lines = String(body ?? "").replace(/\r/g, "").split("\n");
  const out: string[] = [];
  for (const l of lines) {
    if (/^\s*>/.test(l)) break;
    if (/^On .+wrote:\s*$/i.test(l.trim()) || /^El .+escribió:\s*$/i.test(l.trim())) break;
    out.push(l);
  }
  return out
    .join("\n")
    .replace(/\[https?:\/\/[^\]]+\]/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** A HighLevel conversation, as one thread in the Inbox. */
export function mapConversation(c: Raw, ghlBase: string): Thread {
  const channel = channelOf(c.lastMessageType);
  return {
    id: String(c.id),
    kind: "message",
    channel,
    account: c.lastChannelAccount?.[0]?.name || c.lastChannelAccount?.[0]?.value || undefined,
    who: String(c.fullName || c.contactName || c.email || "Someone"),
    at: ms(c.lastMessageDate ?? c.dateUpdated),
    preview: short(channel === "email" ? ownWords(c.lastMessageBody ?? "") : String(c.lastMessageBody ?? "")),
    waiting: c.lastMessageDirection === "inbound",
    unread: Number(c.unreadCount ?? 0) || undefined,
    link: `${ghlBase}/conversations/conversations/${c.id}`,
    contactId: c.contactId ? String(c.contactId) : undefined,
  };
}

/** The messages of one conversation, oldest first. */
export function mapMessages(raw: Raw): ThreadMessage[] {
  const list: Raw[] = raw?.messages?.messages ?? raw?.messages ?? [];
  return list
    .filter((m) => !/ACTIVITY|INTERNAL/.test(String(m.messageType ?? "")))
    .map((m) => ({
      id: String(m.id),
      at: ms(m.dateAdded),
      from: m.direction === "outbound" ? ("us" as const) : ("them" as const),
      text: /EMAIL/.test(String(m.messageType ?? "")) ? ownWords(m.body ?? "") : String(m.body ?? ""),
    }))
    .filter((m) => m.text)
    .sort((a, b) => a.at.localeCompare(b.at));
}

/**
 * Comments on our recent posts. `posts` are the post threads HighLevel lists for our accounts;
 * `comments` maps each post thread to its top-level comments, and `replies` maps a comment to the
 * replies under it. A comment is waiting when nobody from our accounts has answered it.
 */
export function commentThreads(posts: Raw[], comments: Record<string, Raw[]>, replies: Record<string, Raw[]>, ours: Set<string>, team: Set<string>): Thread[] {
  const out: Thread[] = [];
  for (const p of posts) {
    const title = short(String(p.content ?? "").split("\n")[0] ?? "", 80);
    for (const c of comments[p._id] ?? []) {
      const author = c.author ?? {};
      if (ours.has(String(author.id)) || ours.has(String(author.name))) continue;
      const answered = (replies[c._id] ?? []).some((r: Raw) => ours.has(String(r.author?.id)) || ours.has(String(r.author?.name)));
      const handle = String(author.name ?? "").toLowerCase();
      const isTeam = [...team].some((n) => n && (handle === n || handle.startsWith(`${n}_`) || handle.startsWith(`${n}.`) || handle.startsWith(`${n} `)));
      out.push({
        id: String(c._id),
        kind: "comment",
        channel: (String(c.platform ?? p.platform) as Channel) || "other",
        account: p.author?.name,
        who: String(author.name ?? "Someone"),
        at: ms(c.publishedAt ?? c.createdAt),
        preview: short(String(c.content ?? "")),
        waiting: !answered && !isTeam,
        post: title,
        link: c.previewLink || p.previewLink,
        team: isTeam || undefined,
      });
    }
  }
  return out;
}

/** One comment and the replies under it, oldest first. */
export function commentMessages(comment: Raw | null, replies: Raw[], ours: Set<string>): ThreadMessage[] {
  const all = [...(comment ? [comment] : []), ...replies];
  return all
    .map((r) => ({
      id: String(r._id),
      at: ms(r.publishedAt ?? r.createdAt),
      from: ours.has(String(r.author?.id)) || ours.has(String(r.author?.name)) ? ("us" as const) : ("them" as const),
      who: r.author?.name ? String(r.author.name) : undefined,
      text: String(r.content ?? ""),
    }))
    .sort((a, b) => a.at.localeCompare(b.at));
}

/** The request body for a reply, or the reason it cannot be sent from the hub. */
export function replyRequest(t: { kind: string; id: string; channel: Channel; contactId?: string; subject?: string }, text: string): { path: string; body: Record<string, unknown> } | { refuse: string } {
  const words = text.trim();
  if (!words) return { refuse: "Write the reply first." };
  if (t.kind === "comment") {
    const limit = COMMENT_LIMIT[t.channel];
    if (!limit) return { refuse: "Replies to comments here work for Instagram, Facebook, LinkedIn, TikTok and YouTube." };
    if (words.length > limit) return { refuse: `That is too long for ${t.channel}: ${words.length} characters, and the limit is ${limit}.` };
    return { path: `/social-media-posting/comments/${t.channel}`, body: { parentId: t.id, isParentThread: false, content: words } };
  }
  const type = REPLY_TYPE[t.channel];
  if (!type) return { refuse: "This kind of message is answered in HighLevel itself." };
  if (!t.contactId) return { refuse: "HighLevel did not say who this came from, so reply in HighLevel." };
  if (type === "Email") {
    const html = words
      .split(/\n{2,}/)
      .map((p) => `<p>${p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</p>`)
      .join("");
    const subject = t.subject ? (/^re:/i.test(t.subject) ? t.subject : `Re: ${t.subject}`) : "Re: your message to Kindness Forward";
    return { path: "/conversations/messages", body: { type, contactId: t.contactId, html, subject } };
  }
  return { path: "/conversations/messages", body: { type, contactId: t.contactId, message: words } };
}
