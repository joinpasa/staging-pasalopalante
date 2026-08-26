// Lightweight, same-visit referral attribution (MVP).
// A signed-in user's share links carry ?r=<their referral_code>. When a visitor
// lands with that param we stash it locally, then attach it to their profile
// once they create an account.

const KEY = "ppl_ref";
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** The public site people should land on, regardless of where we're rendering. */
export const PUBLIC_SITE_URL = "https://pasalopalante.com";

/**
 * Origin to use when building links handed to a human. Preview/staging hosts
 * are swapped for the public domain so copied links are always shareable.
 */
export function siteOrigin(): string {
  if (typeof window === "undefined") return PUBLIC_SITE_URL;
  const host = window.location.hostname;
  const isInternal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.startsWith("id-preview--") ||
    host.endsWith(".lovable.app") ||
    host.endsWith(".lovableproject.com");
  return isInternal ? PUBLIC_SITE_URL : window.location.origin;
}

interface Stored {
  code: string;
  ts: number;
}

/**
 * Reads `?r=` from the current URL, stores it, and strips it from the address
 * bar so the param never leaks into further sharing.
 */
export function captureReferralFromUrl() {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    const code = (url.searchParams.get("r") || "").trim().slice(0, 64);
    if (!code) return;
    const payload: Stored = { code, ts: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(payload));
    url.searchParams.delete("r");
    window.history.replaceState(
      {},
      "",
      url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : "") + url.hash,
    );
  } catch {
    /* non-fatal */
  }
}

/** Returns a stored, non-expired referral code (or null). */
export function getStoredReferral(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (!parsed?.code || typeof parsed.ts !== "number") return null;
    if (Date.now() - parsed.ts > TTL_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return parsed.code;
  } catch {
    return null;
  }
}

export function clearStoredReferral() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* non-fatal */
  }
}

/** Appends the inviter's referral code to a share URL when available. */
export function withReferral(url: string, code?: string | null) {
  if (!url || !code) return url;
  try {
    const u = new URL(url);
    u.searchParams.set("r", code);
    return u.toString();
  } catch {
    return url;
  }
}
