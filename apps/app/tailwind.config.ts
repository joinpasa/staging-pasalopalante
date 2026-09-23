import type { Config } from "tailwindcss";
import sharedPreset from "../../packages/shared/tailwind.preset";

export default {
  presets: [sharedPreset],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "../../packages/shared/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // App-only override — the shared preset leaves fontFamily at
      // Tailwind's default so the website's own DM Sans/DM Serif Display
      // look is unaffected. Montserrat is the brand-kit typeface for this
      // app's 2026-09 redesign; both font-sans and font-serif point at it
      // since the app doesn't use a separate display face like the website.
      fontFamily: {
        sans: ["Montserrat", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        serif: ["Montserrat", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
} satisfies Config;
