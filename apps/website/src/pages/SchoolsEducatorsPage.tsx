import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SEO from "@/components/SEO";
import GHLFormEmbed from "@/components/GHLFormEmbed";
import { useLanguage } from "@shared/contexts/LanguageContext";

export default function SchoolsEducatorsPage() {
  const { t } = useLanguage();
  const f = t.getInvolvedForms;

  return (
    <div className="min-h-screen bg-warm-cream">
      <SEO
        title={f.schoolsSeoTitle}
        description={f.schoolsSeoDescription}
        path="/get-involved/schools"
      />
      <Navbar />
      <main className="pt-32 pb-20 section-padding">
        <div className="max-w-3xl mx-auto">
          <p className="eyebrow">Pásalo Pa'lante</p>
          <h1 className="headline-xl text-warm-earth mt-3 mb-4">
            {f.schoolsHeading}
          </h1>
          <p className="text-base md:text-lg text-foreground/75 leading-relaxed mb-10 max-w-2xl">
            {f.schoolsBody}
          </p>

          <div className="bg-white/70 border border-warm-earth/10 rounded-2xl p-4 md:p-6">
            <GHLFormEmbed formId="2ptAgeJjPZAbA3OWWbY9" title={f.schoolsFormTitle} />
          </div>
        </div>
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
