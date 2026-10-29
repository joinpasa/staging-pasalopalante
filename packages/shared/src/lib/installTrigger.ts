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

/** iPhone/iPad: no browser there offers an install dialog (Apple doesn't
 *  expose it), only Share → Add to Home Screen. */
export function isIOSDevice(): boolean {
  const ua = window.navigator.userAgent;
  // iPadOS reports itself as a Mac — the touch points give it away.
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/**
 * Which manual install route applies when the one-tap dialog isn't there:
 * - in-app: a browser built into another app (Instagram, Facebook, …) —
 *   can't install anything, has to be opened in a real browser
 * - ios: any iPhone/iPad browser → Share → Add to Home Screen
 * - android: Chrome, Firefox, Samsung Internet, … → menu → Install app
 * - mac-safari: Safari on a Mac → File → Add to Dock
 * - desktop: Chrome, Edge and other Chromium browsers — these always offer
 *   the one-tap dialog when the app can be installed, so no dialog there
 *   means it's already installed
 * - unsupported: everything else (e.g. desktop Firefox) → use Chrome or Edge
 */
export type InstallPlatform = "in-app" | "ios" | "android" | "mac-safari" | "desktop" | "unsupported";

export function getInstallPlatform(): InstallPlatform {
  const ua = window.navigator.userAgent;
  if (/FBAN|FBAV|FB_IAB|Instagram|Line\/|WhatsApp|Snapchat|TikTok|musical_ly|Twitter|LinkedInApp|; wv\)/i.test(ua)) {
    return "in-app";
  }
  if (isIOSDevice()) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Firefox\//.test(ua)) return "unsupported";
  if (/Chrome\/|Chromium\/|Edg\//.test(ua)) return "desktop";
  if (/Macintosh/.test(ua) && /Safari\//.test(ua)) return "mac-safari";
  return "unsupported";
}

// How long a tap waits for the browser to offer the install dialog when it
// hasn't yet — it can come a moment after the page loads.
const WAIT_FOR_PROMPT_MS = 1500;

/**
 * Shows the native install dialog if the browser offers one; never
 * navigates. "unavailable" when it doesn't, even after a short wait — on
 * iOS, in browsers without the dialog (Firefox, some others), or when the
 * browser hasn't (re)offered it, e.g. just after the app was uninstalled.
 * The caller explains the manual way instead.
 */
export async function promptAppInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferred && !isIOSDevice()) {
    await new Promise<void>((resolve) => {
      const done = () => {
        window.clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", done);
        resolve();
      };
      const timer = window.setTimeout(done, WAIT_FOR_PROMPT_MS);
      window.addEventListener("beforeinstallprompt", done);
    });
  }
  const evt = deferred;
  if (!evt) return "unavailable";
  deferred = null;
  try {
    await evt.prompt();
    return (await evt.userChoice).outcome;
  } catch {
    // Already used by the floating install card on this page load.
    return "unavailable";
  }
}
