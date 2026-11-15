// The Kindness Hub's vocabulary. Everything the screens show is one of these.

export type Stage = "idea" | "planning" | "creating" | "review" | "approved" | "scheduled" | "posted";
export type Format = "reel" | "story" | "carousel" | "image" | "video" | "email";
export type Platform = "facebook" | "instagram" | "linkedin" | "tiktok" | "youtube" | "pinterest";
export type Role = "member" | "approver" | "admin";

/** A social account connected in HighLevel's Social Planner. */
export interface Account {
  id: string;
  platform: Platform;
  name: string;
  /** page, profile or business, as HighLevel reports it */
  kind: string;
  avatar?: string;
  /** when HighLevel's connection to the account runs out and needs reconnecting */
  expiresAt?: string;
}

export interface Member {
  id: string;
  name: string;
  role: Role;
  /** a brand colour for the avatar */
  color: string;
}

export interface Asset {
  id: string;
  kind: "media" | "cover";
  url: string;
  mime: string;
  name: string;
  size?: number;
  /** set when the file came from the story bank */
  storyId?: string;
  /** the story's consent at the time, kept in step with the bank */
  consent?: Consent;
  minors?: boolean;
}

export interface Activity {
  id: string;
  at: string;
  /** a member id, or "hub" for things the hub did by itself */
  by: string;
  text: string;
}

/** One piece of content moving through the pipeline. */
export interface Item {
  id: string;
  title: string;
  notes: string;
  stage: Stage;
  format: Format;
  ownerId?: string;
  accountIds: string[];
  /** when it goes out (ISO, UTC) */
  publishAt?: string;
  /** the moment it promotes, if any (ISO, UTC). Used to catch posts scheduled after their own event. */
  eventAt?: string;
  captionEn: string;
  captionEs: string;
  /** emails only: the subject line */
  subject?: string;
  /** emails only: the newsletter as designed in the hub */
  design?: NewsletterDesign;
  /** offered to partners and ambassadors in the weekly kit */
  inKit?: boolean;
  assets: Asset[];
  approvedBy?: string;
  approvedAt?: string;
  /** set when a reviewer sends it back */
  needsChanges?: string;
  ghlPostId?: string;
  source: "brief" | "suggestion" | "manual" | "highlevel";
  createdAt: string;
  updatedAt: string;
  activity: Activity[];
}

export interface BriefIdea {
  id: string;
  title: string;
  why: string;
  format: Format;
  hook?: string;
  /** set once someone claims it */
  itemId?: string;
}

/** The Monday brief: what's coming, what worked, and what to make. */
export interface Brief {
  id: string;
  /** the Monday of the week (YYYY-MM-DD) */
  weekStart: string;
  headline: string;
  summary: string;
  dates: { date: string; label: string; note?: string }[];
  formats: { title: string; body: string }[];
  ideas: BriefIdea[];
  /** the week's goal in one sentence */
  goal?: string;
}

/** The kinds of work that grow reach, besides making the posts themselves. */
export type Lever = "post" | "engage" | "trend" | "partners" | "collab" | "email" | "website" | "review";

/** One step of a task, with where to do it. A link starting with "/" opens inside the hub. */
export interface TaskStep {
  text: string;
  link?: string;
  linkLabel?: string;
}

/** One piece of growth work for a day of the week, ticked off by whoever owns it. */
export interface Task {
  id: string;
  /** the Monday of the week (YYYY-MM-DD) */
  weekStart: string;
  /** the day it is planned for (YYYY-MM-DD) */
  day: string;
  title: string;
  /** why it matters, in a sentence or two */
  detail: string;
  lever: Lever;
  ownerId?: string;
  /** a card this work is about */
  itemId?: string;
  done: boolean;
  doneAt?: string;
  /** what already exists for this, and where it is */
  have?: string;
  /** what does not exist yet, so nobody goes looking for it */
  missing?: string;
  /** how to do it, one step at a time */
  steps?: TaskStep[];
}

/** Where a video came from, which decides how freely it can be used. */
export type VideoGroup = "ours" | "partner" | "press" | "event" | "reference";

