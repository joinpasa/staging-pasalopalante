// Lightweight referral attribution (MVP).
// A signed-in user's share links carry ?r=<their referral_code>. When a visitor
// lands with that param we stash it in a cookie scoped to .pasalopalante.com
// (so it survives a hop from a website referral link to a signup on
// app.pasalopalante.com), then attach it to their profile once they create an
// account — see AuthContext's claim_referral call, which persists it to the
// user's Supabase record immediately so nothing depends on the cookie after that.

import { getCookie, setCookie, deleteCookie } from "./domainCookie";

const KEY = "ppl_ref";
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const TTL_SECONDS = TTL_MS / 1000;

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
    setCookie(KEY, JSON.stringify(payload), TTL_SECONDS);
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
    const raw = getCookie(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (!parsed?.code || typeof parsed.ts !== "number") return null;
    if (Date.now() - parsed.ts > TTL_MS) {
      deleteCookie(KEY);
      return null;
    }
    return parsed.code;
  } catch {
    return null;
  }
}

export function clearStoredReferral() {
  try {
    deleteCookie(KEY);
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
