import { useEffect } from "react";

/**
 * Sets or clears <meta name="robots" content="noindex">. Cleared again by
 * every page that doesn't ask for it (see SEO.tsx), so moving on from e.g.
 * /auth to a public page in the same tab never leaves the public page
 * noindexed. Utility routes also get an X-Robots-Tag header from the host
 * (public/_headers) for crawlers that don't run JavaScript.
 */
export function setNoIndex(on: boolean) {
  let el = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (!on) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", "robots");
    document.head.appendChild(el);
  }
  el.setAttribute("content", "noindex");
}

/** For utility pages that don't render <SEO>: keeps the page noindexed
 *  while it's shown. A hook (not a component) so every render branch —
 *  loading states included — is covered. */
export function useNoIndex() {
  useEffect(() => {
    setNoIndex(true);
    return () => setNoIndex(false);
  }, []);
}
