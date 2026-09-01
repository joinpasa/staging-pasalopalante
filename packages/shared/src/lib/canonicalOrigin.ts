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

const STAGING_WEBSITE_ORIGIN = "https://stagingsite-pasalopalante.connect-bef.workers.dev";
const STAGING_APP_ORIGIN = "https://stagingapp-pasalopalante.connect-bef.workers.dev";
const PROD_APP_ORIGIN = "https://app.pasalopalante.com";

/**
 * The app's origin, callable from the *website* (which runs on a different
 * domain than the app). Mirrors whichever environment the website is
 * currently running in — staging website -> staging app, anything else
 * (production, localhost) -> production app.
 */
export function getAppOrigin(): string {
  const origin = window.location.origin;
  if (origin === STAGING_WEBSITE_ORIGIN || origin.startsWith("http://localhost")) {
    return STAGING_APP_ORIGIN;
  }
  return PROD_APP_ORIGIN;
}
