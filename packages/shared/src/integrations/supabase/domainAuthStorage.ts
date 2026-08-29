import { getCookie, setCookie, deleteCookie } from "@shared/lib/domainCookie";

// A Supabase session (access + refresh token, user object) can exceed a
// single cookie's ~4KB limit, so large values are split across numbered
// cookies (key.0, key.1, ...) and reassembled on read.
const MAX_CHUNK = 3180;
// ~400 days: the practical ceiling most browsers honor for Max-Age, matching
// how long a refresh token can keep a session alive.
const SESSION_MAX_AGE = 60 * 60 * 24 * 400;

function chunkKeys(key: string): string[] {
  const keys: string[] = [];
  for (let i = 0; getCookie(`${key}.${i}`) !== undefined; i++) keys.push(`${key}.${i}`);
  return keys;
}

/**
 * Supabase auth storage scoped to .pasalopalante.com so a session started on
 * the marketing site or the installed app is recognized on both surfaces.
 */
export const domainAuthStorage = {
  getItem(key: string): string | null {
    const direct = getCookie(key);
    if (direct !== undefined) return direct;
    const keys = chunkKeys(key);
    if (keys.length === 0) return null;
    const parts = keys.map((k) => getCookie(k));
    if (parts.some((p) => p === undefined)) return null;
    return parts.join("");
  },
  setItem(key: string, value: string): void {
    domainAuthStorage.removeItem(key);
    if (value.length <= MAX_CHUNK) {
      setCookie(key, value, SESSION_MAX_AGE);
      return;
    }
    for (let i = 0, offset = 0; offset < value.length; i++, offset += MAX_CHUNK) {
      setCookie(`${key}.${i}`, value.slice(offset, offset + MAX_CHUNK), SESSION_MAX_AGE);
    }
  },
  removeItem(key: string): void {
    deleteCookie(key);
    for (const k of chunkKeys(key)) deleteCookie(k);
  },
};
