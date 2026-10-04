import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./styles/app.css";
import { detectLanguage } from "@shared/contexts/LanguageContext";
import { loadTranslations } from "@shared/i18n/translations";

const markAppReady = () => {
  document.documentElement.classList.add("app-ready");
  window.setTimeout(() => {
    document.getElementById("ppl-splash")?.remove();
  }, 400);
};

// Loads the visitor's language chunk before the app ever mounts, so the
// first real paint is already in the right language - no flash of English
// first. #ppl-splash stays visible the whole time regardless (it's a
// sibling of #root, not inside it, and only markAppReady below removes
// it), so this adds no visible delay beyond what the splash already covers.
loadTranslations(detectLanguage()).finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);

  // Reveal the app only after the first paint of the React tree, so the
  // splash screen never flashes off before content is ready.
  requestAnimationFrame(() => requestAnimationFrame(markAppReady));
});
