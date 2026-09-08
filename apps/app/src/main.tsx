import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "@shared/styles/index.css";

const markAppReady = () => {
  document.documentElement.classList.add("app-ready");
  window.setTimeout(() => {
    document.getElementById("ppl-splash")?.remove();
  }, 400);
};

createRoot(document.getElementById("root")!).render(<App />);

// Arrived via the website's "Get the app" link (?install=1, see
// InstallPrompt.tsx): keep the splash up past first paint, until the
// native install dialog is about to take over the screen — otherwise
// there'd be a visible flash of full app content in the moment between
// the page loading and beforeinstallprompt actually firing. Same listener
// pattern as InstallPrompt.tsx; multiple listeners on the same event are
// fine, and preventDefault() there doesn't stop this one from also
// running. Timeout is a safety net for whenever beforeinstallprompt
// doesn't fire at all (already installed, unsupported browser, etc.) so
// the splash is never stuck showing indefinitely.
const wantsAutoInstall = new URLSearchParams(window.location.search).get("install") === "1";
if (wantsAutoInstall) {
  let settled = false;
  const settle = () => {
    if (settled) return;
    settled = true;
    markAppReady();
  };
  window.addEventListener("beforeinstallprompt", settle, { once: true });
  window.setTimeout(settle, 4000);
} else {
  // Reveal the app only after the first paint of the React tree, so the
  // splash screen never flashes off before content is ready.
  requestAnimationFrame(() => requestAnimationFrame(markAppReady));
}
