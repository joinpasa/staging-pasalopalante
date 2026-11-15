// The checks a post must pass before it is sent to HighLevel.
// They encode the team's own rules, so nobody has to remember them at 2 AM:
//   - claims we can stand behind ("more than 1.1 million pledges", never "acts", never "Guinness")
//   - the Marketing Lead's style rules (no exclamation marks, no all caps)
//   - a cover on every video
//   - a time that makes sense in Puerto Rico and falls before the event it promotes

import { FORMATS } from "./stages";
import { prHour, relativeTo } from "./time";
import { consentOk } from "./stories";
import type { Item } from "./types";

export type Level = "block" | "warn" | "ok";

export interface Finding {
  id: string;
  level: Level;
  title: string;
  detail?: string;
}

/** Words that are fine in capitals. */
const CAPS_OK = new Set([
  "AM", "PM", "AST", "EST", "PST", "CST", "MST", "GMT", "UTC", "CET", "IST", "PKF", "PPL", "TAP", "PR", "UN", "USA", "US", "UK", "UAE",
  "TV", "AI", "QR", "FAQ", "SHRM", "NGO", "CEO", "DM", "RSVP", "OK", "II", "III", "IV",
]);

interface Rule {
  id: string;
  level: Level;
  title: string;
  detail: string;
  test: (text: string) => boolean;
}

export const WORDING_RULES: Rule[] = [
  {
    id: "guinness",
    level: "block",
    title: "Mentions Guinness",
    detail: "The record is from Official World Record. Say \"recognised by Official World Record\".",
    test: (t) => /guinness/i.test(t),
  },
  {
    id: "million-acts",
    level: "block",
    title: "Says \"1.1 million acts\"",
    detail: "Say \"more than 1.1 million pledges\". The acts wording is not confirmed in writing.",
    test: (t) => /1[.,]1\s*(m\b|million)\s+(acts|actos)/i.test(t),
  },
  {
    id: "trillion",
    level: "block",
    title: "Uses \"1 in a trillion\"",
    detail: "This claim is not one we can back up.",
    test: (t) => /1\s+in\s+a\s+trillion|one\s+in\s+a\s+trillion/i.test(t),
  },
  {
    id: "broke-record",
    level: "block",
    title: "Says we \"broke the record\"",
    detail: "Say \"recognised by Official World Record\".",
    test: (t) => /broke\s+(the|a)\s+(world\s+)?record/i.test(t),
  },
  {
    id: "participating",
    level: "warn",
    title: "Says countries are \"participating\"",
    detail: "For the 195 or 200 countries, use \"invited\" unless participation is confirmed.",
    test: (t) => /(19[05]|200)\+?\s+(countries|pa[ií]ses)[^.]{0,40}participat/i.test(t) || /participating\s+(countries|nations)/i.test(t),
  },
  {
    id: "grammy",
    level: "warn",
    title: "\"Grammy\" without \"Latin\"",
    detail: "For Sie7e, say \"Latin Grammy\".",
    test: (t) => /(?<!latin\s)grammy/i.test(t),
  },
  {
    id: "exclamation",
    level: "warn",
    title: "Has exclamation marks",
    detail: "The brand rules ask for none. A full stop reads calmer and warmer.",
    test: (t) => /[!¡]/.test(t),
  },
  {
    id: "caps",
    level: "warn",
    title: "Has words in all capitals",
    detail: "The brand rules ask for no all caps.",
    test: (t) => allCapsWords(t).length > 0,
  },
  {
    id: "tag-count",
    level: "warn",
    title: "Asks people to tag a number of friends",
    detail: "The kit says 11 and the site says 3. Confirm the number before using one.",
    test: (t) => /\btag\s+\d+\s+friends|\betiqueta\s+a\s+\d+/i.test(t),
  },
];

