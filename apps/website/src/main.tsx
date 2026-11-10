import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./fonts/fonts.css";
import "@shared/styles/index.css";
import { detectLanguage } from "@shared/contexts/LanguageContext";
import { loadTranslations } from "@shared/i18n/translations";
import { reloadOnceForStaleBuild } from "@shared/components/ErrorBoundary";

// A tab left open across a deploy asks for JS files that no longer exist.
// Vite reports that here: reload once to pick up the new build.
window.addEventListener("vite:preloadError", (event) => {
  if (reloadOnceForStaleBuild(new Error("Failed to fetch dynamically imported module"))) event.preventDefault();
});

// Loads the visitor's language chunk before the app ever mounts, so the
// first real paint is already in the right language - no flash of English
// first. #boot-splash (pure CSS, painted before any JS runs) covers this
// wait exactly as it already covers the JS-download/parse gap.
loadTranslations(detectLanguage()).finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
