import { useEffect, useState } from "react";
import { portal } from "./portalClient";
import { useSession } from "./session";

const keyFor = (staffId: string) => `ppl-partner-email:${staffId}`;
export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Example/test addresses people copy from a placeholder (you@yourdomain.org,
 * name@example.com, you@organization.org…). They pass the format check but
 * can never receive mail, so Gmail bounces them back to the reviewer for days.
 */
export function isPlaceholderEmail(email: string) {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  return (
    /(^|\.)(example|test|invalid|localhost)$/.test(domain) ||
    /^(example|yourdomain|your-domain|yourorg|yourorganization|yourcompany|yourschool|domain|organization)\.[a-z.]+$/.test(domain)
  );
}

/**
 * The submitter's email for "Needs Changes" updates, pre-filled per PERSON
 * (keyed by staff id, so a shared tablet doesn't hand Ana's email to Carlos).
 * Comes from this device first, then from their saved profile — so it also
 * follows them to a new device or survives a cleared cache.
 */
export function useSubmitterEmail() {
  const { staff } = useSession();
  const [email, setEmail] = useState(() => {
    try {
      return staff ? localStorage.getItem(keyFor(staff.id)) ?? "" : "";
    } catch {
      return "";
    }
  });

  useEffect(() => {
    if (!staff || email) return;
    let cancelled = false;
    portal
      .from("partner_staff")
      .select("email")
      .eq("id", staff.id)
      .maybeSingle()
      .then(({ data }) => {
        const saved = (data as { email: string | null } | null)?.email;
        if (!cancelled && saved) setEmail((cur) => cur || saved);
      });
    return () => {
      cancelled = true;
    };
    // Only on first load for this person — never overwrite what they're typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff?.id]);

  /** Call after a successful submit so next time it's pre-filled. */
  const remember = (value: string) => {
    if (!staff) return;
    try {
      localStorage.setItem(keyFor(staff.id), value.trim());
    } catch {
      /* non-fatal */
    }
  };

  const placeholder = isPlaceholderEmail(email);
  return { email, setEmail, remember, placeholder, valid: EMAIL_RE.test(email.trim()) && !placeholder };
}
