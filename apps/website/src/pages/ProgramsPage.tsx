import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SEO from "@/components/SEO";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { useUI } from "@shared/contexts/UIContext";
import { Link } from "react-router-dom";

export default function ProgramsPage() {
  const { lang } = useLanguage();
  const { openShareModal } = useUI();
  const isEs = lang === "es";
  const t = (en: string, es: string) => (isEs ? es : en);

  const programs = [
    {
      title: t("The Pledge", "El Compromiso"),
      body: t(
        "Anyone, anywhere can pledge to perform acts of kindness during the Kindness Season (November 1 – January 31). When you commit, we send seasonal reminders and ideas, and your pledge counts toward our global goal of 1 billion acts of kindness.",
        "Cualquier persona, en cualquier lugar, puede comprometerse a realizar actos de bondad durante la Temporada de Bondad (1 de noviembre – 31 de enero). Cuando te comprometes, te enviamos recordatorios e ideas, y tu compromiso cuenta hacia nuestra meta global de 1,000 millones de actos de bondad."
      ),
      link: "/commit",
      cta: t("Make your pledge", "Haz tu compromiso"),
    },
    {
      title: t("Volunteers", "Voluntarios"),
      body: t(
        "Volunteers help coordinate local activations, document acts of kindness, support outreach, and bring the campaign into their neighborhoods. Volunteering is unpaid and open to anyone 13+ (with parent permission if under 18).",
        "Las personas voluntarias coordinan activaciones locales, documentan actos de bondad, apoyan el alcance y llevan la campaña a sus vecindarios. El voluntariado es no remunerado y abierto a mayores de 13 años (con permiso de padre/madre si es menor de 18)."
      ),
      link: "/commit",
      cta: t("Volunteer with us", "Voluntariado"),
    },
    {
      title: t("Ambassadors", "Embajadores"),
      body: t(
        "Ambassadors are community leaders, creators, and organizers who commit to championing Pásalo Pa'lante in their region, school, workplace, or network. Ambassadors receive a toolkit, direct support from the Te Amo PR team, and recognition on the site.",
        "Los embajadores son líderes comunitarios, creadores y organizadores que se comprometen a impulsar Pásalo Pa'lante en su región, escuela, trabajo o red. Reciben un kit de herramientas, apoyo directo del equipo de Te Amo PR y reconocimiento en el sitio."
      ),
      link: "/commit",
      cta: t("Become an ambassador", "Sé un embajador"),
    },
    {
      title: t("Schools", "Escuelas"),
      body: t(
        "Schools (K-12 and universities) can participate as a class, club, or whole institution. We provide age-appropriate kindness prompts, classroom activities, and a way for students to log their acts safely without sharing personal data publicly.",
        "Las escuelas (K-12 y universidades) pueden participar como salón, club o institución completa. Proveemos consignas de bondad apropiadas para cada edad, actividades de salón y una forma segura para que estudiantes registren sus actos sin compartir datos personales públicamente."
      ),
      link: "/contact",
      cta: t("Bring it to your school", "Llévalo a tu escuela"),
    },
    {
      title: t("Partners", "Socios"),
      body: t(
        "Nonprofits, municipalities, companies, and faith communities can join as partners. Partners co-host activations, sponsor kindness initiatives, share storytelling, and help expand the movement's reach in their community.",
        "Organizaciones sin fines de lucro, municipios, empresas y comunidades de fe pueden unirse como socios. Los socios co-organizan activaciones, patrocinan iniciativas, comparten narrativas y ayudan a expandir el alcance del movimiento."
      ),
      link: "/contact",
      cta: t("Partner with us", "Sé un socio"),
    },
    {
      title: t("Acts of Kindness", "Actos de Bondad"),
      body: t(
        "Anyone can log an act of kindness — one they did, received, or witnessed. Submissions are moderated to keep the Wall of Kindness safe and welcoming. Acts contribute to the global count and may be featured anonymously or with permission.",
        "Cualquier persona puede registrar un acto de bondad — que hizo, recibió o presenció. Los envíos son moderados para mantener el Muro de la Bondad seguro y acogedor. Los actos contribuyen al conteo global y pueden destacarse anónimamente o con permiso."
      ),
      link: "/share",
      cta: t("Share an act", "Comparte un acto"),
    },
  ];

  return (
    <div className="min-h-screen bg-warm-cream">
      <SEO
        title={t(
          "Programs & How It Works — Pásalo Pa'lante",
          "Programas y Cómo Funciona — Pásalo Pa'lante"
        )}
        description={t(
          "Pledges, volunteers, ambassadors, schools, partners, and kindness acts — how Pásalo Pa'lante and Te Amo PR mobilize a global kindness movement.",
          "Compromisos, voluntarios, embajadores, escuelas, socios y actos de bondad — cómo Pásalo Pa'lante y Te Amo PR movilizan un movimiento global de bondad."
        )}
        path="/programs"
      />
      <Navbar />
      <main className="pt-32 pb-20 section-padding">
        <article className="max-w-4xl mx-auto">
          <header className="mb-12 text-center">
            <p className="eyebrow">Pásalo Pa'lante</p>
            <h1 className="headline-xl text-warm-earth mt-3 mb-4">
              {t("Programs & How It Works", "Programas y Cómo Funciona")}
            </h1>
            <p className="text-base md:text-lg text-foreground/75 leading-relaxed max-w-2xl mx-auto">
              {t(
                "Pásalo Pa'lante is a sister initiative of Te Amo PR, a U.S. 501(c)(3) nonprofit (EIN 66-0975633). Each season we mobilize people through six connected programs.",
                "Pásalo Pa'lante es una iniciativa hermana de Te Amo PR, una organización sin fines de lucro 501(c)(3) (EIN 66-0975633). Cada temporada movilizamos personas mediante seis programas conectados."
              )}
            </p>
          </header>

          <div className="space-y-6">
            {programs.map((p) => (
              <section
                key={p.title}
                className="bg-white/70 border border-warm-earth/10 rounded-2xl p-6 md:p-8"
              >
                <h2 className="font-display text-2xl text-warm-earth mb-3">{p.title}</h2>
                <p className="text-foreground/80 leading-relaxed mb-4">{p.body}</p>
                {p.link === "/share" ? (
                  <button
                    type="button"
                    onClick={() => openShareModal()}
                    className="text-primary hover:underline font-medium"
                  >
                    {p.cta} →
                  </button>
                ) : (
                  <Link to={p.link} className="text-primary hover:underline font-medium">
                    {p.cta} →
                  </Link>
                )}
              </section>
            ))}
          </div>

          <section className="mt-16 text-center bg-warm-earth/5 border border-warm-earth/10 rounded-2xl p-8">
            <h2 className="font-display text-2xl text-warm-earth mb-3">
              {t("The Kindness Season", "La Temporada de Bondad")}
            </h2>
            <p className="text-foreground/80 leading-relaxed max-w-2xl mx-auto">
              {t(
                "Every program builds toward the Kindness Season — November 1 through January 31 — when we aim to spark 1 billion documented acts of kindness worldwide.",
                "Cada programa construye hacia la Temporada de Bondad — del 1 de noviembre al 31 de enero — cuando buscamos generar 1,000 millones de actos de bondad documentados en todo el mundo."
              )}
            </p>
          </section>
        </article>
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
