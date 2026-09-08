import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SEO from "@/components/SEO";
import GHLFormEmbed from "@/components/GHLFormEmbed";
import { useLanguage } from "@shared/contexts/LanguageContext";

export default function AmbassadorsPage() {
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const t = (en: string, es: string) => (isEs ? es : en);

  return (
    <div className="min-h-screen bg-warm-cream">
      <SEO
        title={t("Ambassadors | Pásalo Pa'lante", "Embajadores | Pásalo Pa'lante")}
        description={t(
          "Become a Pásalo Pa'lante ambassador and champion the movement in your region, network, or platform. Tell us about yourself and we'll follow up.",
          "Sé embajador de Pásalo Pa'lante e impulsa el movimiento en tu región, red o plataforma. Cuéntanos sobre ti y te contactaremos."
        )}
        path="/get-involved/ambassadors"
      />
      <Navbar />
      <main className="pt-32 pb-20 section-padding">
        <div className="max-w-3xl mx-auto">
          <p className="eyebrow">Pásalo Pa'lante</p>
          <h1 className="headline-xl text-warm-earth mt-3 mb-4">
            {t("Ambassadors", "Embajadores")}
          </h1>
          <p className="text-base md:text-lg text-foreground/75 leading-relaxed mb-10 max-w-2xl">
            {t(
              "Community leaders, creators, and organizers who champion Pásalo Pa'lante in their region, network, or platform. Receive a toolkit and direct support from the Te Amo PR team. Share a few details below and our team will follow up.",
              "Líderes comunitarios, creadores y organizadores que impulsan Pásalo Pa'lante en su región, red o plataforma. Reciben un kit y apoyo directo del equipo de Te Amo PR. Comparte algunos detalles abajo y nuestro equipo te contactará."
            )}
          </p>

          <div className="bg-white/70 border border-warm-earth/10 rounded-2xl p-4 md:p-6">
            <GHLFormEmbed
              formId="xJ4tStNKJBn0QgQZb896"
              title={t("Ambassadors form", "Formulario de embajadores")}
            />
          </div>
        </div>
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
