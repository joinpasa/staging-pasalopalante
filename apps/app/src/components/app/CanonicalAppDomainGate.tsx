import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { isSatelliteDomain } from "@shared/lib/canonicalDomain";

// This bundle runs in two places: standalone at app.pasalopalante.com (the
// canonical app domain — isSatelliteDomain() is false there, so this never
// fires), or embedded at /app/* under the combined build. The combined
// build ships identically to every domain a Cloudflare route points at
// that Worker, including co-brand marketing domains like
// passkindnessforward.com — whose route was only ever meant to serve the
// marketing pages, not stand up a second, fully separate installed app
// with its own origin-scoped Supabase session. react-router's basename
// already strips the "/app/" prefix from `pathname`, so the canonical
// target is just app.pasalopalante.com + the same path.
export default function CanonicalAppDomainGate() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (!isSatelliteDomain()) return;
    window.location.replace(`https://app.pasalopalante.com${pathname}${search}`);
  }, [pathname, search]);

  return null;
}