/**
 * What the team may do with a video.
 *   ours   made by us, free to use
 *   ask    someone else's: ask them before reusing any of it
 *   share  someone else's: link to it or share the post, but do not cut it into ours
 *   no     keep out of our posts (for example, it looks AI-generated)
 */
export type VideoRights = "ours" | "ask" | "share" | "no";

/** One video the team has or has found, kept in one place so it can be found again. */
export interface Video {
  id: string;
  title: string;
  /** a file to play, or the page where it lives */
  url: string;
  /** how it plays: a file plays here, the others open where they live */
  kind: "file" | "youtube" | "instagram" | "facebook" | "tiktok" | "linkedin" | "drive" | "link";
  group: VideoGroup;
  rights: VideoRights;
  /** who made or posted it */
  source: string;
  /** when it was made or posted (YYYY-MM-DD) */
  date?: string;
  /** length in seconds, measured the first time it plays here if not known */
  seconds?: number;
  orientation?: "vertical" | "horizontal" | "square";
  lang?: "en" | "es" | "both" | "none";
  /** a still to show before it plays */
  poster?: string;
  /** whether people can be recognised in it, and whether they agreed */
  people?: "agreed" | "check" | "none";
  notes?: string;
  tags: string[];
  /** cards it has gone out on */
  itemIds?: string[];
  addedAt: string;
}

export interface Suggestion {
  id: string;
  from: string;
  text: string;
  link?: string;
  at: string;
  status: "new" | "accepted" | "declined";
  itemId?: string;
  /** who it came from. Left out for the team itself. */
  group?: "partner" | "ambassador";
  /** an idea for a post, a story to tell, or a date for the calendar */
  kind?: "idea" | "story" | "date";
  /** the sender ticked that the people shown agreed to be shared */
  consent?: boolean;
  /** set once it has been saved to the story bank */
  storyId?: string;
}

/** A post as HighLevel has it (scheduled or published). */
export interface GhlPost {
  id: string;
  platform: string;
  status: string;
  at: string;
  caption: string;
  media: { url: string; type: string }[];
  thumbnail?: string | null;
  /** post, story or reel */
  type: string;
  accountIds: string[];
}

export interface EmailCampaign {
  id: string;
  name: string;
  status: string;
  at: string;
}

/** An organisation on the public partner list. */
export interface PartnerOrg {
  name: string;
  category: string;
}

/** The public partner list and ambassador directory, as counts and organisation names. */
export interface Community {
  snapshot: string;
  partners: PartnerOrg[];
  /** how many different spellings of a category the source list uses */
  rawCategories: number;
  ambassadors: { total: number; countries: [string, number][]; roles: [string, number][] };
}

/** What partners and ambassadors are asked to do this week. */
export interface Kit {
  weekStart: string;
  askEn: string;
  askEs: string;
  /** how many people tapped "I shared it" */
  shares: number;
}

/** One platform's week, as HighLevel's statistics report it. A null means the platform does not report that figure. */
export interface PlatformStats {
  platform: Platform;
  posts: number;
  impressions: number;
  reach: number | null;
  likes: number;
  comments: number;
  shares: number;
  /** new followers in the period */
  followers: number;
  /** percentage change against the period before */
  impressionsChange: number | null;
  reachChange: number | null;
  engagementChange: number | null;
}

export interface SocialStats {
  start: string;
  end: string;
  days: string[];
  totals: { posts: number; impressions: number; reach: number; likes: number; comments: number; shares: number; followers: number };
  change: { posts: number; impressions: number; reach: number };
  daily: { impressions: number[]; likes: number[]; comments: number[] };
  platforms: PlatformStats[];
  audience: { gender: [string, number][]; age: [string, number][] };
}

export interface EmailStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  unsubscribed: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

export interface Stats {
  social: SocialStats;
  /** keyed by email campaign id */
  emails: Record<string, EmailStats>;
}

/**
 * Whether the people in a story have agreed to be shared.
 *   on-file     a written yes is kept somewhere the team can find
 *   partner     a partner or ambassador sent it to us to post
 *   asked       we asked and are waiting
 *   unknown     nobody has recorded it yet
 *   not-needed  no person can be recognised in it
 */
