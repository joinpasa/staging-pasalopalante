import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * People who installed the app before it moved to app.pasalopalante.com have
 * a home-screen icon whose start_url is still this site's "/" (manifest
 * values are cached at install time). When the site launches standalone on
 * the marketing homepage, send them to the real app on its own domain
 * instead — the app itself no longer lives under a path on this origin, so
 * this is a full cross-origin redirect rather than an in-app navigation.
 */
export default function StandaloneHomeRedirect() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (pathname !== "/") return;
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (!standalone) return;
    window.location.replace(`https://app.pasalopalante.com/${search}`);
  }, [pathname, search]);

  return null;
}
