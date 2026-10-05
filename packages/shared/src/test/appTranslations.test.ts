import { describe, expect, it } from "vitest";
import { getTranslations, LANGUAGES, loadTranslations } from "@shared/i18n/translations";

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

function getPath(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (typeof current !== "object" || current === null) return undefined;
    return (current as Record<string, unknown>)[key];
  }, value);
}

describe("App translations", () => {
  it("translates every app screen and shared-widget string in each supported locale", async () => {
    const english = getTranslations("en");
    const appNamespaces = [
      "appJoin",
      "appOnboarding",
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
    const inheritedAppPaths = [
      "account.saved",
      "account.commitmentHeading",
      "account.modify",
      "account.personalCommitmentIntro",
      "account.eventMonth",
      "account.personalCommitmentNote",
      "account.submitPersonalCommitment",
      "account.cancel",
      "account.emptyCommitment",
      "account.makePersonalCommitment",
      "account.commitmentBody",
      "account.progressLabel",
      "account.save",
      "account.pastCommitments",
      "account.streaksHeading",
      "account.dayStreak",
      "account.longest",
      "account.totalActs",
      "share.sectionHeading",
    ] as const;
    const englishOnlyLabels = new Set([
      "appPass.iphone",
      "appPass.android",
      "appJoin.passwordResetSentSuffix",
      "appJoin.passwordResetInstructionsSuffix",
      "appJoin.signInLinkSentSuffix",
    ]);

    for (const { code } of LANGUAGES) {
      if (code === "en") continue;
      const locale = await loadTranslations(code);
      const untranslated = [
        ...appNamespaces.flatMap((namespace) =>
          matchingStrings(english[namespace], locale[namespace], namespace),
        ),
        ...inheritedAppPaths.filter((path) =>
          getPath(english, path) === getPath(locale, path),
        ),
      ].filter((path) => !englishOnlyLabels.has(path));

      expect(untranslated, `untranslated app strings in ${code}`).toEqual([]);
    }
  });
});
