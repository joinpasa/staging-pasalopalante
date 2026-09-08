import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  define: {
    // Where emailed links (magic link, signup confirmation, password reset)
    // should always point, regardless of what domain this build happens to
    // be served from (a preview URL, localhost, etc).
    __CANONICAL_ORIGIN__: JSON.stringify("https://pasalopalante.com"),
    // Where "Get the app" sends people. Cross-origin by default (the app's
    // current standalone deployment); scripts/build-combined.mjs overrides
    // this via the APP_BASE_URL env var to a same-origin "/app/" when
    // building the combined deployment.
    __APP_BASE_URL__: JSON.stringify(process.env.APP_BASE_URL || "https://app.pasalopalante.com/"),
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../../packages/shared/src"),
    },
  },
}));
