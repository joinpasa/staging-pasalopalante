import { useEffect, useState } from "react";

// When the 11.11 live stream is on the site. Shared by the /live page and the
// yellow ribbon in the navbar so the two always switch at the same moment.
// 1:55 PM PST on 10 Nov 2026 (= 21:55 UTC); the broadcast runs 24 hours, plus a
// 2-hour buffer before the site goes back to its "ended" state.
export const LIVE_FROM = Date.UTC(2026, 10, 10, 21, 55);
export const LIVE_END = LIVE_FROM + 26 * 3600 * 1000;

/** ?preview=live forces the live state, so the team can check it early. */
export function isLivePreview(): boolean {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "live";
}

export function isLiveAt(now: number): boolean {
  return isLivePreview() || (now >= LIVE_FROM && now < LIVE_END);
}

/** True while the stream is live. Re-checks every few seconds. */
export function useIsLive(intervalMs = 5000): boolean {
  const [live, setLive] = useState(() => isLiveAt(Date.now()));
  useEffect(() => {
    const check = () => setLive(isLiveAt(Date.now()));
    check();
    const id = setInterval(check, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return live;
}
