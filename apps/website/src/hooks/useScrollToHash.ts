import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrolls to the element named by the URL hash (e.g. /privacy#sms) once the
 * page has rendered. Pages are lazy-loaded, so the browser's own jump-to-
 * anchor fires before the target exists — this retries briefly until it
 * does. Pair the target with a scroll-margin class so the fixed header
 * doesn't cover it.
 */
export function useScrollToHash() {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const id = decodeURIComponent(hash.slice(1));
    let tries = 0;
    let timer: number | undefined;
    const attempt = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "auto", block: "start" });
        return;
      }
      if (tries++ < 20) timer = window.setTimeout(attempt, 100);
    };
    attempt();
    return () => window.clearTimeout(timer);
  }, [hash]);
}
