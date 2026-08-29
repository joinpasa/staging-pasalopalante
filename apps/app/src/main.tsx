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

// Reveal the app only after the first paint of the React tree, so the
// splash screen never flashes off before content is ready.
requestAnimationFrame(() => requestAnimationFrame(markAppReady));