export function allCapsWords(text: string): string[] {
  const words = text.replace(/#\S+/g, " ").replace(/https?:\S+/g, " ").match(/\b[A-ZÁÉÍÓÚÑ]{3,}\b/g) ?? [];
  return [...new Set(words.filter((w) => !CAPS_OK.has(w)))];
}

/** Check one caption against the wording rules. */
export function checkCaption(text: string, opts: { needsHashtag?: boolean } = {}): Finding[] {
  const out: Finding[] = [];
  if (!text.trim()) return out;
  for (const r of WORDING_RULES) {
    if (!r.test(text)) continue;
    let detail = r.detail;
    if (r.id === "caps") detail = `${r.detail} Found: ${allCapsWords(text).slice(0, 5).join(", ")}.`;
    out.push({ id: r.id, level: r.level, title: r.title, detail });
  }
  if (opts.needsHashtag && !/#passkindnessforward\b/i.test(text)) {
    out.push({ id: "hashtag", level: "warn", title: "Missing #PassKindnessForward", detail: "It is the public hashtag." });
  }
  return out;
}

const isVideoFormat = (item: Item) => FORMATS.find((f) => f.id === item.format)?.video ?? false;

/** Everything the hub checks before a post can go to HighLevel. */
export function checkItem(item: Item): Finding[] {
  const out: Finding[] = [];
  const media = item.assets.filter((a) => a.kind === "media");
  const cover = item.assets.find((a) => a.kind === "cover");
  const hasVideo = media.some((a) => a.mime.startsWith("video/"));
  const isStory = item.format === "story";

  // media and cover
  if (item.format !== "email") {
    if (media.length === 0) out.push({ id: "media", level: "block", title: "No file attached yet", detail: "Add the image or video." });
    else if ((hasVideo || isVideoFormat(item)) && !cover && !isStory)
      out.push({ id: "cover", level: "block", title: "Video has no cover", detail: "Add a designed cover so the grid never shows a random frame." });
    else out.push({ id: "media", level: "ok", title: hasVideo ? "File and cover attached" : "File attached" });
  }

  // consent, for anything that came from the story bank
  const fromBank = item.assets.filter((a) => a.storyId);
  const open = fromBank.filter((a) => !consentOk(a.consent ?? "unknown", a.minors));
  if (open.some((a) => a.minors)) out.push({ id: "consent", level: "block", title: "A child appears in this, and consent is not on file", detail: "Record a parent or guardian's written yes in the story bank before this goes out." });
  else if (open.length) out.push({ id: "consent", level: "warn", title: "Consent is not recorded for something in this post", detail: "Open it in the story bank and note who agreed and where that is kept." });
  else if (fromBank.length) out.push({ id: "consent", level: "ok", title: "Consent recorded for everything from the story bank" });

  if (item.format === "email") {
    if (!(item.subject ?? "").trim()) out.push({ id: "subject", level: "block", title: "No subject line", detail: "Write the line people see in their inbox." });
    else if (!item.captionEn.trim()) out.push({ id: "body", level: "block", title: "The email has no text yet" });
    else out.push({ id: "subject", level: "ok", title: "Subject and text written" });
  }

  // where
  if (item.format !== "email") {
    if (item.accountIds.length === 0) out.push({ id: "accounts", level: "block", title: "No accounts chosen", detail: "Pick where this goes out." });
    else out.push({ id: "accounts", level: "ok", title: `Going to ${item.accountIds.length} account${item.accountIds.length === 1 ? "" : "s"}` });
  }

  // when
  if (!item.publishAt) {
    out.push({ id: "time", level: "block", title: "No date and time", detail: "Choose when it goes out, in Puerto Rico time." });
  } else {
    const h = prHour(item.publishAt);
    if (item.eventAt) {
      const rel = relativeTo(item.publishAt, item.eventAt);
      if (rel.after)
        out.push({ id: "time", level: "block", title: `Goes out ${rel.text}`, detail: "It promotes an event that will already be over. AM and PM are easy to mix up, so check the time." });
      else out.push({ id: "time", level: "ok", title: `Goes out ${rel.text}` });
    } else if (h >= 1 && h < 5) {
      out.push({ id: "time", level: "warn", title: "Goes out in the middle of the night in Puerto Rico", detail: "That is fine for other time zones. Just make sure it is meant." });
    } else {
      out.push({ id: "time", level: "ok", title: "Date and time set" });
    }
  }

  // wording
  if (!isStory && item.format !== "email" && !item.captionEn.trim() && !item.captionEs.trim()) {
    out.push({ id: "caption", level: "warn", title: "No caption", detail: "Stories can go without one. Feed posts read better with a caption." });
  }
  const wording = [
    ...checkCaption(item.captionEn, { needsHashtag: !isStory && item.format !== "email" }),
    ...checkCaption(item.captionEs, { needsHashtag: false }).map((f) => ({ ...f, id: `${f.id}-es`, title: `${f.title} (Spanish)` })),
  ];
  if (wording.length) out.push(...wording);
  else if (item.captionEn.trim() || item.captionEs.trim()) out.push({ id: "wording", level: "ok", title: "Wording follows the brand rules" });

  return out;
}

export const blockers = (item: Item) => checkItem(item).filter((f) => f.level === "block");
export const warnings = (item: Item) => checkItem(item).filter((f) => f.level === "warn");
