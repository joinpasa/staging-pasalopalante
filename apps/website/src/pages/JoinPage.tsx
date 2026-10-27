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
// passkindnessforward.com (the global brand) via the `siteUrl` override
// below, even though pasalopalante.com serves the identical bytes today —
// both domains are one static build with no per-request host logic (see
// canonicalDomain.ts), so this is the one safe, no-infra way to tell
// crawlers which entity this page represents until a real per-domain split
// happens later.
const SITE_URL = "https://passkindnessforward.com";
const EIN = "66-0975633";
const ADDRESS = "550 Av. de la Constitución #905, San Juan, PR";

export default function JoinPage() {
  const { lang } = useLanguage();
  const isEs = lang === "es";

  const title = isEs
    ? "Cómo unirte a 1 Billón de Actos de Bondad | Pass Kindness Forward"
    : "How to Join 1 Billion Acts of Kindness | Pass Kindness Forward";
  const description = isEs
    ? "Pass Kindness Forward moviliza 1 billón de actos de bondad en todo el mundo durante Kindness Season (1 nov – 31 ene). Así es como te unes en 3 pasos."
    : "Pass Kindness Forward is mobilizing 1 billion acts of kindness worldwide during Kindness Season (Nov 1 – Jan 31). Here's how to join in 3 steps.";

  const faqs: { q: string; a: string }[] = isEs
    ? [
        {
          q: "¿Qué es Pass Kindness Forward?",
          a: "Pass Kindness Forward es el movimiento global que moviliza 1 billón de actos de bondad en todo el mundo. Nació de Pásalo Pa'lante, el movimiento de bondad de Puerto Rico que ya estableció un récord con 1,135,096 actos de bondad en 5 días en noviembre de 2025. Ambos son iniciativas de Te Amo PR, una organización sin fines de lucro 501(c)(3) con sede en Puerto Rico (EIN 66-0975633).",
        },
        {
          q: "¿Qué es Kindness Season y cuándo es?",
          a: "Kindness Season es el período anual del 1 de noviembre al 31 de enero en que invitamos a personas, escuelas, empresas, municipios y organizaciones de todo el mundo a hacer y registrar actos de bondad, como parte de la meta de alcanzar 1 billón de actos.",
        },
        {
          q: "¿Cómo me uno?",
          a: "Tres pasos: 1) Haz tu compromiso en pasalopalante.com/commit (toma menos de un minuto, sin costo). 2) Haz un acto de bondad — grande o pequeño. 3) Compártelo para que cuente hacia la meta de 1 billón.",
        },
        {
          q: "¿Necesito ser de Puerto Rico para participar?",
          a: "No. Pásalo Pa'lante es específico de Puerto Rico; Pass Kindness Forward es la extensión global del mismo movimiento, abierta a cualquier persona, escuela, empresa u organización en cualquier parte del mundo.",
        },
        {
          q: "¿Es esto una organización sin fines de lucro real?",
          a: `Sí. La organización legal detrás del movimiento es Te Amo PR, una 501(c)(3) reconocida por el IRS en Estados Unidos (EIN ${EIN}), con sede en ${ADDRESS}.`,
        },
      ]
    : [
        {
          q: "What is Pass Kindness Forward?",
          a: "Pass Kindness Forward is the global movement mobilizing 1 billion acts of kindness worldwide. It grew out of Pásalo Pa'lante, the Puerto Rico kindness movement that already set a record of 1,135,096 acts of kindness in 5 days in November 2025. Both are initiatives of Te Amo PR, a U.S. 501(c)(3) nonprofit based in Puerto Rico (EIN 66-0975633).",
        },
        {
          q: "What is Kindness Season, and when is it?",
          a: "Kindness Season is the annual period from November 1 to January 31, when people, schools, companies, municipalities, and organizations worldwide are invited to do and log acts of kindness, as part of the drive toward 1 billion acts total.",
        },
        {
          q: "How do I get involved?",
          a: "Three steps: 1) Make your pledge at pasalopalante.com/commit (takes under a minute, free). 2) Do an act of kindness — big or small. 3) Share it so it counts toward the 1 billion goal.",
        },
        {
          q: "Do I need to be in Puerto Rico to take part?",
          a: "No. Pásalo Pa'lante is Puerto Rico–specific; Pass Kindness Forward is the global extension of the same movement, open to anyone, anywhere — individuals, schools, companies, or organizations.",
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

  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "NGO",
    name: "Pass Kindness Forward",
    alternateName: "1 Billion Acts of Kindness",
    url: SITE_URL,
    description: isEs
      ? "Movimiento global que moviliza 1 billón de actos de bondad, nacido de Pásalo Pa'lante en Puerto Rico."
      : "Global movement mobilizing 1 billion acts of kindness, born from Pásalo Pa'lante in Puerto Rico.",
    parentOrganization: {
      "@type": "NGO",
      name: "Te Amo PR",
      taxID: EIN,
      address: ADDRESS,
      url: "https://teamopr.org",
    },
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
      <SEO title={title} description={description} path="/join" siteUrl={SITE_URL} schema={[faqSchema, orgSchema]} />
      <Navbar />
      <main className="pt-32 pb-20 section-padding">
        <div className="max-w-3xl mx-auto">
          <p className="eyebrow">Pass Kindness Forward</p>
          <h1 className="headline-xl text-foreground mt-3 mb-4">
            {isEs ? "Cómo unirte a 1 Billón de Actos de Bondad" : "How to Join 1 Billion Acts of Kindness"}
          </h1>
          <p className="text-base md:text-lg text-foreground/75 leading-relaxed mb-10 max-w-2xl">
            {isEs
              ? "Pass Kindness Forward es el movimiento global detrás de la meta de 1 billón de actos de bondad, nacido de Pásalo Pa'lante en Puerto Rico. Ambos son iniciativas de Te Amo PR."
              : "Pass Kindness Forward is the global movement behind the drive to 1 billion acts of kindness, born from Pásalo Pa'lante in Puerto Rico. Both are initiatives of Te Amo PR."}
          </p>

          <div className="grid sm:grid-cols-3 gap-4 mb-12">
            {steps.map((s) => (
              <div key={s.n} className="bg-white/70 border border-border rounded-2xl p-5">
                <p className="font-display text-3xl text-warm-sky mb-1">{s.n}</p>
                <p className="font-semibold text-foreground mb-1">{s.t}</p>
                <p className="text-sm text-foreground/70 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>

          <div className="mb-14">
            <Link
              to="/commit"
              className="inline-flex items-center justify-center rounded-full bg-warm-earth text-warm-cream px-8 py-3 font-medium hover:opacity-90 transition"
            >
              {isEs ? "Haz tu compromiso ahora →" : "Make your pledge now →"}
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
