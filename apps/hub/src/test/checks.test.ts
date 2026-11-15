import { describe, expect, it } from "vitest";
import { allCapsWords, blockers, checkCaption, checkItem, warnings } from "@/lib/checks";
import { consentOk } from "@/lib/stories";
import { isoToPrInput, prDateKey, prInputToIso, prTime, relativeTo } from "@/lib/time";
import type { Item } from "@/lib/types";

const ids = (text: string, opts = {}) => checkCaption(text, opts).map((f) => f.id);

const base: Item = {
  id: "t",
  title: "Test",
  notes: "",
  stage: "approved",
  format: "image",
  accountIds: ["a"],
  publishAt: "2026-11-11T12:11:00Z",
  captionEn: "The world pauses for kindness. #PassKindnessForward",
  captionEs: "",
  assets: [{ id: "m", kind: "media", url: "x.png", mime: "image/png", name: "x.png" }],
  source: "manual",
  createdAt: "2026-11-10T00:00:00Z",
  updatedAt: "2026-11-10T00:00:00Z",
  activity: [],
};

describe("wording rules", () => {
  it("passes a calm, on-brand caption", () => {
    expect(ids("More than 1.1 million pledges, recognised by Official World Record. #PassKindnessForward", { needsHashtag: true })).toEqual([]);
  });

  it("stops claims we cannot stand behind", () => {
    expect(ids("A Guinness record for kindness.")).toContain("guinness");
    expect(ids("We reached 1.1 million acts of kindness.")).toContain("million-acts");
    expect(ids("Kindness is 1 in a trillion.")).toContain("trillion");
    expect(ids("We broke the record together.")).toContain("broke-record");
    expect(checkCaption("A Guinness record.").find((f) => f.id === "guinness")?.level).toBe("block");
  });

  it("does not confuse pledges with acts", () => {
    expect(ids("More than 1.1 million pledges so far.")).not.toContain("million-acts");
    expect(ids("Our goal is 1 billion acts of kindness.")).not.toContain("million-acts");
  });

  it("asks for a second look at style", () => {
    expect(ids("This is it!")).toContain("exclamation");
    expect(ids("¡Desliza para ver!")).toContain("exclamation");
    expect(ids("THIS IS IT. We are LIVE.")).toContain("caps");
    expect(ids("TAG 11 friends below.")).toContain("tag-count");
    expect(ids("Sie7e, Grammy winner.")).toContain("grammy");
    expect(ids("Sie7e, Latin Grammy winner.")).not.toContain("grammy");
    expect(ids("195 countries are participating.")).toContain("participating");
    expect(ids("195 countries are invited.")).not.toContain("participating");
  });

  it("leaves real abbreviations, hashtags and links alone", () => {
    expect(allCapsWords("11:11 AM AST with PKF and the UN. #WORLDKINDNESSDAY https://EXAMPLE.com")).toEqual([]);
    expect(allCapsWords("WE ARE LIVE now")).toEqual(["ARE", "LIVE"]);
  });

  it("asks for the public hashtag only where it is needed", () => {
    expect(ids("The world pauses.", { needsHashtag: true })).toContain("hashtag");
    expect(ids("The world pauses.")).not.toContain("hashtag");
  });
});

