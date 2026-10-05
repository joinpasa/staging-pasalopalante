import { describe, expect, it } from "vitest";
import { getTranslations, loadTranslations } from "@shared/i18n/translations";

function matchingStrings(english: unknown, german: unknown, path = ""): string[] {
  if (typeof english === "string" && typeof german === "string") {
    return english === german ? [path] : [];
  }
  if (typeof english !== "object" || english === null || typeof german !== "object" || german === null) {
    return [];
  }

  return Object.keys(english).flatMap((key) =>
    matchingStrings(
      (english as Record<string, unknown>)[key],
      (german as Record<string, unknown>)[key],
      path ? `${path}.${key}` : key,
    ),
  );
}

describe("German app translations", () => {
  it("translates every join and onboarding string", async () => {
    const english = getTranslations("en");
    const german = await loadTranslations("de");

    expect(matchingStrings(english.appJoin, german.appJoin)).toEqual([]);
    expect(matchingStrings(english.appOnboarding, german.appOnboarding)).toEqual([]);
  });

  it("translates every app screen and shared-widget string", async () => {
    const english = getTranslations("en");
    const german = await loadTranslations("de");
    const appNamespaces = [
      "appNavigation",
      "appCommon",
      "appHome",
      "appWall",
      "appPass",
      "appConnections",
      "appBadges",
      "appAccount",
      "appLogAct",
      "appMap",
      "appWave",
      "appWidgets",
    ] as const;
    const inheritedAppStrings: [string, string, string][] = [
      ["account.saved", english.account.saved, german.account.saved],
      ["account.commitmentHeading", english.account.commitmentHeading, german.account.commitmentHeading],
      ["account.modify", english.account.modify, german.account.modify],
      ["account.personalCommitmentIntro", english.account.personalCommitmentIntro, german.account.personalCommitmentIntro],
      ["account.eventMonth", english.account.eventMonth, german.account.eventMonth],
      ["account.personalCommitmentNote", english.account.personalCommitmentNote, german.account.personalCommitmentNote],
      ["account.submitPersonalCommitment", english.account.submitPersonalCommitment, german.account.submitPersonalCommitment],
      ["account.cancel", english.account.cancel, german.account.cancel],
      ["account.emptyCommitment", english.account.emptyCommitment, german.account.emptyCommitment],
      ["account.makePersonalCommitment", english.account.makePersonalCommitment, german.account.makePersonalCommitment],
      ["account.commitmentBody", english.account.commitmentBody, german.account.commitmentBody],
      ["account.progressLabel", english.account.progressLabel, german.account.progressLabel],
      ["account.save", english.account.save, german.account.save],
      ["account.pastCommitments", english.account.pastCommitments, german.account.pastCommitments],
      ["account.streaksHeading", english.account.streaksHeading, german.account.streaksHeading],
      ["account.dayStreak", english.account.dayStreak, german.account.dayStreak],
      ["account.longest", english.account.longest, german.account.longest],
      ["account.totalActs", english.account.totalActs, german.account.totalActs],
      ["share.sectionHeading", english.share.sectionHeading, german.share.sectionHeading],
    ];

    const untranslated = [
      ...appNamespaces.flatMap((namespace) =>
        matchingStrings(english[namespace], german[namespace], namespace),
      ).filter((path) => ![
        "appPass.iphone",
        "appPass.android",
        "appLogAct.optional",
      ].includes(path)),
      ...inheritedAppStrings.filter(([, englishText, germanText]) => englishText === germanText).map(([path]) => path),
    ];

    expect(untranslated).toEqual([]);
  });
});
