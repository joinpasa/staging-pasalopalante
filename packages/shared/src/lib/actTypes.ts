// The preset "What did you do?" chips shown when logging an act, in the app
// and on the website. `value` is what's sent to submit-act as act_type and
// must match a key of its ACT_TYPE_MAP; `labelKey` is the appLogAct
// translation for the chip's label.
export const ACT_TYPES = [
  { value: "Helped a neighbor", labelKey: "helpedNeighbor" },
  { value: "Gave a compliment", labelKey: "gaveCompliment" },
  { value: "Volunteered", labelKey: "volunteered" },
  { value: "Donated", labelKey: "donated" },
  { value: "Paid for someone", labelKey: "paidForSomeone" },
  { value: "Listened & supported", labelKey: "listenedSupported" },
  { value: "Something else", labelKey: "somethingElse" },
] as const;
