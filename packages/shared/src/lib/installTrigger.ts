// Shared by the website's "Open App" and "Download App" buttons (the How It
// Works app strip and the Account Settings page): one always opens the app,
// the other only ever shows the browser's real native install dialog — the
// same one the floating InstallPrompt card uses.
//
// beforeinstallprompt fires once per page load, before install, and any
// number of independent listeners can each hold their own reference to
// it — so this listener runs alongside InstallPrompt's own without
// conflict; whichever button the user actually taps calls .prompt() on
// its own captured reference.

import { getAppBaseUrl } from "./canonicalDomain";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: BIPEvent | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BIPEvent;
  });
}

/** Always just opens the app in this browser tab — never an install dialog. */
export function openAppInBrowser() {
  window.location.assign(getAppBaseUrl());
}

/**
 * Shows the native install dialog if the browser has one ready; never
 * navigates. "unavailable" when it doesn't (iOS, Firefox, already
 * installed, or the dialog was already used this page load).
 */
export async function promptAppInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const evt = deferred;
  if (!evt) return "unavailable";
  deferred = null;
  try {
    await evt.prompt();
    return (await evt.userChoice).outcome;
  } catch {
    return "unavailable";
  }
}
