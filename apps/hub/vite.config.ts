import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { hubPrivate } from "./vite.private";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8083,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), hubPrivate()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../../packages/shared/src"),
    },
  },
}));
