import { Mail, Globe, Phone } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SEO from "@/components/SEO";
import { useLanguage } from "@shared/contexts/LanguageContext";

export default function ContactPage() {
  const { t } = useLanguage();
  const tx = t.contactPage;

  return (
    <div className="min-h-screen bg-warm-cream">
      <SEO
        title="Contact Kindness Forward — Get in Touch With Te Amo PR"
        description="Contact the Pásalo Pa'lante team at Te Amo PR. Email info@passkindnessforward.com or call (787) 705-0778 — we'd love to hear from you."
        path="/contact"
      />
      <Navbar />
      <main className="pt-32 pb-20 section-padding">
        <div className="max-w-2xl mx-auto text-center">
          <p className="eyebrow">Pásalo Pa'lante</p>
          <h1 className="headline-xl text-foreground mt-3 mb-4">
            {tx.contactUs}
          </h1>
          <p className="text-base md:text-lg text-foreground/75 leading-relaxed mb-10">
            {tx.intro}
          </p>

          <div className="bg-card border border-border rounded-2xl p-8 shadow-sm space-y-5 text-left">
            <a href="mailto:info@passkindnessforward.com" className="flex items-center gap-4 group">
              <Mail className="text-primary shrink-0" size={22} />
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-widest text-foreground/50">
                  {tx.email}
                </div>
                <div className="text-base font-medium text-foreground group-hover:text-primary transition-colors break-all">
                  info@passkindnessforward.com
                </div>
              </div>
            </a>
            <a href="https://teamopr.org" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 group">
              <Globe className="text-primary shrink-0" size={22} />
              <div>
                <div className="text-xs uppercase tracking-widest text-foreground/50">
                  {tx.website}
                </div>
                <div className="text-base font-medium text-foreground group-hover:text-primary transition-colors">
                  teamopr.org
                </div>
              </div>
            </a>
            <div className="flex items-center gap-4">
              <Phone className="text-primary shrink-0" size={22} />
              <div>
                <div className="text-xs uppercase tracking-widest text-foreground/50">
                  {tx.phone}
                </div>
                <div className="text-base font-medium text-foreground">(787) 705-0778</div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
