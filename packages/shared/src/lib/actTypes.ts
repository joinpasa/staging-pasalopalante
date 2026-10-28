// The "What did you do?" chips shown when logging an act, in the app and on
// the website. Picking one is mandatory. `value` is what's sent to
// submit-act as act_type (must match a key of its ACT_TYPE_MAP) and what
// badges.criteria counts; `labelKey` is the appLogAct translation, used both
// for the chip and as the short tag on Wall posts.
export const ACT_TYPES = [
  { value: "helped_out", labelKey: "helpedNeighbor", emoji: "🏡" },
  { value: "compliment", labelKey: "gaveCompliment", emoji: "💬" },
  { value: "volunteered", labelKey: "volunteered", emoji: "🙌" },
  { value: "donated", labelKey: "donated", emoji: "🤲" },
  { value: "treated", labelKey: "paidForSomeone", emoji: "☕" },
  { value: "gift", labelKey: "gift", emoji: "🎁" },
  { value: "hug", labelKey: "hug", emoji: "🤗" },
  { value: "listened", labelKey: "listenedSupported", emoji: "👂" },
  { value: "other", labelKey: "somethingElse", emoji: "💛" },
] as const;

export type ActTypeValue = (typeof ACT_TYPES)[number]["value"];
export type ActTypeLabelKey = (typeof ACT_TYPES)[number]["labelKey"];

export function findActType(value: string | null | undefined) {
  return ACT_TYPES.find((a) => a.value === value) ?? null;
}

// The Gave / Received / Witnessed choice, also mandatory.
export const ACT_MODES = ["performed", "received", "witnessed"] as const;
export type ActMode = (typeof ACT_MODES)[number];
