// The combined build (scripts/build-combined.mjs) puts the website AND the
// app on one origin, and any domain a Cloudflare route points at that same
// Worker gets that exact same build — including co-brand marketing domains
// like passkindnessforward.com, whose Workers Route was only ever meant to
// serve the *marketing pages*. Without this, those domains also serve a
// fully separate, origin-scoped copy of the account system (/auth,
// /account) and the installable app (/app/*) — a second identity, a second
// installed PWA, a second Supabase browser session, none of it intended.
//
// Any pasalopalante.com subdomain is canonical — this used to be an
// enumerated list of exact hostnames, which is how app.pasalopalante.com
// itself ended up NOT on it: CanonicalAppDomainGate (mounted in every build
// of the app, including the real standalone app.pasalopalante.com) then
// treated its own production domain as a satellite and called
// location.replace() to its own URL on every navigation — a self-inflicted
// reload loop that broke login (interrupting the magic-link confirm step
// mid-flow) and QR sharing (the page never settled long enough to use) on
// the live app. A suffix check can't omit a subdomain by accident the way
// an enumerated set can, so any future first-party subdomain is safe by
// construction instead of needing to remember to add it here.
function isCanonicalHost(hostname: string): boolean {
  return hostname === "pasalopalante.com" || hostname.endsWith(".pasalopalante.com");
}

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
  return !isCanonicalHost(hostname) && !isInternalHost(hostname);
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
