// Shared by every "Download/Get/Open the app" button across the website
// (the floating InstallPrompt card, the How It Works app strip, the
// Account Settings page, etc.) so a tap anywhere triggers the SAME real
// native install dialog InstallPrompt already uses — not a plain link
// that just opens app.pasalopalante.com in a new tab, which never
// triggers an install at all.
//
// beforeinstallprompt fires once per page load, before install, and any
// number of independent listeners can each hold their own reference to
// it — so this listener runs alongside InstallPrompt's own without
// conflict; whichever button the user actually taps calls .prompt() on
// its own captured reference.

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

/**
 * Call this from any "download/get/open the app" button's onClick. Shows
 * the real native install dialog when the browser has one ready; falls
 * back to a same-tab navigation to the app itself (so iOS, or a visit
 * before beforeinstallprompt has fired yet, still lands somewhere useful)
 * when no native prompt is available.
 */
export async function triggerAppInstall() {
  const evt = deferred;
  if (evt) {
    deferred = null;
    try {
      await evt.prompt();
      await evt.userChoice;
      return;
    } catch {
      // Event already used elsewhere, or the browser refused — fall
      // through to the direct-navigation fallback below.
    }
  }
  window.location.assign(__APP_BASE_URL__);
}
