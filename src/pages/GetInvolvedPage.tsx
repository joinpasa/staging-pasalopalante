import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SEO from "@/components/SEO";
import CourseCreatorForm from "@/components/CourseCreatorForm";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "react-router-dom";

export default function GetInvolvedPage() {
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const t = (en: string, es: string) => (isEs ? es : en);

  const groups = [
    {
      title: t("Individuals & Families", "Personas y familias"),
      body: t(
        "Pledge to perform acts of kindness during the Kindness Season. Invite a friend, neighbor, or family member to pass it forward.",
        "Comprométete a realizar actos de bondad durante la Temporada de Bondad. Invita a un amigo, vecino o familiar a pasarla."
      ),
      cta: t("Make your pledge", "Haz tu compromiso"),
      link: "/commit",
    },
    {
      title: t("Schools & Educators", "Escuelas y educadores"),
      body: t(
        "Bring Pásalo Pa'lante into your classroom or campus with age-appropriate kindness prompts, classroom activities, and student leadership opportunities.",
        "Lleva Pásalo Pa'lante a tu salón o campus con consignas, actividades y oportunidades de liderazgo estudiantil apropiadas para cada edad."
      ),
      cta: t("Bring it to your school", "Llévalo a tu escuela"),
      link: "/contact",
    },
    {
      title: t("Nonprofits & Faith Communities", "ONGs y comunidades de fe"),
      body: t(
        "Co-host activations, share kindness resources with your community, and amplify a mission-aligned global movement rooted in service.",
        "Co-organiza activaciones, comparte recursos con tu comunidad y amplifica un movimiento global alineado con tu misión de servicio."
      ),
      cta: t("Partner with us", "Sé un socio"),
      link: "/contact",
    },
    {
      title: t("Companies & Brands", "Empresas y marcas"),
      body: t(
        "Sponsor the movement, activate kindness campaigns inside your workplace, and align your brand with measurable community impact.",
        "Patrocina el movimiento, activa campañas de bondad en tu lugar de trabajo y alinea tu marca con impacto comunitario medible."
      ),
      cta: t("Become a sponsor", "Sé un patrocinador"),
      link: "/contact",
    },
    {
      title: t("Municipalities & Civic Leaders", "Municipios y líderes cívicos"),
      body: t(
        "Declare a Kindness Season in your city, support public service activations, and help unite residents through civic kindness.",
        "Declara una Temporada de Bondad en tu ciudad, apoya activaciones de servicio público y une a tus residentes a través de la bondad cívica."
      ),
      cta: t("Get in touch", "Contáctanos"),
      link: "/contact",
    },
    {
      title: t("Ambassadors", "Embajadores"),
      body: t(
        "Community leaders, creators, and organizers who champion Pásalo Pa'lante in their region, network, or platform. Receive a toolkit and direct support from the Te Amo PR team.",
        "Líderes comunitarios, creadores y organizadores que impulsan Pásalo Pa'lante en su región, red o plataforma. Reciben un kit y apoyo directo del equipo de Te Amo PR."
      ),
      cta: t("Become an ambassador", "Sé un embajador"),
      link: "/commit",
    },
  ];

  return (
    <div className="min-h-screen bg-warm-cream">
      <SEO
        title={t(
          "Get Involved | Pásalo Pa'lante",
          "Participa | Pásalo Pa'lante"
        )}
        description={t(
          "Join Pásalo Pa'lante as an individual, family, school, nonprofit, company, municipality, ambassador, or partner.",
          "Únete a Pásalo Pa'lante como persona, familia, escuela, ONG, empresa, municipio, embajador o socio."
        )}
        path="/get-involved"
      />
      <Navbar />
      <main className="pt-32 pb-20 section-padding">
        <div className="max-w-4xl mx-auto">
          <p className="eyebrow">Pásalo Pa'lante</p>
          <h1 className="headline-xl text-warm-earth mt-3 mb-4">
            {t("Get Involved", "Participa")}
          </h1>
          <p className="text-base md:text-lg text-foreground/75 leading-relaxed mb-10 max-w-2xl">
            {t(
              "There is no single way to pass kindness forward. Pásalo Pa'lante welcomes individuals, families, students, educators, nonprofits, businesses, civic leaders, and institutions that want to help build a more compassionate world. Pásalo Pa'lante is a sister initiative of Te Amo PR, a U.S. 501(c)(3) nonprofit (EIN 66-0975633).",
              "No hay una sola forma de pasar la bondad. Pásalo Pa'lante recibe a personas, familias, estudiantes, educadores, ONGs, empresas, líderes cívicos e instituciones que quieren construir un mundo más compasivo. Pásalo Pa'lante es una iniciativa hermana de Te Amo PR, una organización sin fines de lucro 501(c)(3) de EE.UU. (EIN 66-0975633)."
            )}
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
              {t("Support the movement", "Apoya el movimiento")}
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
