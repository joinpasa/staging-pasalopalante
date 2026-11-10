// Thin wrapper over the GA4 tag that index.html loads (gtag). Events go to
// whichever property matches the current hostname. Safe to call anywhere:
// it does nothing if the tag is blocked or hasn't loaded.
type Gtag = (command: "event", name: string, params?: Record<string, unknown>) => void;

export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  try {
    const gtag = (window as unknown as { gtag?: Gtag }).gtag;
    // "beacon" lets the event still send when the click navigates away.
    gtag?.("event", name, { transport_type: "beacon", ...params });
  } catch {
    /* analytics must never break the page */
  }
}
