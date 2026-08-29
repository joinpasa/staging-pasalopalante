import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SEO from "@/components/SEO";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { Link } from "react-router-dom";

export default function AboutPage() {
  const { lang } = useLanguage();
  const isEs = lang === "es";

  return (
    <div className="min-h-screen bg-warm-cream">
      <SEO
        title="About Pásalo Pa'lante — A Global Kindness Movement by Te Amo PR"
        description="Learn about Pásalo Pa'lante, a global kindness movement created by Te Amo PR — a U.S. 501(c)(3) nonprofit based in Puerto Rico."
        path="/about"
      />
      <Navbar />
      <main className="pt-32 pb-20 section-padding">
        <article className="max-w-3xl mx-auto">
          <p className="eyebrow">Pásalo Pa'lante</p>
          <h1 className="headline-xl text-warm-earth mt-3 mb-6">
            {isEs ? "Sobre Pásalo Pa'lante" : "About Pásalo Pa'lante"}
          </h1>

          <div className="prose prose-lg max-w-none text-foreground/80 space-y-6 leading-relaxed">
            <p>
              {isEs
                ? "Pásalo Pa'lante (PPL) es una iniciativa global de bondad creada por Te Amo PR, una organización sin fines de lucro 501(c)(3) con sede en Puerto Rico. Nuestra misión es desatar 1,000 millones de actos de bondad en todo el mundo durante la Temporada de Bondad, del 1 de noviembre al 31 de enero."
                : "Pásalo Pa'lante (PPL) is a global kindness movement created by Te Amo PR, a U.S. 501(c)(3) nonprofit organization based in Puerto Rico. Our mission is to spark 1 billion acts of kindness worldwide during the Kindness Season — November 1 through January 31."}
            </p>

            <h2 className="font-serif text-2xl text-warm-earth mt-10 mb-3">
              {isEs ? "Quiénes somos" : "Who we are"}
            </h2>
            <p>
              {isEs
                ? "Te Amo PR es una organización sin fines de lucro reconocida por el IRS bajo la sección 501(c)(3). Las donaciones son deducibles de impuestos hasta donde permite la ley. Operamos desde Puerto Rico y servimos a comunidades en todo el mundo. Pásalo Pa'lante es una iniciativa hermana de Te Amo PR."
                : "Te Amo PR is an IRS-recognized 501(c)(3) public charity. Donations are tax-deductible to the fullest extent allowed by law. We operate from Puerto Rico and serve communities around the world. Pásalo Pa'lante is a sister initiative of Te Amo PR."}
            </p>
            <ul className="list-none pl-0 space-y-1 text-sm bg-warm-cream/60 border border-warm-earth/10 rounded-lg p-4">
              <li><strong>{isEs ? "Organización legal:" : "Legal organization:"}</strong> Te Amo PR</li>
              <li><strong>{isEs ? "Estatus:" : "Status:"}</strong> {isEs ? "501(c)(3) reconocida por el IRS de EE.UU." : "U.S. IRS-recognized 501(c)(3) public charity"}</li>
              <li><strong>EIN:</strong> 66-0975633</li>
              <li><strong>{isEs ? "Dirección:" : "Address:"}</strong> 550 Av. de la Constitución #905, San Juan, PR</li>
              <li><strong>{isEs ? "Sitio:" : "Website:"}</strong> <a href="https://teamopr.org" target="_blank" rel="noopener noreferrer" className="text-primary underline">teamopr.org</a></li>
            </ul>

            <h2 className="font-serif text-2xl text-warm-earth mt-10 mb-3">
              {isEs ? "Lo que hacemos" : "What we do"}
            </h2>
            <p>
              {isEs
                ? "Cada temporada movilizamos a embajadores, voluntarios y comunidades para realizar, registrar y compartir actos de bondad. Trabajamos hacia un récord mundial Guinness por la mayor ola de bondad jamás documentada — un movimiento que pasa de una persona a otra, de un país a otro."
                : "Each season, we mobilize ambassadors, volunteers, and communities to perform, log, and share acts of kindness. We are working toward a Guinness World Record for the largest documented wave of kindness — a movement that passes from one person to the next, one country to the next."}
            </p>

            <h2 className="font-serif text-2xl text-warm-earth mt-10 mb-3">
              {isEs ? "Cómo participar" : "How to get involved"}
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <Link to="/commit" className="text-primary hover:underline">
                  {isEs ? "Comprométete o regístrate como voluntario" : "Commit or register as a volunteer"}
                </Link>
              </li>
              <li>
                <Link to="/share" className="text-primary hover:underline">
                  {isEs ? "Comparte un acto de bondad" : "Share an act of kindness"}
                </Link>
              </li>
              <li>
                <Link to="/wall" className="text-primary hover:underline">
                  {isEs ? "Visita el Muro de Bondad" : "Visit the Wall of Kindness"}
                </Link>
              </li>
              <li>
                <Link to="/donate" className="text-primary hover:underline">
                  {isEs ? "Dona para apoyar la misión" : "Donate to support the mission"}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-primary hover:underline">
                  {isEs ? "Contáctanos" : "Contact us"}
                </Link>
              </li>
            </ul>

            <h2 className="font-serif text-2xl text-warm-earth mt-10 mb-3">
              {isEs ? "Contacto" : "Contact"}
            </h2>
            <p>
              Te Amo PR · <a className="text-primary hover:underline" href="mailto:info@teamopr.org">info@teamopr.org</a> · (787) 705-0778 ·{" "}
              <a className="text-primary hover:underline" href="https://teamopr.org" target="_blank" rel="noopener noreferrer">teamopr.org</a>
            </p>
          </div>
        </article>
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
