import { useEffect, useState } from "react";
import { portal } from "./portalClient";
import { useSession } from "./session";

const keyFor = (staffId: string) => `ppl-partner-email:${staffId}`;
export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

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

  return { email, setEmail, remember, valid: EMAIL_RE.test(email.trim()) };
}
