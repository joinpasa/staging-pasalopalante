import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import CommitRoles from "@/components/commit/CommitRoles";
import { LanguageProvider } from "@shared/contexts/LanguageContext";
import { LANGUAGES, getTranslations, loadTranslations, type Language } from "@shared/i18n/translations";

function renderIn(lang: Language, ui: React.ReactElement) {
  window.localStorage.setItem("ppl-lang", lang);
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

describe("RTL / i18n runtime behaviour", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => {
    cleanup();
    document.documentElement.removeAttribute("dir");
  });

  it("sets dir=rtl and lang=ar on the document for Arabic", () => {
    renderIn("ar", <span>ok</span>);
    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.lang).toBe("ar");
  });

  it("sets dir=ltr for every non-RTL language", () => {
    for (const { code, rtl } of LANGUAGES) {
      if (rtl) continue;
      renderIn(code, <span>ok</span>);
      expect(document.documentElement.dir, `dir for ${code}`).toBe("ltr");
      cleanup();
    }
  });

  it("renders CommitRoles in every supported language without crashing", async () => {
    for (const { code } of LANGUAGES) {
      // Mirrors main.tsx: load the locale before mounting, so this renders
      // with its real content instead of only ever observing the
      // (English, until loaded) synchronous fallback.
      await loadTranslations(code);
      renderIn(code, <CommitRoles />);
      // English fallback copy is expected for languages without local content.
      expect(screen.getAllByRole("heading").length).toBeGreaterThan(0);
      cleanup();
    }
  });

  it("falls back to English strings for keys missing from a locale", async () => {
    const en = getTranslations("en");
    for (const { code } of LANGUAGES) {
      // Locales other than English load lazily on first use now - await
      // the real locale's content instead of reading the (English, until
      // loaded) synchronous fallback, so this actually tests each locale's
      // own merged data, not just English against itself.
      const t = await loadTranslations(code);
      expect(typeof t.hero.cta, `hero.cta for ${code}`).toBe("string");
      expect(t.hero.cta.length, `hero.cta for ${code}`).toBeGreaterThan(0);
      expect(Object.keys(t).sort(), `top-level keys for ${code}`).toEqual(Object.keys(en).sort());
    }
  });
});
