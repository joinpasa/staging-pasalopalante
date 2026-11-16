/* eslint-disable @typescript-eslint/no-explicit-any -- HighLevel's API answers in loosely shaped JSON */
// Pure translations between HighLevel's shapes and the Kindness Hub's. No network and no Deno
// APIs in here, so the same file is unit-tested from the repo's own test runner (tests/hub).

export type Platform = "facebook" | "instagram" | "linkedin" | "tiktok" | "youtube" | "pinterest";
const PLATFORMS: Platform[] = ["facebook", "instagram", "linkedin", "tiktok", "youtube", "pinterest"];

export interface HubAccount {
  id: string;
  platform: Platform;
  name: string;
  kind: string;
  avatar?: string;
  expiresAt?: string;
  /** what HighLevel's statistics endpoint wants instead of the id */
  profileId?: string;
  /** which caption this account gets */
  lang: "en" | "es";
}

/** The Puerto Rico accounts post in Spanish. Everything else posts in English. */
export function accountLang(name: string): "en" | "es" {
  return /pasa|pa.?lante|te.?amo/i.test(name) ? "es" : "en";
}

// deno-lint-ignore no-explicit-any
type Any = any;

export function mapAccounts(raw: Any): HubAccount[] {
  const list: Any[] = raw?.results?.accounts ?? [];
  return list
    .filter((a) => a && !a.deleted && a.active !== false && PLATFORMS.includes(a.platform))
    .map((a) => ({
      id: String(a.id),
      platform: a.platform as Platform,
      name: String(a.name ?? ""),
      kind: String(a.type ?? ""),
      avatar: a.avatar || undefined,
      // YouTube's date rolls forward every hour while healthy, so it says nothing useful
      expiresAt: a.platform === "youtube" ? undefined : a.expire || undefined,
      profileId: a.profileId || undefined,
      lang: accountLang(String(a.name ?? "")),
    }));
}

export interface HubPost {
  id: string;
  platform: string;
  status: string;
  at: string;
  caption: string;
  media: { url: string; type: string }[];
  thumbnail?: string | null;
  type: string;
  accountIds: string[];
}

export function mapPosts(raw: Any, accounts: HubAccount[]): HubPost[] {
  const byId = new Map(accounts.map((a) => [a.id, a.platform]));
  const list: Any[] = raw?.results?.posts ?? [];
  return list
    .filter((p) => p && !p.deleted && p.status !== "deleted")
    .map((p) => {
      const accountIds: string[] = Array.isArray(p.accountIds) ? p.accountIds.map(String) : [];
      // HighLevel files every post that has not gone out yet under "google"; the accounts say where it is really going
      const platform = (accountIds.length && byId.get(accountIds[0])) || (PLATFORMS.includes(p.platform) ? p.platform : "facebook");
      const type = p.instagramPostDetails?.type || p.facebookPostDetails?.type || (p.type === "story" || p.type === "reel" ? p.type : "post");
      return {
        id: String(p._id ?? p.postId ?? ""),
        platform,
        status: String(p.status ?? ""),
        at: String(p.publishedAt || p.scheduleDate || p.displayDate || ""),
        caption: String(p.summary ?? ""),
        media: (Array.isArray(p.media) ? p.media : []).map((m: Any) => ({ url: String(m.url ?? ""), type: String(m.type ?? "") })),
        thumbnail: p.thumbnail ?? null,
        type,
        accountIds,
      };
    })
    .filter((p) => p.id && p.at);
}

const num = (v: unknown) => {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : 0;
};
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);

