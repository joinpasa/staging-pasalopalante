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
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 md:gap-16 items-start">
          <div>
            <p className="eyebrow">Pásalo Pa'lante</p>
            <h1 className="headline-xl text-foreground mt-3 mb-4">
              {f.schoolsHeading}
            </h1>
            <p className="text-base md:text-lg text-foreground/75 leading-relaxed max-w-xl">
              {f.schoolsBody}
            </p>
          </div>

          <GHLFormEmbed formId="OqzUF77KFz5ITOzB1fqi" title={f.schoolsFormTitle} />
        </div>
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
