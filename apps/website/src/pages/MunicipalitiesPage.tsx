import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SEO from "@/components/SEO";
import GHLFormEmbed from "@/components/GHLFormEmbed";
import { useLanguage } from "@shared/contexts/LanguageContext";

export default function MunicipalitiesPage() {
  const { t } = useLanguage();
  const f = t.getInvolvedForms;

  return (
    <div className="min-h-screen bg-warm-cream">
      <SEO
        title={f.municipalitiesSeoTitle}
        description={f.municipalitiesSeoDescription}
        path="/get-involved/municipalities"
      />
      <Navbar />
      <main className="pt-32 pb-20 section-padding">
        <div className="max-w-3xl mx-auto">
          <p className="eyebrow">Pásalo Pa'lante</p>
          <h1 className="headline-xl text-foreground mt-3 mb-4">
            {f.municipalitiesHeading}
          </h1>
          <p className="text-base md:text-lg text-foreground/75 leading-relaxed mb-10 max-w-2xl">
            {f.municipalitiesBody}
          </p>

          <div className="bg-white/70 border border-border rounded-2xl p-4 md:p-6">
            <GHLFormEmbed formId="O9sCLLjVyHOjCNRS58IG" title={f.municipalitiesFormTitle} />
          </div>
        </div>
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
