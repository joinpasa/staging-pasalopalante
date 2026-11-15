/* eslint-disable @typescript-eslint/no-explicit-any -- HighLevel's API answers in loosely shaped JSON */
// Sending a newsletter from the hub: who gets it, when, and the request HighLevel wants. No Deno
// or network code here, so it can be tested. The rules a send must pass live in canSend().

export interface Audience {
  /** tag names: everyone with any of these gets it */
  include: string[];
  /** tag names: anyone with one of these is left out */
  exclude: string[];
}

export interface SendPlan {
  lang: "en" | "es";
  audience: Audience;
  /** an ISO time, or "now" */
  when: string;
  /** send again to people who did not open it, after this many hours (0 for no resend) */
  resendHours: number;
}

// deno-lint-ignore no-explicit-any
type Raw = any;

const norm = (t: string) => t.trim().toLowerCase();

/** The contacts that get the email: with an email, any include tag, and no exclude tag. */
export function pickAudience(contacts: Raw[], a: Audience): string[] {
  const inc = new Set(a.include.map(norm));
  const exc = new Set(a.exclude.map(norm));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const c of contacts) {
    const tags: string[] = (c.tags ?? []).map((t: string) => norm(String(t)));
    if (!c.email || seen.has(c.id)) continue;
    if (!tags.some((t) => inc.has(t))) continue;
    if (tags.some((t) => exc.has(t))) continue;
    // anyone who asked for their data to be deleted never gets an email
    if (tags.includes("data deletion requested")) continue;
    seen.add(c.id);
    out.push(String(c.id));
  }
  return out;
}

/** HighLevel wants the send time as "YYYY-MM-DD hh:mm AM" in the campaign's time zone (Puerto Rico, UTC-4). */
export function sendAtPR(iso: string): string {
  const d = new Date(new Date(iso).getTime() - 4 * 3_600_000);
  const day = d.toISOString().slice(0, 10);
  let h = d.getUTCHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${day} ${String(h).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} ${ampm}`;
}

/** Why a send cannot go ahead, in plain words, or null when it can. */
export function canSend(o: { role: string | null; stage: string; subject: string; fromName: string; fromEmail: string; count: number; when: string; now?: number; include: string[] }): string | null {
  if (o.role !== "approver" && o.role !== "admin") return "Only an approver or an admin can send a newsletter.";
  if (o.stage !== "approved") return "The email card has to be approved before it goes out.";
  if (!o.subject.trim()) return "The email has no subject line.";
  if (!o.fromName.trim() || !o.fromEmail.trim()) return "Fill in who it is from.";
  if (!o.include.length) return "Choose who gets it.";
  if (o.count < 1) return "Nobody matches that list, so there is nobody to send it to.";
  if (o.when !== "now") {
    const t = new Date(o.when).getTime();
    if (Number.isNaN(t)) return "Choose when it goes out.";
    if (t < (o.now ?? Date.now()) + 5 * 60_000) return "That time has passed or is only minutes away. Choose a later one, or send it now.";
  }
  return null;
}

/** The request body for HighLevel's "schedule campaign". */
export function scheduleBody(o: {
  when: string;
  userId: string;
  userName: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  previewText: string;
  contactIds?: string[];
  tagIds?: string[];
  resendHours: number;
  resendSubject?: string;
}): Record<string, unknown> {
  const recipients = o.tagIds?.length ? { type: "tag", tagIds: o.tagIds, freezeList: true } : { type: "contact", contactIds: o.contactIds ?? [], freezeList: true };
  return {
    scheduleType: o.when === "now" ? "immediate" : "scheduled",
    timeZone: "America/Puerto_Rico",
    userId: o.userId,
    userName: o.userName,
    emailMeta: { subject: o.subject, fromName: o.fromName, fromEmail: o.fromEmail, previewText: o.previewText },
    recipients,
    scheduleConfig: {
      ...(o.when === "now" ? {} : { sendAt: sendAtPR(o.when) }),
      tracking: { clickTracking: true, utmTracking: false },
      resend: o.resendHours > 0 ? { enabled: true, waitHours: o.resendHours, ...(o.resendSubject ? { subject: o.resendSubject } : {}) } : { enabled: false },
    },
  };
}
