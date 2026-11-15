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
}

/**
 * The posts to create in HighLevel for one approved card: one per language, because a post
 * carries a single caption for every account on it. Pinterest takes one image, so it gets a
 * post of its own when the card has more than one.
 */
export function buildPosts(card: HubCard, accounts: HubAccount[], files: UploadedFile[], userId: string) {
  const chosen = accounts.filter((a) => card.account_ids.includes(a.id));
  const media = files.filter((f) => f.kind === "media");
  const cover = files.find((f) => f.kind === "cover");
  const isVideo = media.some((m) => m.mime.startsWith("video/"));
  const kind = card.format === "reel" ? "reel" : card.format === "story" ? "story" : "post";
  const posts: Record<string, unknown>[] = [];

  for (const lang of ["en", "es"] as const) {
    const group = chosen.filter((a) => a.lang === lang);
    if (!group.length) continue;
    const caption = (lang === "es" ? card.caption_es : card.caption_en).trim();
    const pins = media.length > 1 ? group.filter((a) => a.platform === "pinterest") : [];
    const rest = group.filter((a) => !pins.includes(a));
    for (const [set, items] of [[rest, media], [pins, media.slice(0, 1)]] as const) {
      if (!set.length) continue;
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
  const media = files.filter((f) => f.kind === "media");
  if (!media.length) return "Attach the file that should go out.";
  const video = media.some((m) => m.mime.startsWith("video/"));
  if ((card.format === "reel" || card.format === "video") && !video) return "A reel or video needs a video file.";
  if (card.format === "reel" && media.length > 1) return "A reel takes one video.";
  if (video && card.format !== "story" && !files.some((f) => f.kind === "cover")) return "Add a cover before a video goes out.";
  if (card.format !== "story") {
    if (chosen.some((a) => a.lang === "en") && !card.caption_en.trim()) return "The English caption is empty.";
    if (chosen.some((a) => a.lang === "es") && !card.caption_es.trim()) return "The Spanish caption is empty.";
  }
  if (chosen.some((a) => (a.platform === "tiktok" || a.platform === "youtube") && !video)) return "TikTok and YouTube only take video.";
  return null;
}
