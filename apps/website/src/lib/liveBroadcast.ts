import { useEffect, useState } from "react";

// When the 11.11 live stream is on the site, and which video the player shows
// when. Shared by the /live page and the yellow ribbon in the navbar so the
// two always switch at the same moment.

// 1:55 PM PST on 10 Nov 2026 (= 21:55 UTC). After LIVE_END the site goes back
// to its "ended" state (no player, "View Stream Recording" button).
export const LIVE_FROM = Date.UTC(2026, 10, 10, 21, 55);
export const LIVE_END = Date.UTC(2026, 10, 14, 0, 0); // 00:00 UTC on 14 Nov: covers the Masterclass sessions on 12 and 13 Nov

const HOUR = 3600 * 1000;

export interface LiveEntry {
  /** YouTube video ID: the part after /live/ or v= in the link. */
  id: string;
  /** The player switches to this video at this time (ms since epoch). */
  from: number;
  /** Replay from the start whenever it ends. */
  loop?: boolean;
  /** No fixed time yet: takes over when the previous video ends (for people watching). */
  afterEnd?: boolean;
  /** While now is in [from, masterclassUntil) the ribbon and the hero say "Cleansing Masterclass with Daaji now happening". */
  masterclassUntil?: number;
}

// Every video needs "Allow embedding" ON in YouTube Studio.
export const LIVE_SCHEDULE: LiveEntry[] = [
  { id: "t5kM1YlIN5k", from: 0 }, // stream 3
  { id: "go1XTjCm48Q", from: Date.UTC(2026, 10, 11, 10, 0) }, // segment 4: 3:00 AM Vancouver (UTC-7) on 11 Nov
  { id: "Fr2Fch8EPFo", from: Date.UTC(2026, 10, 11, 14, 0), loop: true }, // stream 5: 14:00 UTC on 11 Nov; loops once it has ended
  { id: "4hPgiBI-9DM", from: Date.UTC(2026, 10, 11, 19, 0) }, // stream 6: 11:00 AM PST (19:00 UTC) on 11 Nov
  // Stream 7 (xdRNoG45u9A) is on hold: not scheduled.
  // Heartfulness Masterclasses with Daaji, both at 8:46 PM IST = 11:16 AM AST = 15:16 UTC.
  { id: "b_6-tX9U9xU", from: Date.UTC(2026, 10, 12, 15, 16), masterclassUntil: Date.UTC(2026, 10, 12, 15, 16) + 2 * HOUR }, // 12 Nov: Masterclass #2, Cleansing
  { id: "LE_AI1Vb4C0", from: Date.UTC(2026, 10, 13, 15, 16) }, // 13 Nov: Masterclass #3
];

/** The schedule entry the player should be on. `ended` lists videos that have finished playing. */
export function scheduledEntry(now: number, ended: string[] = []): LiveEntry {
  let current = LIVE_SCHEDULE[0];
  LIVE_SCHEDULE.forEach((e, i) => {
    const prev = LIVE_SCHEDULE[i - 1];
    if (now >= e.from || (e.afterEnd && prev && ended.includes(prev.id))) current = e;
  });
  return current;
}

/** ?preview=live forces the live state, so the team can check it early. */
export function isLivePreview(): boolean {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "live";
}

export function isLiveAt(now: number): boolean {
  return isLivePreview() || (now >= LIVE_FROM && now < LIVE_END);
}

/** True during the Cleansing Masterclass session. */
export function isMasterclassAt(now: number): boolean {
  return LIVE_SCHEDULE.some((e) => e.masterclassUntil !== undefined && now >= e.from && now < e.masterclassUntil);
}

/** Live flags for the ribbon. Re-checks every few seconds. */
export function useLiveStatus(intervalMs = 5000): { live: boolean; masterclass: boolean } {
  const read = () => {
    const now = Date.now();
    return { live: isLiveAt(now), masterclass: isMasterclassAt(now) };
  };
  const [status, setStatus] = useState(read);
  useEffect(() => {
    const check = () =>
      setStatus((prev) => {
        const next = read();
        return prev.live === next.live && prev.masterclass === next.masterclass ? prev : next;
      });
    check();
    const id = setInterval(check, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return status;
}
