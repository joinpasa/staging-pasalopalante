/** Fired by "Take a tour" in the account menu while already on the dashboard. */
export const TOUR_EVENT = "ppl:start-tour";

const seenKey = (staffId: string) => `ppl-partner-tour-seen:${staffId}`;

/** First visit for this person (per device) → the dashboard starts the tour by itself once. */
export function hasSeenTour(staffId: string) {
  try {
    return localStorage.getItem(seenKey(staffId)) === "1";
  } catch {
    return true; // storage blocked: never auto-start, the button still works
  }
}

export function markTourSeen(staffId: string) {
  try {
    localStorage.setItem(seenKey(staffId), "1");
  } catch {
    /* non-fatal */
  }
}
