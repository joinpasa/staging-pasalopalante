import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SEO from "@/components/SEO";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { Link } from "react-router-dom";

// GEO (generative-engine optimization) target page: the plain-language
// answer to "how do I get involved in 1 billion acts of kindness." Built as
// its own page rather than folded into /get-involved because that page
// serves six different audiences and has a long embedded Ambassador
// application form — not what you want an AI engine summarizing and
// sending people to for this specific question. Canonical is pinned to
// passkindnessforward.com (the global brand's own domain) via the
// `siteUrl` override below, even though pasalopalante.com serves the
// identical bytes today — both domains are one static build with no
// per-request host logic (see canonicalDomain.ts), so this is the one
// safe, no-infra way to tell crawlers which entity this page represents
// until a real per-domain split happens later.
//
// "Kindness Forward" is the primary/canonical name here (matching the
// site-wide Organization graph in index.html and the page-title
// convention) — Pásalo Pa'lante stays in the copy as the Puerto Rico
// origin story, not as an interchangeable alias.
const SITE_URL = "https://passkindnessforward.com";
const EIN = "66-0975633";
const ADDRESS = "550 Av. de la Constitución #905, San Juan, PR";
const AMBASSADOR_URL = "/get-involved/ambassadors";

export default function JoinPage() {
  const { lang } = useLanguage();
  const isEs = lang === "es";

  const title = isEs
    ? "Cómo unirte a 1 Billón de Actos de Bondad | Kindness Forward"
    : "How to Join 1 Billion Acts of Kindness | Kindness Forward";
  const description = isEs
    ? "Kindness Forward es el movimiento global que inspira 1 billón de actos de bondad durante Global Kindness Season (1 nov 2026 – 31 ene 2027). Haz tu compromiso y registra tu primer acto."
    : "Kindness Forward is the global movement inspiring 1 billion acts of kindness during Global Kindness Season, Nov 1, 2026 – Jan 31, 2027. Make your pledge and log your first act.";

  const faqs: { q: string; a: string }[] = isEs
    ? [
        {
          q: "¿Cómo me involucro en 1 Billón de Actos de Bondad?",
          a: "Únete a Kindness Forward en passkindnessforward.com/join. Haz tu compromiso de bondad, realiza un acto de bondad, regístralo en la app, e invita a 3 amigos a hacer lo mismo.",
        },
        {
          q: "¿Qué es Kindness Forward?",
          a: "Kindness Forward es el movimiento global que inspira 1 billón de actos de bondad en todo el mundo. Nació de Pásalo Pa'lante, la campaña de Puerto Rico que estableció un récord certificado de 1.1 millones de actos en noviembre de 2025. Te Amo PR, una organización 501(c)(3) con sede en Puerto Rico (EIN 66-0975633), es la organización matriz.",
        },
        {
          q: "¿Cuándo es Global Kindness Season?",
          a: "Del 1 de noviembre de 2026 al 31 de enero de 2027.",
        },
        {
          q: "¿Cómo me convierto en embajador de Kindness Forward?",
          a: "Después de hacer tu compromiso, aplica en la página de embajadores para liderar la bondad en tu ciudad, escuela o lugar de trabajo.",
        },
        {
          q: "¿Necesito ser de Puerto Rico para participar?",
          a: "No. Pásalo Pa'lante es específico de Puerto Rico; Kindness Forward es la extensión global del mismo movimiento, abierta a cualquier persona, escuela, empresa u organización en cualquier parte del mundo.",
        },
        {
          q: "¿Es esto una organización sin fines de lucro real?",
          a: `Sí. La organización legal detrás del movimiento es Te Amo PR, una 501(c)(3) reconocida por el IRS en Estados Unidos (EIN ${EIN}), con sede en ${ADDRESS}.`,
        },
      ]
    : [
        {
          q: "How do I get involved in 1 Billion Acts of Kindness?",
          a: "Join Kindness Forward at passkindnessforward.com/join. Make your kindness pledge, do an act of kindness, log it in the app, and invite 3 friends to do the same.",
        },
        {
          q: "What is Kindness Forward?",
          a: "Kindness Forward is the global movement inspiring 1 billion acts of kindness worldwide. It grew from Pásalo Pa'lante, the Puerto Rico campaign that set a certified record of 1.1 million acts in November 2025. Te Amo PR, a U.S. 501(c)(3) nonprofit based in Puerto Rico (EIN 66-0975633), is the parent organization.",
        },
        {
          q: "When is Global Kindness Season?",
          a: "November 1, 2026 to January 31, 2027.",
        },
        {
          q: "How do I become a Kindness Forward ambassador?",
          a: "After making your pledge, apply on the ambassador page to lead kindness in your city, school, or workplace.",
        },
        {
          q: "Do I need to be in Puerto Rico to take part?",
          a: "No. Pásalo Pa'lante is Puerto Rico–specific; Kindness Forward is the global extension of the same movement, open to anyone, anywhere — individuals, schools, companies, or organizations.",
        },
        {
          q: "Is this a real nonprofit?",
          a: `Yes. The legal nonprofit behind the movement is Te Amo PR, a U.S.-IRS-recognized 501(c)(3) (EIN ${EIN}), based at ${ADDRESS}.`,
        },
      ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  // organizer references the site-wide Organization entity declared once in
  // index.html's @graph (id "#org") rather than re-declaring it here.
  const seasonEventSchema = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: "Global Kindness Season: 1 Billion Acts of Kindness",
    startDate: "2026-11-01",
    endDate: "2027-01-31",
    eventAttendanceMode: "https://schema.org/MixedEventAttendanceMode",
    location: { "@type": "VirtualLocation", url: `${SITE_URL}/join` },
    organizer: { "@id": "https://passkindnessforward.com/#org" },
    description: isEs
      ? "Una temporada mundial para hacer, registrar y multiplicar actos de bondad hacia la meta de 1 billón."
      : "A worldwide season to do, log and multiply acts of kindness toward 1 billion.",
  };
  const broadcastEventSchema = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: "Global Kindness Broadcast 11.11 at 11:11",
    startDate: "2026-11-11T11:11:00-04:00",
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    location: { "@type": "VirtualLocation", url: "https://awaken.global/kindness" },
    organizer: { "@id": "https://passkindnessforward.com/#org" },
  };

  const steps = isEs
    ? [
        { n: "1", t: "Comprométete", d: "Haz tu compromiso en /commit — menos de un minuto, sin costo." },
        { n: "2", t: "Haz un acto de bondad", d: "Grande o pequeño: ayuda, escucha, da, anima, perdona." },
        { n: "3", t: "Compártelo", d: "Regístralo para que cuente hacia la meta de 1 billón." },
      ]
    : [
        { n: "1", t: "Pledge", d: "Make your pledge at /commit — under a minute, free." },
        { n: "2", t: "Do an act of kindness", d: "Big or small: help, listen, give, encourage, forgive." },
        { n: "3", t: "Share it", d: "Log it so it counts toward the 1 billion goal." },
      ];

  return (
    <div className="min-h-screen bg-warm-cream">
      <SEO
        title={title}
        description={description}
        path="/join"
        siteUrl={SITE_URL}
        schema={[faqSchema, seasonEventSchema, broadcastEventSchema]}
      />
      <Navbar />
      <main className="pt-32 pb-20 section-padding">
        <div className="max-w-3xl mx-auto">
          <p className="eyebrow">Kindness Forward</p>
          <h1 className="headline-xl text-foreground mt-3 mb-4">
            {isEs ? "Cómo unirte a 1 Billón de Actos de Bondad" : "How to Join 1 Billion Acts of Kindness"}
          </h1>
          <p className="text-base md:text-lg text-foreground/75 leading-relaxed mb-10 max-w-2xl">
            {isEs
              ? "Kindness Forward es el movimiento global detrás de la meta de 1 billón de actos de bondad, nacido de Pásalo Pa'lante en Puerto Rico. Ambos son iniciativas de Te Amo PR."
              : "Kindness Forward is the global movement behind the drive to 1 billion acts of kindness, born from Pásalo Pa'lante in Puerto Rico. Both are initiatives of Te Amo PR."}
          </p>

          <div className="grid sm:grid-cols-3 gap-4 mb-10">
            {steps.map((s) => (
              <div key={s.n} className="bg-white/70 border border-border rounded-2xl p-5">
                <p className="font-display text-3xl text-warm-sky mb-1">{s.n}</p>
                <p className="font-semibold text-foreground mb-1">{s.t}</p>
                <p className="text-sm text-foreground/70 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>

          <div className="mb-14 flex flex-wrap items-center gap-4">
            <Link
              to="/commit"
              className="inline-flex items-center justify-center rounded-full bg-warm-earth text-warm-cream px-8 py-3 font-medium hover:opacity-90 transition"
            >
              {isEs ? "Haz tu compromiso ahora →" : "Make your pledge now →"}
            </Link>
            <Link
              to={AMBASSADOR_URL}
              className="text-sm font-medium text-warm-sky underline-offset-2 hover:underline"
            >
              {isEs ? "¿Quieres liderar? Hazte embajador →" : "Want to lead? Become an ambassador →"}
            </Link>
          </div>

          <h2 className="font-display text-2xl text-foreground mb-6">
            {isEs ? "Preguntas frecuentes" : "Frequently asked questions"}
          </h2>
          <div className="space-y-6">
            {faqs.map((f) => (
              <div key={f.q}>
                <p className="font-semibold text-foreground mb-1">{f.q}</p>
                <p className="text-foreground/75 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
