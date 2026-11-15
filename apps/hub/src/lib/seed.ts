// Preview data. Accounts, posts and statistics are real, read from HighLevel on 15 November 2026
// (read only). The week's plan itself lives outside the repository (see below). There are no
// made-up messages or examples in here: what is not known yet is left empty or said plainly.

import community from "./seed-community.json";
import posts from "./seed-posts.json";
import hubPrivate from "virtual:hub-private";
import type { Account, Brief, Community, EmailCampaign, GhlPost, InboxCounts, Item, Kit, Member, Story, Suggestion, Task } from "./types";

const GOOGLE = "https://storage.googleapis.com/highlevel-backend.appspot.com/social-media-posting/profile-picture";
const FILES = "https://files.leadconnectorhq.com/file";

export const SEED_ACCOUNTS: Account[] = [
  { id: "6aa3ded5b925ce46df430ffd_LKWlTUbJwER3Aj9HbawG_1189271880946451_page", platform: "facebook", name: "Kindness Forward", kind: "page", avatar: `${GOOGLE}/facebook/pages/1189271880946451.jpg`, expiresAt: "2027-01-10T12:06:34Z" },
  { id: "6ae22266225d2a02f8a74150_LKWlTUbJwER3Aj9HbawG_1155579644316313_page", platform: "facebook", name: "Pasalo Pa'Lante: Pass Kindness Forward", kind: "page", avatar: `${GOOGLE}/facebook/pages/1155579644316313.jpg`, expiresAt: "2027-01-08T21:01:51Z" },
  { id: "6ae22266225d2a02f8a74150_LKWlTUbJwER3Aj9HbawG_159487337244972_page", platform: "facebook", name: "Te Amo PR", kind: "page", avatar: `${GOOGLE}/facebook/page/159487337244972.jpg`, expiresAt: "2027-01-08T21:01:51Z" },
  { id: "6aa3dc00441fbd342d50efe4_LKWlTUbJwER3Aj9HbawG_17841436921889307", platform: "instagram", name: "passkindnessforward", kind: "profile", avatar: `${GOOGLE}/instagram/profile/17841436921889307.jpg`, expiresAt: "2027-01-10T03:06:35Z" },
  { id: "6ae22282668fa353b3494e85_LKWlTUbJwER3Aj9HbawG_17841423462192450", platform: "instagram", name: "joinpasa", kind: "profile", avatar: `${GOOGLE}/instagram/profile/17841423462192450.jpg`, expiresAt: "2027-01-09T19:50:04Z" },
  { id: "6ae22282668fa353b3494e85_LKWlTUbJwER3Aj9HbawG_17841457679163212", platform: "instagram", name: "te.amo_pr", kind: "profile", avatar: `${GOOGLE}/instagram/profile/17841457679163212.jpg`, expiresAt: "2027-01-09T19:50:04Z" },
  { id: "6ada42e90a959567ead58f62_LKWlTUbJwER3Aj9HbawG_144038172_page", platform: "linkedin", name: "Kindness Forward", kind: "page", avatar: `${GOOGLE}/linkedin/page/144038172.jpg`, expiresAt: "2027-01-10T12:06:18Z" },
  { id: "6aa3dc544eddf644b909c56c_LKWlTUbJwER3Aj9HbawG_UMYtLXb_WS_profile", platform: "linkedin", name: "Pass Kindness Forward", kind: "profile", expiresAt: "2027-01-10T04:08:09Z" },
  { id: "6aa3dc8a441fbd342d514e55_LKWlTUbJwER3Aj9HbawG_000xtQuDoTwpRgtae4lbRKLb4B3RMKzIgaE_business", platform: "tiktok", name: "kindnessforward", kind: "business", expiresAt: "2027-09-11T10:43:41Z" },
  { id: "6aa3dcd0d1f553cef22f73d5_LKWlTUbJwER3Aj9HbawG_UC2vk63vLFjSt-lgUhqFjr3Q_profile", platform: "youtube", name: "Pass Kindness Forward", kind: "channel" },
  { id: "6aa3dca5a8dc84974f9b81d0_LKWlTUbJwER3Aj9HbawG_1135892474674865031_profile", platform: "pinterest", name: "kindnessforward", kind: "profile", avatar: `${GOOGLE}/pinterest/profile/1135892474674865031.jpg`, expiresAt: "2026-11-28T04:01:21Z" },
];