/** HighLevel's weekly statistics, as the hub's Results page reads them. */
export function mapStats(raw: Any, start: string, end: string) {
  const r = raw?.results ?? {};
  const b = r.breakdowns ?? {};
  const perf = r.postPerformance ?? {};
  const eng = b.engagement ?? {};
  const platforms = PLATFORMS.filter((p) => b.posts?.platforms?.[p] || b.impressions?.platforms?.[p] || eng[p]).map((p) => ({
    platform: p,
    posts: num(b.posts?.platforms?.[p]?.value),
    impressions: num(b.impressions?.platforms?.[p]?.value),
    // TikTok and Pinterest do not report reach; a zero there would read as "nobody saw it"
    reach: p === "tiktok" || p === "pinterest" ? null : num(b.reach?.platforms?.[p]?.value),
    likes: num(eng[p]?.likes),
    comments: num(eng[p]?.comments),
    shares: num(eng[p]?.shares),
    followers: num(r.platformTotals?.followers?.[p]?.total),
    impressionsChange: b.impressions?.platforms?.[p] ? num(b.impressions.platforms[p].change) : null,
    reachChange: p === "tiktok" || p === "pinterest" || !b.reach?.platforms?.[p] ? null : num(b.reach.platforms[p].change),
    engagementChange: eng[p] ? num(eng[p].change) : null,
  }));
  const gender = r.demographics?.gender?.totals ?? {};
  const age = r.demographics?.age?.totals ?? {};
  return {
    start,
    end,
    days: Array.isArray(r.dayRange) ? r.dayRange.map(String) : [],
    totals: {
      posts: num(r.totals?.posts),
      impressions: num(r.totals?.impressions),
      reach: num(b.reach?.total),
      likes: num(r.totals?.likes),
      comments: num(r.totals?.comments),
      shares: sum(platforms.map((p) => p.shares)),
      followers: num(r.totals?.followers),
    },
    change: { posts: num(b.posts?.totalChange), impressions: num(b.impressions?.totalChange), reach: num(b.reach?.totalChange) },
    daily: {
      impressions: (perf.impressions ?? []).map(num),
      likes: (perf.likes ?? []).map(num),
      comments: (perf.comments ?? []).map(num),
    },
    platforms,
    audience: {
      gender: Object.entries(gender).map(([k, v]) => [k, num((v as Any)?.total)] as [string, number]),
      age: Object.entries(age).map(([k, v]) => [k, num(v)] as [string, number]),
    },
  };
}

export interface HubCard {
  id: string;
  title: string;
  format: "reel" | "story" | "carousel" | "image" | "video" | "email";
  account_ids: string[];
  publish_at: string | null;
  caption_en: string;
  caption_es: string;
}

export interface UploadedFile {
  kind: "media" | "cover";
  url: string;
  mime: string;
  /** The file's name on the card. "-en-" or "-es-" in it ties the file to one language, and "story" makes it a story. */
  name?: string;
}

const hasWord = (name: string | undefined, words: string) => new RegExp(`(^|[^a-z])(${words})([^a-z]|$)`).test((name ?? "").toLowerCase());

/** The language a file is for, read from its name ("tolerance-es-2.png" is Spanish); null when it is for both. */
export function fileLang(name?: string): "en" | "es" | null {
  if (hasWord(name, "es|esp|espanol|español|spanish")) return "es";
  if (hasWord(name, "en|eng|english")) return "en";
  return null;
}

/** A story file riding along on a feed card, such as "tolerance-en-story.mp4". */
export function isStoryFile(name?: string): boolean {
  return hasWord(name, "story|stories|historia");
}

/** A spare cover kept on the card for reference ("...-story-cover.png", "...-reel-cover.png"). It is never posted itself. */
function isSpareCover(name?: string): boolean {
  return /(story|reel|historia)[-_ ]?(cover|portada)/i.test(name ?? "");
}

/**
 * What goes out in one language: the feed files, the cover for a video, and any story files posted alongside.
 * A file whose name says -en- or -es- goes to that language only; a file with neither goes to both.
 */
export function filesFor(card: { format: string }, files: UploadedFile[], lang: "en" | "es") {
  const mine = files.filter((f) => {
    const l = fileLang(f.name);
    return !l || l === lang;
  });
  const storyCard = card.format === "story";
  const postable = mine.filter((f) => f.kind === "media" && !isSpareCover(f.name));
  let feed = postable.filter((f) => storyCard || !isStoryFile(f.name));
  const stories = storyCard ? [] : postable.filter((f) => isStoryFile(f.name));
  const cover = mine.find((f) => f.kind === "cover" && !isStoryFile(f.name));
  // an image post whose picture is also the card's cover: that picture goes out, first
  if ((card.format === "image" || card.format === "carousel") && cover && cover.mime.startsWith("image/") && !feed.some((f) => f.url === cover.url)) {
    feed = [cover, ...feed];
  }
  return { feed, stories, cover };
}

/**
 * The posts to create in HighLevel for one approved card: one per language, because a post
 * carries a single caption for every account on it, and each language gets only its own files
 * and cover. Story files on a feed card go out as stories of their own, on Instagram and
 * Facebook. Pinterest takes one image, so it gets a post of its own when there are several.
 */
