import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SEO from "@/components/SEO";
import { useLanguage } from "@shared/contexts/LanguageContext";

export default function CommunityGuidelinesPage() {
  const { lang } = useLanguage();
  const isEs = lang === "es";

  return (
    <div className="min-h-screen bg-warm-cream">
      <SEO
        title="Community Guidelines — Pásalo Pa'lante"
        description="Our community guidelines help keep Pásalo Pa'lante a safe, welcoming, and respectful space for sharing acts of kindness."
        path="/community-guidelines"
      />
      <Navbar />
      <main className="pt-32 pb-20 section-padding">
        <article className="max-w-3xl mx-auto">
          <header className="mb-10 text-center">
            <p className="eyebrow">Pásalo Pa'lante</p>
            <h1 className="headline-xl text-warm-earth mt-3">
              {isEs ? "Normas de la Comunidad" : "Community Guidelines"}
            </h1>
            <p className="text-sm text-foreground/60 mt-3">
              {isEs ? "Versión 1.0" : "Version 1.0"}
            </p>
          </header>

          <section className="space-y-5 text-foreground/85 leading-relaxed text-base md:text-lg">
            <p>
              {isEs
                ? "Pásalo Pa'lante es un espacio para celebrar la bondad. Estas normas mantienen la comunidad cálida, segura y centrada en lo que importa."
                : "Pásalo Pa'lante is a space to celebrate kindness. These guidelines keep the community warm, safe, and centered on what matters."}
            </p>

            <h2 className="font-display text-2xl text-warm-earth mt-8">
              {isEs ? "Sé real" : "Be real"}
            </h2>
            <p>
              {isEs
                ? "Comparte actos genuinos de bondad — realizados, presenciados o recibidos. No envíes contenido inventado, exagerado ni copiado de otra persona sin atribución."
                : "Share genuine acts of kindness — performed, witnessed, or received. Don't submit invented, exaggerated, or copied content without attribution."}
            </p>

            <h2 className="font-display text-2xl text-warm-earth mt-8">
              {isEs ? "Sé respetuoso" : "Be respectful"}
            </h2>
            <p>
              {isEs
                ? "No publiques contenido que sea de odio, acoso, sexualmente explícito, violento o discriminatorio. Trata a todos con la misma bondad que estás celebrando."
                : "Don't post content that is hateful, harassing, sexually explicit, violent, or discriminatory. Treat everyone with the kindness you're celebrating."}
            </p>

            <h2 className="font-display text-2xl text-warm-earth mt-8">
              {isEs ? "Protege la privacidad de otros" : "Protect others' privacy"}
            </h2>
            <p>
              {isEs
                ? "Si alguien es identificable en tu foto o video, debes tener su permiso (o el de su padre/tutor si es menor de 18). No publiques información de contacto de otra persona, dirección, número de teléfono u otros datos personales."
                : "If someone is identifiable in your photo or video, you must have their permission (or their parent's permission if they're under 18). Don't post another person's contact information, address, phone number, or other personal data."}
            </p>

            <h2 className="font-display text-2xl text-warm-earth mt-8">
              {isEs ? "Mantente en tema" : "Stay on topic"}
            </h2>
            <p>
              {isEs
                ? "Esta plataforma es para historias de bondad. No es un lugar para publicidad, promociones, recaudación de fondos no relacionada, contenido político partidista ni spam."
                : "This platform is for kindness stories. It's not a place for advertising, promotions, unrelated fundraising, partisan political content, or spam."}
            </p>

            <h2 className="font-display text-2xl text-warm-earth mt-8">
              {isEs ? "Edad mínima" : "Minimum age"}
            </h2>
            <p>
              {isEs
                ? "Debes tener al menos 13 años para usar esta plataforma. Los usuarios entre 13 y 17 años tienen protecciones de visibilidad adicionales por defecto."
                : "You must be at least 13 years old to use this platform. Users aged 13-17 get additional visibility protections by default."}
            </p>

            <h2 className="font-display text-2xl text-warm-earth mt-8">
              {isEs ? "Cumplimiento" : "Enforcement"}
            </h2>
            <p>
              {isEs
                ? "Podemos eliminar contenido o suspender cuentas que violen estas normas. Si crees que algo se eliminó por error, escríbenos a "
                : "We may remove content or suspend accounts that break these rules. If you think something was removed by mistake, email "}
              <a href="mailto:info@teamopr.org" className="text-primary underline">info@teamopr.org</a>.
            </p>

            <h2 className="font-display text-2xl text-warm-earth mt-8">
              {isEs ? "Reportar contenido" : "Report content"}
            </h2>
            <p>
              {isEs
                ? "Si ves algo que viola estas normas, escríbenos a "
                : "If you see something that violates these guidelines, email "}
              <a href="mailto:info@teamopr.org" className="text-primary underline">info@teamopr.org</a>
              {isEs ? " con un enlace y una breve descripción." : " with a link and brief description."}
            </p>

            <p className="text-sm text-foreground/60 mt-10">
              {isEs
                ? "Pásalo Pa'lante es una iniciativa hermana de Te Amo PR, una organización sin fines de lucro 501(c)(3) (EIN 66-0975633), 550 Av. de la Constitución #905, San Juan, PR."
                : "Pásalo Pa'lante is a sister initiative of Te Amo PR, a U.S. 501(c)(3) nonprofit (EIN 66-0975633), 550 Av. de la Constitución #905, San Juan, PR."}
            </p>
          </section>
        </article>
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
