/**
 * The production origin emailed links (magic link, signup confirmation,
 * password reset) should always point to, regardless of what domain this
 * build happens to be served from (a Cloudflare preview URL, localhost,
 * etc). Injected per-app at build time via each app's vite.config.ts
 * `define` — the website resolves to pasalopalante.com, the app to
 * app.pasalopalante.com — so a link sent from the app's join flow lands
 * back in the app, not on the website.
 */
export function getCanonicalOrigin(): string {
  return __CANONICAL_ORIGIN__;
}
