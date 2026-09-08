import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Two groups land here in standalone (installed-app) display mode, on the
 * homepage, and neither one meant to be there:
 *
 * 1. People who installed before the app moved off this origin have a
 *    home-screen icon whose start_url is still this site's "/" (manifest
 *    values are cached at install time).
 * 2. Since the marketing pages became installable too, installing directly
 *    from the homepage makes the browser promote that SAME tab into the
 *    new app window instead of navigating it anywhere — a standard,
 *    universal part of how the install API works, not specific to us. A
 *    non-technical user has no way to know that; what they see is the app
 *    opening to the wrong screen, which is exactly what it looks like.
 *
 * Group 2 is why a plain "check once on mount" isn't enough: this
 * component mounted while the tab was still a normal browser tab (that's
 * required for the install button to even work), so display-mode was NOT
 * standalone at mount time and the early return below fired. Chrome then
 * flips the tab to standalone right after the user taps "Install" —
 * without any navigation, so nothing here would re-run on its own. Listen
 * for that flip directly (the display-mode media query's own "change"
 * event, plus the "appinstalled" event as a second, redundant signal) so
 * the redirect fires the instant it happens, with no reload needed.
 *
 * Either way, the fix is the same: if this origin is ever running
 * standalone on "/", that's never actually where anyone wants to be —
 * send them into the real app immediately, silently. __APP_BASE_URL__ is
 * same-origin ("/app/") once the combined build embeds the app here, or
 * the app's own subdomain (a full cross-origin redirect) otherwise.
 */
export default function StandaloneHomeRedirect() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (pathname !== "/") return;

    const isStandalone = () =>
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    const redirect = () => window.location.replace(`${__APP_BASE_URL__}${search}`);

    if (isStandalone()) {
      redirect();
      return;
    }

    const mql = window.matchMedia?.("(display-mode: standalone)");
    const onChange = () => {
      if (isStandalone()) redirect();
    };
    mql?.addEventListener?.("change", onChange);
    window.addEventListener("appinstalled", onChange);

    return () => {
      mql?.removeEventListener?.("change", onChange);
      window.removeEventListener("appinstalled", onChange);
    };
  }, [pathname, search]);

  return null;
}
