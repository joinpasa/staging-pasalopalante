import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "@shared/styles/index.css";

const markAppReady = () => {
  document.documentElement.classList.add("app-ready");
};

createRoot(document.getElementById("root")!).render(<App />);

// Reveal the app only after the first paint of the React tree, so the
// crawler fallback markup is never visible to human visitors.
requestAnimationFrame(() => requestAnimationFrame(markAppReady));
