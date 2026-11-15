import { describe, expect, it } from "vitest";
import { accountLang, buildPosts, cannotSchedule, mapAccounts, mapPosts, mapStats, type HubAccount, type UploadedFile } from "../../../../supabase/functions/hub-ghl/map";

// Shapes below are cut down from real HighLevel responses (11 to 13 November 2026), with made-up ids.
const ACCOUNTS = mapAccounts({
  results: {
    accounts: [
      { id: "fb-kf", platform: "facebook", type: "page", name: "Kindness Forward", profileId: "p1", expire: "2027-01-10T15:06:41.536Z", active: true, deleted: false },
      { id: "ig-kf", platform: "instagram", type: "profile", name: "passkindnessforward", profileId: "p2", active: true, deleted: false },
      { id: "fb-pp", platform: "facebook", type: "page", name: "Pasalo Pa'Lante: Pass Kindness Forward", profileId: "p3", active: true, deleted: false },
      { id: "ig-pp", platform: "instagram", type: "profile", name: "joinpasa", profileId: "p4", active: true, deleted: false },
      { id: "pin", platform: "pinterest", type: "profile", name: "kindnessforward", profileId: "p5", active: true, deleted: false },
      { id: "tt", platform: "tiktok", type: "business", name: "kindnessforward", profileId: "p6", active: true, deleted: false },
      { id: "yt", platform: "youtube", type: "profile", name: "Pass Kindness Forward", profileId: "p7", expire: "2026-11-12T19:06:52.788Z", active: true, deleted: false },
      { id: "gone", platform: "facebook", type: "page", name: "Old page", deleted: true },
      { id: "gmb", platform: "google", type: "location", name: "A listing" },
    ],
  },
});
const by = (id: string) => ACCOUNTS.find((a) => a.id === id) as HubAccount;

const card = (over: Record<string, unknown> = {}) => ({
  id: "c1",
  title: "World Kindness Day film",
  stage: "approved",
  format: "reel" as const,
  account_ids: ["fb-kf", "ig-kf", "fb-pp", "ig-pp"],
  publish_at: "2026-12-01T15:11:00.000Z",
  caption_en: "What do you see?",
  caption_es: "¿Qué ves?",
  ...over,
});
const FILM: UploadedFile[] = [
  { kind: "media", url: "https://files.leadconnectorhq.com/file/a/film.mp4", mime: "video/mp4" },
  { kind: "cover", url: "https://files.leadconnectorhq.com/file/b/cover.jpg", mime: "image/jpeg" },
];
const NOW = Date.parse("2026-11-20T00:00:00Z");

describe("accounts", () => {
  it("keeps the connected social accounts and drops the rest", () => {
    expect(ACCOUNTS.map((a) => a.id)).toEqual(["fb-kf", "ig-kf", "fb-pp", "ig-pp", "pin", "tt", "yt"]);
  });
  it("knows which accounts post in Spanish", () => {
    expect(by("fb-pp").lang).toBe("es");
    expect(by("ig-pp").lang).toBe("es");
    expect(by("ig-kf").lang).toBe("en");
    expect(accountLang("te.amo_pr")).toBe("es");
  });
  it("does not warn about YouTube's hourly date", () => {
    expect(by("yt").expiresAt).toBeUndefined();
    expect(by("fb-kf").expiresAt).toBe("2027-01-10T15:06:41.536Z");
  });
});

describe("posts", () => {
  it("says where a waiting post is really going, and what kind it is", () => {
    const posts = mapPosts({ results: { posts: [{ _id: "x1", platform: "google", status: "scheduled", scheduleDate: "2026-11-13T15:11:00.000Z", summary: "¿Qué ves?", accountIds: ["ig-pp"], media: [{ url: "u", type: "video/mp4" }], thumbnail: "t", type: "post", instagramPostDetails: { type: "reel" } }, { _id: "x2", deleted: true, scheduleDate: "2026-11-13T15:11:00.000Z" }] } }, ACCOUNTS);
    expect(posts).toEqual([{ id: "x1", platform: "instagram", status: "scheduled", at: "2026-11-13T15:11:00.000Z", caption: "¿Qué ves?", media: [{ url: "u", type: "video/mp4" }], thumbnail: "t", type: "reel", accountIds: ["ig-pp"] }]);
  });
});

