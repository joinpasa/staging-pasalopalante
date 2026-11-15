import type { Config } from "tailwindcss";

// Kindness Hub palette: the Kindness Forward brand kit (navy, sky, orange,
// gold, magenta) on white. Standalone like the partner portal's config, so
// nothing here can shift the website or app.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Montserrat", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        navy: "#0e234b",
        // warm paper rather than the usual cool grey, so the brand colours sit well on it
        paper: "#F7F5F0",
        canvas: "#FFFFFF",
        orange: { DEFAULT: "#f37023", soft: "#FDE9DC", ink: "#9A3F08" },
        sky: { DEFAULT: "#00a3e0", deep: "#0086BA", ink: "#005F85", soft: "#DFF3FB" },
        sun: { DEFAULT: "#fdb813", ink: "#6B4A00", soft: "#FFF1CC" },
        rose: { DEFAULT: "#d81b60", ink: "#A3134A", soft: "#FBE2EC" },
        ink: { DEFAULT: "#0e234b", muted: "#586176", faint: "#8B91A1" },
        line: { DEFAULT: "#E4E1D9", soft: "#ECE9E2", faint: "#F3F1EC" },
      },
      boxShadow: {
        card: "none",
        lift: "0 24px 60px rgba(14,35,75,0.18)",
        pop: "0 8px 24px rgba(14,35,75,0.10)",
      },
      keyframes: {
        "drawer-in": { from: { transform: "translateX(24px)", opacity: "0" }, to: { transform: "translateX(0)", opacity: "1" } },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "pop-in": { from: { transform: "translateY(6px)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
      },
      animation: {
        "drawer-in": "drawer-in 220ms cubic-bezier(.2,.8,.2,1)",
        "fade-in": "fade-in 160ms ease-out",
        "pop-in": "pop-in 200ms cubic-bezier(.2,.8,.2,1)",
      },
    },
  },
  plugins: [],
} satisfies Config;