describe("checks on a card", () => {
  it("lets a complete card through", () => {
    expect(blockers(base)).toEqual([]);
    expect(warnings(base)).toEqual([]);
  });

  it("stops a video with no cover, but not a story", () => {
    const video = { ...base, format: "reel" as const, assets: [{ id: "v", kind: "media" as const, url: "x.mp4", mime: "video/mp4", name: "x.mp4" }] };
    expect(blockers(video).map((f) => f.id)).toContain("cover");
    expect(blockers({ ...video, format: "story" }).map((f) => f.id)).not.toContain("cover");
    const covered = { ...video, assets: [...video.assets, { id: "c", kind: "cover" as const, url: "c.jpg", mime: "image/jpeg", name: "c.jpg" }] };
    expect(blockers(covered)).toEqual([]);
  });

  it("stops a card with nothing attached, nowhere to go or no time", () => {
    expect(blockers({ ...base, assets: [] }).map((f) => f.id)).toContain("media");
    expect(blockers({ ...base, accountIds: [] }).map((f) => f.id)).toContain("accounts");
    expect(blockers({ ...base, publishAt: undefined }).map((f) => f.id)).toContain("time");
  });

  it("catches a post scheduled after the event it promotes (the AM and PM mix-up)", () => {
    const event = "2026-11-11T15:11:00Z"; // 11:11 AM in Puerto Rico
    const pm = { ...base, eventAt: event, publishAt: prInputToIso("2026-11-11T20:10") }; // 8:10 PM, meant 8:11 AM
    const am = { ...base, eventAt: event, publishAt: prInputToIso("2026-11-11T08:11") };
    expect(blockers(pm).map((f) => f.id)).toContain("time");
    expect(blockers(am)).toEqual([]);
    expect(checkItem(am).find((f) => f.id === "time")?.title).toBe("Goes out 3 hours before the event");
  });

  it("checks the Spanish caption too", () => {
    expect(warnings({ ...base, captionEs: "¡Únete!" }).map((f) => f.id)).toContain("exclamation-es");
  });
});

describe("Puerto Rico time", () => {
  it("reads typed times as Puerto Rico time, which is UTC-4 all year", () => {
    expect(prInputToIso("2026-11-11T11:11")).toBe("2026-11-11T15:11:00.000Z");
    expect(prInputToIso("2026-07-01T11:11")).toBe("2026-07-01T15:11:00.000Z");
    expect(isoToPrInput("2026-11-11T15:11:00.000Z")).toBe("2026-11-11T11:11");
    expect(prInputToIso("")).toBeUndefined();
  });

  it("shows a moment on the Puerto Rico clock and calendar", () => {
    expect(prTime("2026-11-11T15:11:00Z")).toBe("11:11 AM");
    expect(prDateKey("2026-11-12T03:11:00Z")).toBe("2026-11-11"); // 11:11 PM on the 11th in Puerto Rico
  });

  it("says how far a post is from its event", () => {
    expect(relativeTo("2026-11-11T14:11:00Z", "2026-11-11T15:11:00Z")).toEqual({ text: "1 hour before the event", after: false });
    expect(relativeTo("2026-11-11T14:41:00Z", "2026-11-11T15:11:00Z")).toEqual({ text: "30 minutes before the event", after: false });
    expect(relativeTo("2026-11-12T00:10:00Z", "2026-11-11T15:11:00Z").after).toBe(true);
  });
});

describe("consent from the story bank", () => {
  const withStory = (consent: "on-file" | "partner" | "asked" | "unknown" | "not-needed", minors = false): Item => ({
    ...base,
    assets: [{ id: "m", kind: "media", url: "x.png", mime: "image/png", name: "x.png", storyId: "st1", consent, minors }],
  });
  const consentFinding = (item: Item) => checkItem(item).find((f) => f.id === "consent");

  it("lets adults through with a recorded yes, or with material a partner sent to share", () => {
    expect(consentOk("on-file")).toBe(true);
    expect(consentOk("partner")).toBe(true);
    expect(consentOk("not-needed")).toBe(true);
    expect(consentFinding(withStory("partner"))?.level).toBe("ok");
  });

  it("asks for a second look when an adult's consent is not recorded", () => {
    expect(consentFinding(withStory("unknown"))?.level).toBe("warn");
    expect(consentFinding(withStory("asked"))?.level).toBe("warn");
    expect(blockers(withStory("unknown"))).toEqual([]);
  });

  it("stops a post that shows a child unless a written yes is on file", () => {
    expect(consentOk("partner", true)).toBe(false);
    expect(consentFinding(withStory("partner", true))?.level).toBe("block");
    expect(consentFinding(withStory("unknown", true))?.level).toBe("block");
    expect(consentFinding(withStory("on-file", true))?.level).toBe("ok");
  });

  it("says nothing about consent for files that did not come from the bank", () => {
    expect(consentFinding(base)).toBeUndefined();
  });
});
