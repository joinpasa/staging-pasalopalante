/**
 * The origin emailed links (magic link, signup confirmation, password
 * reset) should point to. Whatever domain this build is actually being
 * served from is used as-is — a Cloudflare staging URL today, the real
 * production domain once it's live, doesn't matter, as long as that
 * domain is in Supabase's Redirect URLs allow-list. The one case that
 * can't work is localhost (an emailed link obviously can't reach a dev
 * machine), so that falls back to each app's own production domain
 * (__CANONICAL_ORIGIN__, injected via vite.config.ts's `define`) instead.
 */
export function getCanonicalOrigin(): string {
  const origin = window.location.origin;
  if (origin.startsWith("http://localhost")) return __CANONICAL_ORIGIN__;
  return origin;
}
