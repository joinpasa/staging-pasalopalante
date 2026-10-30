import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The website serves its own fonts (apps/website/src/fonts) instead of
 * loading them from Google Fonts — saves two third-party connections and a
 * render-blocking stylesheet on every first visit.
 */
const WEBSITE = path.resolve(__dirname, "../../apps/website");
const FONTS = path.join(WEBSITE, "src/fonts");

describe("website self-hosted fonts", () => {
  it("doesn't load fonts from Google anymore", () => {
    const html = fs.readFileSync(path.join(WEBSITE, "index.html"), "utf8");
    expect(html).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
  });

  it("only references font files that exist, and ships their licences", () => {
    const css = fs.readFileSync(path.join(FONTS, "fonts.css"), "utf8");
    const files = [...css.matchAll(/url\("\.\/([^"]+)"\)/g)].map((m) => m[1]);
    expect(files.length).toBe(8);
    expect(files.filter((f) => !fs.existsSync(path.join(FONTS, f)))).toEqual([]);
    expect(fs.existsSync(path.join(FONTS, "OFL-DMSans.txt"))).toBe(true);
    expect(fs.existsSync(path.join(FONTS, "OFL-DMSerifDisplay.txt"))).toBe(true);
  });

  it("keeps the family names the components use", () => {
    const css = fs.readFileSync(path.join(FONTS, "fonts.css"), "utf8");
    expect(css).toContain('font-family: "DM Sans"');
    expect(css).toContain('font-family: "DM Serif Display"');
  });

  it("is loaded by the website entry point", () => {
    expect(fs.readFileSync(path.join(WEBSITE, "src/main.tsx"), "utf8")).toContain('import "./fonts/fonts.css";');
  });
});