describe("statistics", () => {
  it("reads HighLevel's weekly figures", () => {
    const s = mapStats(
      {
        results: {
          dayRange: ["Fri", "Sat"],
          totals: { posts: 58, likes: 7513, followers: 189, impressions: 34441, comments: 299 },
          postPerformance: { impressions: [3225, 4577], likes: [142, 290], comments: [16, 31] },
          breakdowns: {
            posts: { total: 58, totalChange: "314.29", platforms: { facebook: { value: 26, change: "271.43" }, tiktok: { value: 2, change: "100.00" } } },
            impressions: { total: 34441, totalChange: "33.41", platforms: { facebook: { value: 3478, change: "157.63" }, tiktok: { value: 352, change: "262.89" } } },
            reach: { total: 10134, totalChange: "220.59", platforms: { facebook: { value: 1676, change: "219.24" }, tiktok: { value: 0, change: 0 } } },
            engagement: { facebook: { likes: 203, comments: 53, shares: 29, change: "295.83" }, tiktok: { likes: 18, comments: 0, shares: 1, change: 0 } },
          },
          platformTotals: { followers: { facebook: { total: 90 }, tiktok: { total: 7 } } },
          demographics: { gender: { totals: { female: { total: 386 }, male: { total: 167 } } }, age: { totals: { "25-34": 124 } } },
        },
      },
      "2026-11-06",
      "2026-11-12",
    );
    expect(s.totals).toEqual({ posts: 58, impressions: 34441, reach: 10134, likes: 7513, comments: 299, shares: 30, followers: 189 });
    expect(s.change).toEqual({ posts: 314.29, impressions: 33.41, reach: 220.59 });
    expect(s.platforms.find((p) => p.platform === "facebook")).toMatchObject({ posts: 26, reach: 1676, followers: 90, engagementChange: 295.83 });
    // TikTok does not report reach, and that must not read as nobody seeing it
    expect(s.platforms.find((p) => p.platform === "tiktok")).toMatchObject({ reach: null, reachChange: null, likes: 18 });
    expect(s.audience).toEqual({ gender: [["female", 386], ["male", 167]], age: [["25-34", 124]] });
  });
});

describe("what gets sent to HighLevel", () => {
  it("makes one post per language, each with its own caption and the cover", () => {
    const posts = buildPosts(card(), ACCOUNTS, FILM, "user-1");
    expect(posts).toHaveLength(2);
    expect(posts[0]).toMatchObject({ accountIds: ["fb-kf", "ig-kf"], summary: "What do you see?", status: "scheduled", scheduleDate: "2026-12-01T15:11:00.000Z", type: "reel", userId: "user-1", instagramPostDetails: { type: "reel" } });
    expect(posts[1]).toMatchObject({ accountIds: ["fb-pp", "ig-pp"], summary: "¿Qué ves?" });
    expect(posts[0].media).toEqual([{ url: FILM[0].url, type: "video/mp4", thumbnail: FILM[1].url, defaultThumb: "" }]);
  });
  it("gives Pinterest a post of its own when there are several images, since a pin takes one", () => {
    const six: UploadedFile[] = Array.from({ length: 6 }, (_, i) => ({ kind: "media" as const, url: `https://files.leadconnectorhq.com/file/${i}/p.png`, mime: "image/png" }));
    const posts = buildPosts(card({ format: "carousel", account_ids: ["fb-kf", "ig-kf", "pin"] }), ACCOUNTS, six, "user-1");
    expect(posts.map((p) => [p.accountIds, (p.media as unknown[]).length])).toEqual([[["fb-kf", "ig-kf"], 6], [["pin"], 1]]);
  });
  it("sends a story without a caption", () => {
    const posts = buildPosts(card({ format: "story", account_ids: ["ig-kf"] }), ACCOUNTS, FILM, "user-1");
    expect(posts[0]).toMatchObject({ summary: "", type: "story", facebookPostDetails: { type: "story" } });
  });
  it("titles a YouTube Short and opens TikTok comments", () => {
    const posts = buildPosts(card({ account_ids: ["tt", "yt"] }), ACCOUNTS, FILM, "user-1");
    expect(posts[0]).toMatchObject({ youtubePostDetails: { title: "World Kindness Day film", type: "short" }, tiktokPostDetails: { enableComment: true } });
  });
});

describe("what stops a card going out", () => {
  const stop = (over: Record<string, unknown> = {}, files = FILM) => cannotSchedule(card(over), ACCOUNTS, files, NOW);
  it("lets a complete, approved card through", () => expect(stop()).toBeNull());
  it("needs approval", () => expect(stop({ stage: "review" })).toMatch(/approved/));
  it("needs a time that is still to come", () => {
    expect(stop({ publish_at: null })).toMatch(/day and time/);
    expect(stop({ publish_at: "2026-11-19T23:59:00.000Z" })).toMatch(/passed/);
  });
  it("needs accounts that are still connected", () => {
    expect(stop({ account_ids: [] })).toMatch(/at least one account/);
    expect(stop({ account_ids: ["fb-kf", "gone"] })).toMatch(/no longer connected/);
  });
  it("needs a cover on a video", () => expect(stop({}, [FILM[0]])).toMatch(/cover/));
  it("needs a caption in each language it posts in", () => {
    expect(stop({ caption_es: " " })).toMatch(/Spanish caption/);
    expect(stop({ caption_es: " ", account_ids: ["fb-kf"] })).toBeNull();
  });
  it("keeps images off TikTok and YouTube", () => expect(stop({ format: "image", account_ids: ["tt"] }, [{ kind: "media", url: "u", mime: "image/png" }])).toMatch(/only take video/));
  it("sends emails from the email designer, not the Schedule button", () => expect(stop({ format: "email" })).toMatch(/email designer/));
});