export type Consent = "on-file" | "partner" | "asked" | "unknown" | "not-needed";

/** One real moment in the story bank: a clip, a photo, or someone's words. */
export interface Story {
  id: string;
  kind: "clip" | "photo" | "words";
  title: string;
  url?: string;
  mime?: string;
  /** a still to stand for a clip */
  poster?: string;
  /** a quote, or a story someone wrote to us */
  words?: string;
  /** who is in it */
  people: string;
  /** where it came from */
  source: string;
  partner?: string;
  country?: string;
  tags: string[];
  consent: Consent;
  /** where the consent is kept, or what was agreed */
  consentNote?: string;
  /** a child can be recognised in it */
  minors?: boolean;
  /** how to credit it */
  credit?: string;
  addedBy: string;
  addedAt: string;
}

/** A newsletter block. Text blocks carry both languages, so one design makes both emails. */
export type NewsletterBlock =
  | { id: string; type: "heading"; en: string; es: string }
  | { id: string; type: "text"; en: string; es: string }
  | { id: string; type: "act"; en: string; es: string }
  | { id: string; type: "quote"; en: string; es: string; who: string }
  | { id: string; type: "number"; value: string; en: string; es: string }
  | { id: string; type: "image"; url: string; alt: string }
  | { id: string; type: "button"; en: string; es: string; url: string; urlEs?: string }
  | { id: string; type: "divider" };

export interface NewsletterDesign {
  subject: { en: string; es: string };
  /** the line inboxes show after the subject */
  preview: { en: string; es: string };
  fromName: { en: string; es: string };
  fromEmail: { en: string; es: string };
  blocks: NewsletterBlock[];
  /** set once it has been saved to HighLevel, per language */
  saved?: { en?: SavedEmail; es?: SavedEmail };
}

/** One language of a newsletter, once it is in HighLevel, and once it has been sent. */
export interface SavedEmail {
  templateId: string;
  campaignId?: string;
  at: string;
  sent?: { at: string; when: string; count: number; include: string[]; exclude: string[]; resendHours: number; by: string };
}

/** Who a newsletter goes to, and when. */
export interface SendOptions {
  include: string[];
  exclude: string[];
  /** an ISO time, or "now" */
  when: string;
  resendHours: number;
}

/** Where a message or comment came in. */
export type Channel = "email" | "instagram" | "facebook" | "tiktok" | "linkedin" | "youtube" | "chat" | "other";

/** A conversation (an email or a direct message) or a comment on one of our posts. */
export interface Thread {
  id: string;
  kind: "message" | "comment";
  channel: Channel;
  /** our account it came to */
  account?: string;
  /** who wrote */
  who: string;
  at: string;
  /** the latest message, shortened */
  preview: string;
  /** the last word is theirs */
  waiting: boolean;
  unread?: number;
  /** comments: the post it is on */
  post?: string;
  /** where to open it outside the hub */
  link?: string;
  /** messages: who to reply to, in HighLevel */
  contactId?: string;
  /** emails: the subject, for the reply */
  subject?: string;
  /** a reply the team has drafted */
  suggested?: string;
  /** someone on the team, so a like is enough */
  team?: boolean;
}

export interface ThreadMessage {
  id: string;
  at: string;
  from: "us" | "them";
  who?: string;
  text: string;
}

/** How many messages are waiting, per channel, when the hub cannot read them itself. */
export interface InboxCounts {
  at: string;
  waiting: Partial<Record<Channel, number>>;
  unread: number;
}

/** One day of pledges made on the website, in Puerto Rico time. */
export interface PledgeDay {
  day: string;
  /** people who pledged */
  people: number;
  /** the acts those people pledged */
  acts: number;
  /** organisations that pledged */
  orgs: number;
  /** pledges made with the site in Spanish */
  spanish: number;
}

/** Pledges by the link or site that brought them. */
export interface PledgeSource {
  source: string;
  medium: string;
  campaign: string;
  content: string;
  people: number;
  acts: number;
}

export interface Pledges {
  read: string;
  days: PledgeDay[];
  sources: PledgeSource[];
}
