// The combined build (scripts/build-combined.mjs) puts the website AND the
// app on one origin, and any domain a Cloudflare route points at that same
// Worker gets that exact same build — including co-brand marketing domains
// like passkindnessforward.com, whose Workers Route was only ever meant to
// serve the *marketing pages*. Without this, those domains also serve a
// fully separate, origin-scoped copy of the account system (/auth,
// /account) and the installable app (/app/*) — a second identity, a second
// installed PWA, a second Supabase browser session, none of it intended.
//
// pasalopalante.com is the one canonical property. Everything else real
// (not localhost/preview) is a "satellite" — welcome to serve the marketing
// pages, but sign-in, account pages, and the installable app must always
// funnel back to the canonical domain instead of spinning up their own.
const CANONICAL_HOSTS = new Set(["pasalopalante.com", "www.pasalopalante.com"]);

function isInternalHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".lovable.app") ||
    hostname.endsWith(".lovableproject.com") ||
    hostname.endsWith(".pages.dev")
  );
}

/** True for any real domain other than the canonical pasalopalante.com property. */
export function isSatelliteDomain(hostname: string = window.location.hostname): boolean {
  return !CANONICAL_HOSTS.has(hostname) && !isInternalHost(hostname);
}

/**
 * Where the installable app actually lives. __APP_BASE_URL__ is a
 * build-time constant baked into the JS bundle — "/app/" (same-origin) on
 * the combined build, "https://app.pasalopalante.com/" otherwise — and a
 * same-origin "/app/" is exactly wrong on a satellite domain, since it
 * would resolve there instead of on the canonical property. Force the real
 * cross-origin URL whenever the current domain isn't canonical.
 */
export function getAppBaseUrl(): string {
  if (isSatelliteDomain()) return "https://app.pasalopalante.com/";
  return __APP_BASE_URL__;
}
