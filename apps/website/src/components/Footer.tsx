import { Instagram, Facebook, Twitter, Youtube } from "lucide-react";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { useUI } from "@shared/contexts/UIContext";

const TikTokIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M16.6 5.82c-.8-.7-1.3-1.7-1.4-2.82h-3.09v12.4a2.59 2.59 0 01-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 004.02 1.19V7.11a4.85 4.85 0 01-2.62-1.29z" />
  </svg>
);

const PinterestIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2C6.5 2 2 6.5 2 12c0 4.2 2.6 7.8 6.3 9.3-.1-.8-.2-2 .1-2.9.2-.9 1.4-6 1.4-6s-.4-.7-.4-1.8c0-1.7 1-2.9 2.2-2.9 1 0 1.5.8 1.5 1.7 0 1-.7 2.6-1 4-.3 1.2.6 2.1 1.7 2.1 2.1 0 3.5-2.7 3.5-5.8 0-2.4-1.6-4.2-4.6-4.2-3.3 0-5.4 2.5-5.4 5.2 0 .9.3 1.6.7 2.1.2.2.2.3.1.5l-.3 1c-.1.3-.3.4-.6.2-1.3-.5-2-2.1-2-3.8 0-2.8 2.4-6.2 7.1-6.2 3.8 0 6.3 2.7 6.3 5.7 0 3.9-2.1 6.8-5.3 6.8-1.1 0-2.1-.6-2.4-1.2l-.7 2.6c-.2.9-.7 2-1.1 2.7.9.3 1.9.4 2.9.4 5.5 0 10-4.5 10-10S17.5 2 12 2z" />
  </svg>
);

const Footer = () => {
  const { t } = useLanguage();
  const { openShareModal } = useUI();

  return (
    <footer className="section-padding py-16 bg-cyan-900">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-1">
            <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
              <img src="/logo-PPL.png" alt="Pásalo Pa'lante" className="h-10 brightness-0 invert mb-3 cursor-pointer" />
            </a>
            <p className="text-warm-cream/50 text-sm leading-relaxed">
              {t.footer.brand}{" "}
              <span className="whitespace-nowrap">
                {t.footer.poweredBy}{" "}
                <a
                  href="https://teamopr.org/pasalo-palante/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-warm-cream/80 hover:text-warm-cream underline-offset-2 hover:underline transition-colors"
                >
                  {t.footer.teAmoPR}
                </a>
                .
              </span>
            </p>
            <p className="text-warm-cream/40 text-xs leading-relaxed mt-3">
              Pásalo Pa'lante is a sister initiative of Te Amo PR, a U.S.
              501(c)(3) nonprofit. EIN 66-0975633 · 550 Av. de la Constitución
              #905, San Juan, PR.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-bold tracking-widest uppercase text-warm-cream/40 mb-4">{t.footer.joinHeader}</h4>
            <ul className="space-y-2">
              <li><a href="/get-involved" className="text-warm-cream/70 hover:text-warm-cream transition-colors text-sm">{t.footer.getInvolved}</a></li>
              <li><a href="/commit" className="text-warm-cream/70 hover:text-warm-cream transition-colors text-sm">Pledge</a></li>
              <li>
                <button
                  type="button"
                  onClick={() => openShareModal()}
                  className="text-warm-cream/70 hover:text-warm-cream transition-colors text-sm"
                >
                  {t.footer.shareAct}
                </button>
              </li>
              <li><a href="/donate" className="text-warm-cream/70 hover:text-warm-cream transition-colors text-sm">{t.footer.donateNow}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold tracking-widest uppercase text-warm-cream/40 mb-4">{t.footer.learnHeader}</h4>
            <ul className="space-y-2">
              <li><a href="/#story" className="text-warm-cream/70 hover:text-warm-cream transition-colors text-sm">{t.footer.ourStory}</a></li>
              <li><a href="/how-it-works" className="text-warm-cream/70 hover:text-warm-cream transition-colors text-sm">{t.footer.howItWorks}</a></li>
              <li><a href="/about" className="text-warm-cream/70 hover:text-warm-cream transition-colors text-sm">About</a></li>
              <li><a href="/ideas" className="text-warm-cream/70 hover:text-warm-cream transition-colors text-sm">{t.footer.ideas}</a></li>
              <li><a href="/wall" className="text-warm-cream/70 hover:text-warm-cream transition-colors text-sm">{t.footer.wallOfKindness}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold tracking-widest uppercase text-warm-cream/40 mb-4">{t.footer.connectHeader}</h4>
            <ul className="space-y-2 text-sm text-warm-cream/70">
              <li><a href="mailto:info@teamopr.org" className="hover:text-warm-cream transition-colors">info@teamopr.org</a></li>
              <li>(787) 705-0778</li>
            </ul>
            <div className="flex items-center gap-3 mt-4">
              {[
                { icon: Facebook, href: "https://www.facebook.com/passkindnessforward" },
                { icon: Instagram, href: "https://www.instagram.com/passkindnessforward/" },
                { icon: Youtube, href: "https://youtube.com/@passkindnessforward" },
                { icon: TikTokIcon, href: "https://www.tiktok.com/@kindnessforward" },
                { icon: PinterestIcon, href: "https://www.pinterest.com/kindnessforward" },
                { icon: Twitter, href: "https://x.com/kindnessfwd" },
              ].map(({ icon: Icon, href }) => (
                <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="text-warm-cream/70 hover:text-warm-cream transition-all duration-300 hover:scale-110">
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-warm-cream/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-warm-cream/30 text-xs">{t.footer.copyright}</p>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
            <a href="/terms" className="text-warm-cream/40 text-xs hover:text-warm-cream/70 transition-colors">{t.footer.termsOfService}</a>
            <span className="text-warm-cream/20 text-xs">·</span>
            <a href="/privacy" className="text-warm-cream/40 text-xs hover:text-warm-cream/70 transition-colors">{t.footer.privacyPolicy}</a>
            <span className="text-warm-cream/20 text-xs">·</span>
            <a href="/community-guidelines" className="text-warm-cream/40 text-xs hover:text-warm-cream/70 transition-colors">{t.footer.communityGuidelines}</a>
            <span className="text-warm-cream/20 text-xs">·</span>
            <a href="/contact" className="text-warm-cream/40 text-xs hover:text-warm-cream/70 transition-colors">{t.footer.contact}</a>
            <span className="text-warm-cream/20 text-xs">·</span>
            <a href="https://weandgoliath.com/" target="_blank" rel="noopener noreferrer" className="text-warm-cream/30 text-xs hover:text-warm-cream/50 transition-colors">{t.footer.madeBy}</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
