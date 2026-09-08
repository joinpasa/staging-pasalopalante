import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SEO from "@/components/SEO";
import GHLFormEmbed from "@/components/GHLFormEmbed";
import { useLanguage } from "@shared/contexts/LanguageContext";

export default function SchoolsEducatorsPage() {
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const t = (en: string, es: string) => (isEs ? es : en);

  return (
    <div className="min-h-screen bg-warm-cream">
      <SEO
        title={t(
          "Schools & Educators | Pásalo Pa'lante",
          "Escuelas y educadores | Pásalo Pa'lante"
        )}
        description={t(
          "Bring Pásalo Pa'lante into your classroom or campus. Tell us about your school and we'll follow up with next steps.",
          "Lleva Pásalo Pa'lante a tu salón o campus. Cuéntanos sobre tu escuela y te contactaremos con los próximos pasos."
        )}
        path="/get-involved/schools"
      />
      <Navbar />
      <main className="pt-32 pb-20 section-padding">
        <div className="max-w-3xl mx-auto">
          <p className="eyebrow">Pásalo Pa'lante</p>
          <h1 className="headline-xl text-warm-earth mt-3 mb-4">
            {t("Schools & Educators", "Escuelas y educadores")}
          </h1>
          <p className="text-base md:text-lg text-foreground/75 leading-relaxed mb-10 max-w-2xl">
            {t(
              "Bring Pásalo Pa'lante into your classroom or campus with age-appropriate kindness prompts, classroom activities, and student leadership opportunities. Share a few details below and our team will follow up.",
              "Lleva Pásalo Pa'lante a tu salón o campus con consignas, actividades y oportunidades de liderazgo estudiantil apropiadas para cada edad. Comparte algunos detalles abajo y nuestro equipo te contactará."
            )}
          </p>

          <div className="bg-white/70 border border-warm-earth/10 rounded-2xl p-4 md:p-6">
            <GHLFormEmbed
              formId="2ptAgeJjPZAbA3OWWbY9"
              title={t("Schools & Educators form", "Formulario de escuelas y educadores")}
            />
          </div>
        </div>
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