export function buildPosts(card: HubCard, accounts: HubAccount[], files: UploadedFile[], userId: string) {
  const chosen = accounts.filter((a) => card.account_ids.includes(a.id));
  const kind = card.format === "reel" ? "reel" : card.format === "story" ? "story" : "post";
  const posts: Record<string, unknown>[] = [];

  for (const lang of ["en", "es"] as const) {
    const group = chosen.filter((a) => a.lang === lang);
    if (!group.length) continue;
    const { feed: media, stories, cover } = filesFor(card, files, lang);
    const isVideo = media.some((m) => m.mime.startsWith("video/"));
    const caption = (lang === "es" ? card.caption_es : card.caption_en).trim();
    const pins = media.length > 1 ? group.filter((a) => a.platform === "pinterest") : [];
    const rest = group.filter((a) => !pins.includes(a));
    for (const [set, items] of [[rest, media], [pins, media.slice(0, 1)]] as const) {
      if (!set.length || !items.length) continue;
      const pin = set.find((a) => a.platform === "pinterest");
      posts.push({
        accountIds: set.map((a) => a.id),
        // stories carry no caption
        summary: kind === "story" ? "" : caption,
        media: items.map((m, i) => ({ url: m.url, type: m.mime, ...(i === 0 && cover && isVideo ? { thumbnail: cover.url, defaultThumb: "" } : {}) })),
        status: "scheduled",
        scheduleDate: card.publish_at,
        type: kind,
        userId,
        facebookPostDetails: { type: kind },
        instagramPostDetails: { type: kind, publishViaPushNotification: false, showOnFeed: true },
        ...(set.some((a) => a.platform === "youtube") ? { youtubePostDetails: { privacyLevel: "public", title: card.title.slice(0, 100), type: kind === "reel" ? "short" : "video" } } : {}),
        ...(set.some((a) => a.platform === "tiktok") ? { tiktokPostDetails: { privacyLevel: "PUBLIC_TO_EVERYONE", enableComment: true, enableDuet: true, enableStitch: true, promoteOtherBrand: false, promoteYourBrand: false, videoDisclosure: false } } : {}),
        ...(pin ? { pinterestPostDetails: { title: card.title.slice(0, 100), link: "" } } : {}),
      });
    }
    // story files that ride along on a feed card: one story each, where stories exist
    const storyAccounts = group.filter((a) => a.platform === "instagram" || a.platform === "facebook");
    for (const s of storyAccounts.length ? stories : []) {
      posts.push({
        accountIds: storyAccounts.map((a) => a.id),
        summary: "",
        media: [{ url: s.url, type: s.mime }],
        status: "scheduled",
        scheduleDate: card.publish_at,
        type: "story",
        userId,
        facebookPostDetails: { type: "story" },
        instagramPostDetails: { type: "story", publishViaPushNotification: false, showOnFeed: true },
      });
    }
  }
  return posts;
}

/** Why a card cannot go out yet, in plain words; null when it can. The screens check too, but this is the check that counts. */
export function cannotSchedule(card: HubCard & { stage: string }, accounts: HubAccount[], files: UploadedFile[], now = Date.now()): string | null {
  if (card.stage !== "approved") return "A card has to be approved before it can be scheduled.";
  if (card.format === "email") return "Emails go out from the email designer: open the design and press Send.";
  if (!card.publish_at) return "Set the day and time it should go out.";
  if (new Date(card.publish_at).getTime() < now + 5 * 60_000) return "That time has passed or is only minutes away. Choose a later one.";
  const chosen = accounts.filter((a) => card.account_ids.includes(a.id));
  if (!chosen.length) return "Choose at least one account.";
  if (chosen.length !== card.account_ids.length) return "One of the chosen accounts is no longer connected in HighLevel.";
  if (!files.some((f) => f.kind === "media" || (f.kind === "cover" && (card.format === "image" || card.format === "carousel")))) return "Attach the file that should go out.";
  for (const lang of ["en", "es"] as const) {
    const group = chosen.filter((a) => a.lang === lang);
    if (!group.length) continue;
    const name = lang === "en" ? "English" : "Spanish";
    const { feed: media, cover } = filesFor(card, files, lang);
    if (!media.length) return `There is no ${name} file on the card. Add one with -${lang}- in its name.`;
    const video = media.some((m) => m.mime.startsWith("video/"));
    if ((card.format === "reel" || card.format === "video") && !video) return "A reel or video needs a video file.";
    if (card.format === "reel" && media.length > 1) return `A reel takes one video, and the ${name} side has ${media.length} files.`;
    if (video && card.format !== "story" && !cover) return "Add a cover before a video goes out.";
    if (card.format !== "story" && !(lang === "es" ? card.caption_es : card.caption_en).trim()) return `The ${name} caption is empty.`;
    if (group.some((a) => (a.platform === "tiktok" || a.platform === "youtube") && !video)) return "TikTok and YouTube only take video.";
  }
  return null;
}
