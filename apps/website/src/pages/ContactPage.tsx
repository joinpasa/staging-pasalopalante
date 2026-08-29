import { Mail, Globe, Phone } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SEO from "@/components/SEO";
import { useLanguage } from "@shared/contexts/LanguageContext";

export default function ContactPage() {
  const { lang } = useLanguage();
  const isEs = lang === "es";

  return (
    <div className="min-h-screen bg-warm-cream">
      <SEO
        title="Contact Pásalo Pa'lante — Get in Touch With Te Amo PR"
        description="Contact the Pásalo Pa'lante team at Te Amo PR. Email info@teamopr.org or call (787) 705-0778 — we'd love to hear from you."
        path="/contact"
      />
      <Navbar />
      <main className="pt-32 pb-20 section-padding">
        <div className="max-w-2xl mx-auto text-center">
          <p className="eyebrow">Pásalo Pa'lante</p>
          <h1 className="headline-xl text-warm-earth mt-3 mb-4">
            {isEs ? "Contáctanos" : "Contact us"}
          </h1>
          <p className="text-base md:text-lg text-foreground/75 leading-relaxed mb-10">
            {isEs
              ? "¿Preguntas, ideas, prensa, alianzas o solicitudes legales? Escríbenos. El equipo de Te Amo PR responde personalmente."
              : "Questions, ideas, press, partnerships, or legal requests? Reach out. The Te Amo PR team responds personally."}
          </p>

          <div className="bg-card border border-border rounded-2xl p-8 shadow-sm space-y-5 text-left">
            <a href="mailto:info@teamopr.org" className="flex items-center gap-4 group">
              <Mail className="text-primary shrink-0" size={22} />
              <div>
                <div className="text-xs uppercase tracking-widest text-foreground/50">
                  {isEs ? "Correo" : "Email"}
                </div>
                <div className="text-base font-medium text-foreground group-hover:text-primary transition-colors">
                  info@teamopr.org
                </div>
              </div>
            </a>
            <a href="https://teamopr.org" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 group">
              <Globe className="text-primary shrink-0" size={22} />
              <div>
                <div className="text-xs uppercase tracking-widest text-foreground/50">
                  {isEs ? "Sitio web" : "Website"}
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
                  {isEs ? "Teléfono" : "Phone"}
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