// The team, for the preview. The live hub uses the people added in Settings.
export const SEED_MEMBERS: Member[] = [
  { id: "m-simone", name: "Simone", role: "admin", color: "#d81b60" },
  { id: "m-edith", name: "Edith", role: "approver", color: "#00a3e0" },
  { id: "m-rohini", name: "Rohini", role: "approver", color: "#f37023" },
  { id: "m-mark", name: "Mark", role: "member", color: "#0e234b" },
  { id: "m-dee", name: "Dee", role: "member", color: "#fdb813" },
];

export const SEED_POSTS = posts as GhlPost[];

export const SEED_EMAILS: EmailCampaign[] = [
  { id: "6af45dd6da903a5ecf5e358e", name: "11.11 1hr before event - Puerto Rico", status: "scheduled", at: "2026-11-11T14:11:00Z" },
  { id: "6af45b1ccef83416e7ed319e", name: "11.11 1hr before event - PKF", status: "processing", at: "2026-11-11T14:11:00Z" },
  { id: "6af3614f6be94bd98788524b", name: "11.11 1 day before event - Puerto Rico PPL x TAP resend-unopened", status: "sent", at: "2026-11-11T12:08:20Z" },
  { id: "6af35b543f62ac8f7f345150", name: "11.11 1 day before event - Puerto Rico PPL x TAP", status: "sent", at: "2026-11-10T20:55:13Z" },
  { id: "6af35b476be94bd987875817", name: "11.11 1 day before event - PKF resend-unopened", status: "sent", at: "2026-11-11T08:29:44Z" },
  { id: "6af352a2336730c93f05be82", name: "11.11 1 day before event - PKF", status: "sent", at: "2026-11-10T20:44:20Z" },
  { id: "6af221bf3ae453d49e8c07b8", name: "TeAmo PR + PP Newsletter resend-unopened", status: "sent", at: "2026-11-10T17:14:31Z" },
  { id: "6af21e1675dbbf86153e4af7", name: "TeAmo PR + PP Newsletter", status: "sent", at: "2026-11-09T19:41:00Z" },
  { id: "6af206438672a79fd96b1d30", name: "PKF 11.11 Newsletter (nov10)", status: "sent", at: "2026-11-09T19:22:48Z" },
];

const now = "2026-11-15T16:00:00Z";

// This week's plan (the cards, the brief, the growth tasks and the kit) is the team's own working
// document, so it is not kept in this public repository. The preview reads it from
// src/private/plan.json, which git ignores; the live hub keeps it in its database, loaded with
// `node tools/hub.mjs import`. A fresh checkout without that file simply starts with an empty week.
type PreviewPlan = { cards: Item[]; tasks: Task[]; briefs: Brief[]; kit: Kit; emailTags?: { id: string; name: string; count: number }[] };
const PRIVATE_PLAN = (hubPrivate.plan ?? undefined) as PreviewPlan | undefined;

export const SEED_ITEMS: Item[] = PRIVATE_PLAN?.cards ?? [];
export const SEED_BRIEFS: Brief[] = PRIVATE_PLAN?.briefs ?? [];
export const SEED_TASKS: Task[] = PRIVATE_PLAN?.tasks ?? [];
/** Contact tags with how many have an email, for the preview's send dialog (live, HighLevel counts exactly). */
export const SEED_EMAIL_TAGS = PRIVATE_PLAN?.emailTags ?? [];
export const SEED_KIT: Kit = PRIVATE_PLAN?.kit ?? { weekStart: "2026-11-16", askEn: "", askEs: "", shares: 0 };

