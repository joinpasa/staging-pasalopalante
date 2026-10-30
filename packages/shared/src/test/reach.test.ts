import { describe, expect, it } from "vitest";
import { getTranslations, loadTranslations } from "@shared/i18n/translations";
import { countWording, parseReachStats, reachRows, rippleOrdinal } from "@shared/lib/reach";

const en = getTranslations("en");
const text = (rows: ReturnType<typeof reachRows>) => rows.map((r) => `${r.count} ${r.label}`);

describe("reachRows", () => {
  it("shows the example chain: 1 direct join, 1 in the 1st ripple, 2 in the 2nd", () => {
    const rows = reachRows({ peopleReached: 4, directJoins: 1, rippleCounts: [1, 2] }, "en", en);
    expect(text(rows)).toEqual([
      "1 person has joined with your code",
      "1 person joined in your 1st ripple",
      "2 people joined in your 2nd ripple",
    ]);
  });

  it("always shows the direct-join line, in the plural for zero", () => {
    const rows = reachRows({ peopleReached: 0, directJoins: 0, rippleCounts: [] }, "en", en);
    expect(text(rows)).toEqual(["0 people have joined with your code"]);
  });

  it("skips empty ripple generations but keeps the right ordinal for the rest", () => {
    const rows = reachRows({ peopleReached: 9, directJoins: 3, rippleCounts: [2, 0, 3, 1] }, "en", en);
    expect(text(rows)).toEqual([
      "3 people have joined with your code",
      "2 people joined in your 1st ripple",
      "3 people joined in your 3rd ripple",
      "1 person joined in your 4th ripple",
    ]);
  });

  it("does not let QR-only reach show up as joins or ripples", () => {
    // 3 people reached, all via someone scanning the QR — no attributed signups.
    const rows = reachRows({ peopleReached: 3, directJoins: 0, rippleCounts: [] }, "en", en);
    expect(text(rows)).toEqual(["0 people have joined with your code"]);
  });

  it("uses the reader's language", async () => {
    const de = await loadTranslations("de");
    const rows = reachRows({ peopleReached: 3, directJoins: 1, rippleCounts: [2] }, "de", de);
    expect(text(rows)).toEqual([
      "1 Person ist deinem Code gefolgt",
      "2 Personen sind in deiner 1. Welle dazugekommen",
    ]);
  });
});

describe("countWording", () => {
  it("is singular only for exactly one", () => {
    expect(countWording(0, "person", "people")).toBe("people");
    expect(countWording(1, "person", "people")).toBe("person");
    expect(countWording(2, "person", "people")).toBe("people");
    expect(countWording(11, "person", "people")).toBe("people");
  });
});

describe("rippleOrdinal", () => {
  it("follows English ordinal rules", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101].map((n) => rippleOrdinal(n, "en", en))).toEqual([
      "1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd", "101st",
    ]);
  });

  it("uses each language's own forms", async () => {
    const fr = await loadTranslations("fr");
    expect(rippleOrdinal(1, "fr", fr)).toBe("1re");
    expect(rippleOrdinal(2, "fr", fr)).toBe("2e");
  });
});

describe("parseReachStats", () => {
  it("reads the RPC row and falls back to zeros", () => {
    expect(parseReachStats([{ people_reached: "4", direct_joins: 1, ripple_counts: ["1", 2] }])).toEqual({
      peopleReached: 4,
      directJoins: 1,
      rippleCounts: [1, 2],
    });
    expect(parseReachStats([])).toEqual({ peopleReached: 0, directJoins: 0, rippleCounts: [] });
  });
});
