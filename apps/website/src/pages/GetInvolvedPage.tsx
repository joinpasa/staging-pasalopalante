import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SEO from "@/components/SEO";
import CourseCreatorForm from "@/components/CourseCreatorForm";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { Link } from "react-router-dom";

export default function GetInvolvedPage() {
  const { t } = useLanguage();
  const p = t.getInvolvedPage;

  const groups = [
    { title: p.groupIndividualsTitle, body: p.groupIndividualsBody, cta: p.groupIndividualsCta, link: "/commit" },
    { title: p.groupSchoolsTitle, body: p.groupSchoolsBody, cta: p.groupSchoolsCta, link: "/get-involved/schools" },
    { title: p.groupNonprofitsTitle, body: p.groupNonprofitsBody, cta: p.groupNonprofitsCta, link: "/get-involved/nonprofits" },
    { title: p.groupCompaniesTitle, body: p.groupCompaniesBody, cta: p.groupCompaniesCta, link: "/contact" },
    { title: p.groupMunicipalitiesTitle, body: p.groupMunicipalitiesBody, cta: p.groupMunicipalitiesCta, link: "/contact" },
    { title: p.groupAmbassadorsTitle, body: p.groupAmbassadorsBody, cta: p.groupAmbassadorsCta, link: "/get-involved/ambassadors" },
  ];

  return (
    <div className="min-h-screen bg-warm-cream">
      <SEO title={p.seoTitle} description={p.seoDescription} path="/get-involved" />
      <Navbar />
      <main className="pt-32 pb-20 section-padding">
        <div className="max-w-4xl mx-auto">
          <p className="eyebrow">Pásalo Pa'lante</p>
          <h1 className="headline-xl text-warm-earth mt-3 mb-4">
            {p.heading}
          </h1>
          <p className="text-base md:text-lg text-foreground/75 leading-relaxed mb-10 max-w-2xl">
            {p.intro}
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {groups.map((g) => (
              <article key={g.title} className="bg-white/70 border border-warm-earth/10 rounded-2xl p-6">
                <h2 className="font-display text-2xl text-warm-earth mb-2">{g.title}</h2>
                <p className="text-foreground/80 leading-relaxed mb-4">{g.body}</p>
                <Link to={g.link} className="text-primary font-medium underline-offset-2 hover:underline">
                  {g.cta} →
                </Link>
              </article>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              to="/donate"
              className="inline-flex items-center justify-center rounded-full bg-warm-earth text-warm-cream px-8 py-3 font-medium hover:opacity-90 transition"
            >
              {p.supportCta}
            </Link>
          </div>

          <div className="mt-16">
            <CourseCreatorForm />
          </div>
        </div>
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