// Nothing has come in through the suggestion box or the kit page yet.
export const SEED_SUGGESTIONS: Suggestion[] = [];

// The public partner list and ambassador directory, read on 11 November 2026 the same way the
// website reads them. Organisation names and counts only: no personal details are kept here.
export const SEED_COMMUNITY = community as unknown as Community;

export const SEED_NOW = now;

// How many conversations in HighLevel were waiting for an answer (the last message was theirs),
// read on 15 November 2026. Counts only: the messages themselves stay in HighLevel.
export const SEED_INBOX_COUNTS: InboxCounts = { at: "2026-11-15T20:30:00Z", waiting: { email: 34, instagram: 53, facebook: 5 }, unread: 97 };

// The story bank's opening entries. The files are real: frames from Kindness Forward's own
// footage (kept out of the public repository) and the Daaji reel. Who is in the photos and
// whether they agreed has not been recorded yet, so each one says so.
const story = (s: Omit<Story, "addedBy" | "addedAt">): Story => ({ addedBy: "m-simone", addedAt: "2026-11-10T16:00:00Z", ...s });

export const SEED_STORIES: Story[] = [
  story({
    id: "st-daaji",
    kind: "clip",
    title: "Daaji's message for 11.11",
    url: `${FILES}/6af38e952962a23219e8751b/daaji-story.mp4`,
    mime: "video/mp4",
    poster: `${FILES}/6af38f71ddcd97ce5ab624bd/daaji-story-cover.jpg`,
    words: "Without kindness in our heart, I think we can go nowhere.",
    people: "Daaji",
    source: "Sent by Heartfulness for the Global Kindness Broadcast",
    partner: "The Heartfulness Movement",
    country: "India",
    tags: ["11.11", "meditation", "partner"],
    consent: "partner",
    consentNote: "Sent to us to share for 11.11. Ask Heartfulness again before using it for anything else.",
    credit: "Heartfulness",
  }),
  story({ id: "st-sea", kind: "photo", title: "Two friends by the sea", url: "/stories/sea.jpg", mime: "image/jpeg", people: "Not recorded yet", source: "Kindness Forward footage, shared drive", country: "Puerto Rico", tags: ["joy", "friends", "outdoors"], consent: "unknown" }),
  story({ id: "st-rose", kind: "photo", title: "Roses for a woman and a girl", url: "/stories/rose.jpg", mime: "image/jpeg", people: "Not recorded yet", source: "Kindness Forward footage, shared drive", country: "Puerto Rico", tags: ["giving", "flowers"], consent: "unknown", minors: true }),
  story({ id: "st-plaza", kind: "photo", title: "A hug in the plaza", url: "/stories/plaza.jpg", mime: "image/jpeg", people: "Not recorded yet", source: "Kindness Forward footage, shared drive", country: "Puerto Rico", tags: ["hug", "street"], consent: "unknown" }),
  story({ id: "st-heart", kind: "photo", title: "Holding the green heart", url: "/stories/heart.jpg", mime: "image/jpeg", people: "Not recorded yet", source: "Kindness Forward footage, shared drive", tags: ["heart", "portrait"], consent: "unknown" }),
  story({ id: "st-hill", kind: "photo", title: "The painted hillside", url: "/stories/hill.jpg", mime: "image/jpeg", people: "Nobody is shown", source: "Kindness Forward footage, shared drive", country: "Puerto Rico", tags: ["place", "colour"], consent: "not-needed" }),
  story({ id: "st-workshop", kind: "photo", title: "In the sewing workshop", url: "/stories/workshop.jpg", mime: "image/jpeg", people: "Not recorded yet", source: "Kindness Forward footage, shared drive", tags: ["work", "craft"], consent: "unknown" }),
];
