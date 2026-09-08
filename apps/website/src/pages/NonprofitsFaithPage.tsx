import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SEO from "@/components/SEO";
import GHLFormEmbed from "@/components/GHLFormEmbed";
import { useLanguage } from "@shared/contexts/LanguageContext";

export default function NonprofitsFaithPage() {
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const t = (en: string, es: string) => (isEs ? es : en);

  return (
    <div className="min-h-screen bg-warm-cream">
      <SEO
        title={t(
          "Nonprofits & Faith Communities | Pásalo Pa'lante",
          "ONGs y comunidades de fe | Pásalo Pa'lante"
        )}
        description={t(
          "Co-host activations, share kindness resources with your community, and partner with Pásalo Pa'lante. Tell us about your organization and we'll follow up.",
          "Co-organiza activaciones, comparte recursos con tu comunidad y sé socio de Pásalo Pa'lante. Cuéntanos sobre tu organización y te contactaremos."
        )}
        path="/get-involved/nonprofits"
      />
      <Navbar />
      <main className="pt-32 pb-20 section-padding">
        <div className="max-w-3xl mx-auto">
          <p className="eyebrow">Pásalo Pa'lante</p>
          <h1 className="headline-xl text-warm-earth mt-3 mb-4">
            {t("Nonprofits & Faith Communities", "ONGs y comunidades de fe")}
          </h1>
          <p className="text-base md:text-lg text-foreground/75 leading-relaxed mb-10 max-w-2xl">
            {t(
              "Co-host activations, share kindness resources with your community, and amplify a mission-aligned global movement rooted in service. Share a few details below and our team will follow up.",
              "Co-organiza activaciones, comparte recursos con tu comunidad y amplifica un movimiento global alineado con tu misión de servicio. Comparte algunos detalles abajo y nuestro equipo te contactará."
            )}
          </p>

          <div className="bg-white/70 border border-warm-earth/10 rounded-2xl p-4 md:p-6">
            <GHLFormEmbed
              formId="MTVXs65RkLclU5m9CDVb"
              title={t("Nonprofits & Faith Communities form", "Formulario de ONGs y comunidades de fe")}
            />
          </div>
        </div>
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
