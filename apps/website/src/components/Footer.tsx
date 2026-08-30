import { Instagram, Facebook, Twitter, Youtube } from "lucide-react";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { useUI } from "@shared/contexts/UIContext";

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
                { icon: Instagram, href: "https://www.instagram.com/te.amo_pr/" },
                { icon: Facebook, href: "https://www.facebook.com/teamopuertorico" },
                { icon: Twitter, href: "https://x.com/TeAmo_PR" },
                { icon: Youtube, href: "https://www.youtube.com/@TeAmo_PR" },
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
