import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LANGUAGES } from "@/i18n/translations";

const ROOT = path.resolve(__dirname, "../../..");
const SRC = path.join(ROOT, "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe("i18n: local CONTENT maps", () => {
  it("always falls back to English when a language has no local copy", () => {
    // e.g. `CONTENT[lang as keyof typeof CONTENT]` must be followed by `?? CONTENT.en`
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const source = fs.readFileSync(file, "utf8");
      const re = /(\w+)\[lang as keyof typeof \1\]\s*(\?\?)?/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(source))) {
        if (!m[2]) offenders.push(`${path.relative(ROOT, file)} -> ${m[1]}`);
      }
    }
    expect(offenders, `Add "?? MAP.en" fallback in:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("ships a parseable locale file for every non-English language with one", () => {
    const dir = path.join(SRC, "i18n", "locales");
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
      const code = file.replace(/\.json$/, "");
      expect(LANGUAGES.map((l) => l.code)).toContain(code);
      expect(() => JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"))).not.toThrow();
    }
  });

  it("marks exactly the RTL languages as rtl", () => {
    const rtl = LANGUAGES.filter((l) => l.rtl).map((l) => l.code);
    expect(rtl).toEqual(["ar"]);
  });
});
