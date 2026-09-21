import { getCookie, setCookie, deleteCookie } from "@shared/lib/domainCookie";

// A Supabase session (access + refresh token, user object) can exceed a
// single cookie's real ~4093-byte ceiling, so large values are split across
// numbered cookies (key.0, key.1, ...) and reassembled on read.
//
// Chunk boundaries are measured by ENCODED byte size, not raw character
// count: encodeURIComponent() expands JSON heavily - every structural
// character ({, }, ", :, ,) costs 3 bytes instead of 1, and an accented or
// emoji character anywhere in a user's name costs even more - so slicing by
// a fixed raw-character count (the previous approach) can produce a chunk
// whose ENCODED form still exceeds the real per-cookie limit. The browser
// then silently refuses or truncates that write, and the next session
// restore reassembles a corrupted, unparseable value - indistinguishable
// to the user from simply being logged out. Confirmed directly: a
// realistic full-size chunk under the old raw-character scheme encoded to
// 4,916 bytes against a ~4,093-byte real ceiling.
const SAFE_ENCODED_BUDGET = 3500; // leaves headroom for the cookie's own name + attributes under the ~4093-byte ceiling
const SESSION_MAX_AGE = 60 * 60 * 24 * 400; // ~400 days: the practical ceiling most browsers honor for Max-Age

function chunkByEncodedSize(value: string, budget: number): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < value.length) {
    let end = start;
    // Grow in small steps, measuring the REAL encoded length each time -
    // the only way to guarantee the resulting write fits regardless of how
    // much of this particular slice happens to be unicode.
    while (end < value.length) {
      const nextEnd = Math.min(end + 200, value.length);
      if (encodeURIComponent(value.slice(start, nextEnd)).length > budget) break;
      end = nextEnd;
    }
    if (end === start) end = start + 1; // a single char alone over budget - still make progress
    chunks.push(value.slice(start, end));
    start = end;
  }
  return chunks;
}

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
    const reassembled = parts.join("");
    // Multi-chunk values are always the (JSON) session object in practice -
    // a chunk write that silently failed for any reason reassembles into
    // invalid JSON here. Validate before handing it back so that failure
    // mode is a clean "no session" (a normal sign-in prompt) instead of a
    // corrupted value breaking deeper inside supabase-js. Single-cookie
    // values are left unvalidated since they can be non-JSON (e.g. a PKCE
    // code verifier) and, post-fix, are guaranteed to fit within budget on
    // write in the first place.
    try {
      JSON.parse(reassembled);
    } catch {
      domainAuthStorage.removeItem(key);
      return null;
    }
    return reassembled;
  },
  setItem(key: string, value: string): void {
    domainAuthStorage.removeItem(key);
    const chunks = chunkByEncodedSize(value, SAFE_ENCODED_BUDGET);
    if (chunks.length <= 1) {
      setCookie(key, value, SESSION_MAX_AGE);
      return;
    }
    chunks.forEach((chunk, i) => setCookie(`${key}.${i}`, chunk, SESSION_MAX_AGE));
  },
  removeItem(key: string): void {
    deleteCookie(key);
    for (const k of chunkKeys(key)) deleteCookie(k);
  },
};
