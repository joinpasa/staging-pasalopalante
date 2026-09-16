import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { isSatelliteDomain } from "@shared/lib/canonicalDomain";

// Sign-in and account pages are the website's own auth surface (separate
// from the installable app under /app/*, which CanonicalAppDomainGate in
// apps/app covers). On a satellite domain — a co-brand marketing domain
// (currently just passkindnessforward.com) routed at this same combined
// build for its marketing pages — these must not spin up a second,
// origin-scoped identity: redirect to the same path on the canonical
// pasalopalante.com instead, so there is exactly one account system, not
// one per marketing domain. /commit (the pledge/signup funnel) and the
// rest of the marketing site are intentionally left alone — those are
// meant to work on every domain.
const ACCOUNT_ROUTE_PREFIXES = ["/auth", "/account"];

export default function CanonicalDomainGate() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (!isSatelliteDomain()) return;
    const onAccountRoute = ACCOUNT_ROUTE_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
    if (!onAccountRoute) return;
    window.location.replace(`https://pasalopalante.com${pathname}${search}`);
  }, [pathname, search]);

  return null;
}
