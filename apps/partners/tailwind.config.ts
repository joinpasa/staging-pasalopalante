import type { Config } from "tailwindcss";

// Partners Hub palette (25 Nov 2026): the Brand Kit colours in the "pop" look the team approved:
// square edges, light tints, nothing dark. Deliberately standalone (no shared preset): the portal
// doesn't use the website/app shadcn tokens, so nothing here can shift either of them.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    // Square-edged on purpose: rounded boxes read as generic. Circles (avatars, dots) keep "full".
    borderRadius: {
      none: "0",
      sm: "2px",
      DEFAULT: "2px",
      md: "3px",
      lg: "3px",
      xl: "3px",
      "2xl": "4px",
      "3xl": "4px",
      full: "9999px",
    },
    extend: {
      fontFamily: {
        sans: ["Montserrat", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        navy: "#0e234b",
        canvas: "#F6FAFC",
        orange: "#f37023",
        sky: { DEFAULT: "#00a3e0", deep: "#0086BA", ink: "#005F85", soft: "#E0F4FC", wash: "#F4FBFE" },
        sun: { DEFAULT: "#fdb813", ink: "#6B4A00", soft: "#FFF4D6" },
        rose: { DEFAULT: "#d81b60", ink: "#A3134A", soft: "#FCE4EE" },
        ink: { DEFAULT: "#0e234b", muted: "#4A5875", faint: "#7A8499", onnavy: "#D5DCEA" },
        line: { DEFAULT: "#D9D3C6", soft: "#E6E1D6", faint: "#EFEBE3" },
        track: "#E8EEF6",
        magenta: "#d81b60",
        gold: { DEFAULT: "#fdb813", tint: "#fff3d1" },
        tint: { sky: "#e6f6fc", gold: "#fff3d1", pink: "#fbe9f0", orange: "#fff0e6" },
        hair: "#dcecf5",
        ink2: "#33415e",
        sand: "#F1EEE7",
      },
      backgroundImage: {
        bar: "linear-gradient(90deg, #fdb813, #f37023)",
      },
      boxShadow: {
        card: "0 8px 28px rgba(14,35,75,0.08)",
        cta: "0 6px 16px rgba(243,112,35,0.28)",
      },
    },
  },
  plugins: [],
} satisfies Config;
