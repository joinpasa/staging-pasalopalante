import { useLanguage } from "@shared/contexts/LanguageContext";

/**
 * Minimal, light-text legal footer for popup-style pages (e.g. share flow).
 * Sits on a light background; uses muted earthy text so it stays unobtrusive.
 */
const MinimalFooter = () => {
  const { t } = useLanguage();
  return (
    <footer className="w-full mt-12 pb-8 px-6">
      <div className="max-w-4xl mx-auto flex flex-col items-center gap-2 text-xs text-foreground/40">
        <p className="text-center">
          Pásalo Pa'lante is a sister initiative of{" "}
          <a href="https://teamopr.org" target="_blank" rel="noopener noreferrer" className="hover:text-foreground/70 transition-colors underline-offset-2 hover:underline">Te Amo PR</a>, a U.S. 501(c)(3) nonprofit · EIN 66-0975633.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          <span>{t.footer.copyright}</span>
          <span aria-hidden>·</span>
          <a href="/terms" className="hover:text-foreground/70 transition-colors">{t.footer.termsOfService}</a>
          <span aria-hidden>·</span>
          <a href="/privacy" className="hover:text-foreground/70 transition-colors">{t.footer.privacyPolicy}</a>
          <span aria-hidden>·</span>
          <a href="/community-guidelines" className="hover:text-foreground/70 transition-colors">{t.footer.communityGuidelines}</a>
          <span aria-hidden>·</span>
          <a href="/contact" className="hover:text-foreground/70 transition-colors">{t.footer.contact}</a>
        </div>
      </div>
    </footer>
  );
};

export default MinimalFooter;
