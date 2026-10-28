import { describe, it, expect } from "vitest";
import { badgesForAct, badgeText, type BadgeDef } from "@shared/lib/badges";

const STAGES = [3, 7, 12, 18, 25, 33, 42, 50];

function badge(id: string, criteria: BadgeDef["criteria"], extra: Partial<BadgeDef> = {}): BadgeDef {
  return {
    id,
    kind: criteria?.type === "streak" ? "streak" : "act_type",
    sort_order: 0,
    icon: null,
    name: id,
    name_es: null,
    name_fr: null,
    name_de: null,
    description: null,
    description_es: null,
    description_fr: null,
    description_de: null,
    criteria,
    ...extra,
  };
}

// Mirrors the catalogue seeded by 20261028120000_badges_rework.sql.
const catalogue = [
  badge("streak", { type: "streak", stages: [1, 2, 3, 5, 10, 20, 50] }),
  badge("good_word", { type: "acts", modes: ["performed"], act_types: ["compliment"], stages: STAGES }),
  badge("open_hand", { type: "acts", modes: ["performed"], act_types: ["donated", "treated"], stages: STAGES }),
  badge("hug_dealer", { type: "acts", modes: ["performed", "received"], act_types: ["hug"], stages: STAGES }),
  badge("grateful_heart", { type: "acts", modes: ["received"], stages: STAGES }),
  badge("kindness_spotter", { type: "acts", modes: ["witnessed"], stages: STAGES }),
];

const ids = (act: { mode: string | null; actType: string | null }) =>
  badgesForAct(catalogue, act).map((b) => b.id);

describe("badgesForAct", () => {
  it("counts a chip only together with the mode it requires", () => {
    expect(ids({ mode: "performed", actType: "compliment" })).toEqual(["good_word"]);
    expect(ids({ mode: "received", actType: "compliment" })).toEqual(["grateful_heart"]);
  });

  it("matches any of several chips", () => {
    expect(ids({ mode: "performed", actType: "treated" })).toEqual(["open_hand"]);
  });

  it("lets one act count toward more than one badge", () => {
    expect(ids({ mode: "received", actType: "hug" })).toEqual(["hug_dealer", "grateful_heart"]);
  });

  it("counts mode-only badges for acts without a chip", () => {
    expect(ids({ mode: "witnessed", actType: null })).toEqual(["kindness_spotter"]);
    expect(ids({ mode: "performed", actType: null })).toEqual([]);
  });

  it("never lists the streak badge, which isn't per act", () => {
    expect(ids({ mode: "performed", actType: "other" })).not.toContain("streak");
  });

  it("handles a missing catalogue", () => {
    expect(badgesForAct(undefined, { mode: "performed", actType: "hug" })).toEqual([]);
  });
});

describe("badgeText", () => {
  const b = badge("good_word", null, { name: "Good Word", name_de: "Gutes Wort", description: "Log it" });

  it("uses the reader's language and falls back to English", () => {
    expect(badgeText(b, "de", "name")).toBe("Gutes Wort");
    expect(badgeText(b, "es", "name")).toBe("Good Word");
    expect(badgeText(b, "de", "description")).toBe("Log it");
  });
});
