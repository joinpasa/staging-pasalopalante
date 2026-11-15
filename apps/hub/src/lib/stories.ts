import type { Consent } from "./types";

export const CONSENT: Record<Consent, { label: string; hint: string }> = {
  "on-file": { label: "Consent on file", hint: "A written yes is kept where the team can find it." },
  partner: { label: "Shared with us to post", hint: "A partner or ambassador sent it to be shared." },
  asked: { label: "Asked, waiting for the yes", hint: "Someone has asked. Nothing is confirmed yet." },
  unknown: { label: "Consent not recorded yet", hint: "Nobody has noted whether the people in it agreed." },
  "not-needed": { label: "No people shown", hint: "Nobody can be recognised, so there is nobody to ask." },
};

/**
 * Can this go out as it stands?
 * Adults: a recorded yes, or something a partner sent us to share.
 * Children: only a written yes on file, from a parent or guardian.
 */
export const consentOk = (consent: Consent, minors?: boolean): boolean => (minors ? consent === "on-file" : consent === "on-file" || consent === "partner" || consent === "not-needed");
