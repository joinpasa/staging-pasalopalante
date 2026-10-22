import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SEO from "@/components/SEO";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { useScrollToHash } from "@/hooks/useScrollToHash";

export default function TermsPage() {
  const { lang } = useLanguage();
  const es = lang === "es";
  useScrollToHash();
  return (
    <div className="min-h-screen bg-warm-cream">
      <SEO
        title="Terms of Service — Pásalo Pa'lante"
        description="Review the Terms of Service for Pásalo Pa'lante and Te Amo PR's global kindness movement platform."
        path="/terms"
      />
      <Navbar />
      <main className="pt-32 pb-20 section-padding">
        <article className="max-w-3xl mx-auto prose prose-neutral">
          <header className="mb-10 text-center">
            <p className="eyebrow">Pásalo Pa'lante</p>
            <h1 className="headline-xl text-foreground mt-3">
              {lang === "es" ? "Términos de Servicio" : "Terms of Service"}
            </h1>
            <p className="text-sm text-foreground/60 mt-3">
              {lang === "es" ? "Versión 1.0" : "Version 1.0"}
            </p>
          </header>

          <section className="space-y-6 text-foreground/85 leading-relaxed text-base md:text-lg">
            <p>
              {lang === "es"
                ? "Bienvenido a Pásalo Pa'lante, una iniciativa hermana de Te Amo PR, una organización sin fines de lucro estadounidense 501(c)(3) (EIN 66-0975633) con sede en 550 Av. de la Constitución #905, San Juan, PR. Al participar — registrando un acto de bondad, subiendo una foto, comprometiéndote en noviembre o creando una cuenta — aceptas estos Términos y Condiciones."
                : "Welcome to Pásalo Pa'lante, a sister initiative of Te Amo PR, a U.S. 501(c)(3) nonprofit (EIN 66-0975633) based at 550 Av. de la Constitución #905, San Juan, PR. By participating — submitting an act of kindness, uploading a photo, pledging in November, or creating an account — you agree to these Terms & Conditions."}
            </p>

            <h2 className="font-display text-2xl text-foreground mt-8">
              {lang === "es" ? "Quiénes somos" : "Who we are"}
            </h2>
            <p>
              {lang === "es"
                ? "Pásalo Pa'lante es operado por Te Amo PR. Las referencias a 'nosotros' significan Te Amo PR actuando a través de la iniciativa Pásalo Pa'lante."
                : "Pásalo Pa'lante is operated by Te Amo PR. References to \"we,\" \"us,\" or \"our\" mean Te Amo PR acting through the Pásalo Pa'lante initiative."}
            </p>

            <h2 className="font-display text-2xl text-foreground mt-8">
              {lang === "es" ? "Elegibilidad" : "Eligibility"}
            </h2>
            <p>
              {lang === "es"
                ? "Debes tener al menos 13 años para crear una cuenta o enviar contenido. Los menores de 18 años deben tener permiso de un padre o tutor para enviar fotos en las que aparezcan."
                : "You must be at least 13 years old to create an account or submit content. Anyone under 18 must have parent or guardian permission to submit photos in which they appear."}
            </p>

            <h2 className="font-display text-2xl text-foreground mt-8">
              {lang === "es" ? "Tu contenido" : "Your content"}
            </h2>
            <p>
              {lang === "es"
                ? "Tú conservas la propiedad del texto y las fotos que envíes. Al enviarlos, otorgas a Te Amo PR / Pásalo Pa'lante una licencia mundial, no exclusiva y libre de regalías para mostrarlos, reproducirlos y compartirlos en materiales de la campaña (sitio web, redes sociales, prensa, presentaciones)."
                : "You retain ownership of any text and photos you submit. By submitting them you grant Te Amo PR / Pásalo Pa'lante a worldwide, non-exclusive, royalty-free license to display, reproduce, and share them in campaign materials (website, social media, press, presentations)."}
            </p>

            <h2 className="font-display text-2xl text-foreground mt-8">
              {lang === "es" ? "Permiso de fotos" : "Photo permission"}
            </h2>
            <p>
              {lang === "es"
                ? "Solo subes fotos para las que tengas el derecho y permiso de las personas reconocibles que aparezcan en ellas."
                : "You only upload photos for which you have the right and permission of any recognizable people who appear in them."}
            </p>

            <h2 className="font-display text-2xl text-foreground mt-8">
              {lang === "es" ? "Conducta" : "Conduct"}
            </h2>
            <p>
              {lang === "es"
                ? "No envíes contenido ilegal, odioso, acosador, explícito o engañoso. No uses el sitio para spam, fraude, suplantación de identidad o promoción comercial sin autorización. Podemos remover contenido o cuentas que violen estas reglas."
                : "Do not submit content that is unlawful, hateful, harassing, explicit, or misleading. Do not use the site for spam, fraud, impersonation, or unauthorized commercial promotion. We may remove content or accounts that break these rules."}
            </p>

            <h2 className="font-display text-2xl text-foreground mt-8">
              {lang === "es" ? "Donaciones" : "Donations"}
            </h2>
            <p>
              {lang === "es"
                ? "Las donaciones realizadas a través de Pásalo Pa'lante apoyan la misión sin fines de lucro de Te Amo PR. Te Amo PR es una organización 501(c)(3) y las donaciones son deducibles de impuestos hasta donde permite la ley de EE.UU. Las donaciones se procesan mediante procesadores de pago externos (como PayPal); no almacenamos números completos de tarjeta."
                : "Donations made through Pásalo Pa'lante support the nonprofit mission of Te Amo PR. Te Amo PR is a 501(c)(3) organization and donations are tax-deductible to the fullest extent allowed by U.S. law. Donations are processed by third-party payment processors (such as PayPal); we do not store full credit card numbers."}
            </p>

            <h2 className="font-display text-2xl text-foreground mt-8">
              {lang === "es" ? "Sin garantías" : "No warranties"}
            </h2>
            <p>
              {lang === "es"
                ? "El sitio se ofrece 'tal cual'. En la máxima medida permitida por la ley, Te Amo PR no es responsable de daños indirectos, incidentales o consecuentes derivados del uso del sitio."
                : "The site is provided \"as is.\" To the maximum extent permitted by law, Te Amo PR is not liable for indirect, incidental, or consequential damages arising from your use of the site."}
            </p>

            <h2 className="font-display text-2xl text-foreground mt-8">
              {lang === "es" ? "Cambios" : "Changes"}
            </h2>
            <p>
              {lang === "es"
                ? "Podemos actualizar estos Términos. Los cambios materiales serán anunciados en este sitio."
                : "We may update these Terms. Material changes will be announced on this site."}
            </p>

            {/* SMS Terms — A2P 10DLC carrier-review language. Wording and the
                (575) 577-7277 number are fixed by the campaign registration;
                linked as /terms#sms from the SMS consent checkbox. Keywords
                (STOP, HELP, START, KINDNESS, JOIN) stay in English in every
                language — they're what carriers and the platform listen for. */}
            <h2 id="sms" className="font-display text-2xl text-foreground mt-8 scroll-mt-40">
              {es ? "Términos de SMS" : "SMS Terms"}
            </h2>
            <p>
              <strong>{es ? "Programa:" : "Program:"}</strong>{" "}
              {es
                ? "Pass Kindness Forward, una iniciativa de Te Amo PR, envía mensajes de texto sobre eventos (como la Transmisión Global de Bondad), novedades del programa durante la Temporada Global de Bondad, oportunidades de voluntariado e invitaciones a registrar actos de bondad."
                : "Pass Kindness Forward, an initiative of Te Amo PR, sends text messages about events (such as the Global Kindness Broadcast), program updates during Global Kindness Season, volunteer opportunities, and invitations to log acts of kindness."}
            </p>
            <p>
              <strong>{es ? "Cómo suscribirte:" : "How to opt in:"}</strong>{" "}
              {es
                ? "Marca la casilla opcional de consentimiento de SMS en nuestros formularios de registro o de Involúcrate, o envía un mensaje de texto con KINDNESS o JOIN al (575) 577-7277."
                : "Check the optional SMS consent box on our sign-up or Get Involved forms, or text KINDNESS or JOIN to (575) 577-7277."}
            </p>
            <p>
              <strong>{es ? "Frecuencia y costo:" : "Frequency and cost:"}</strong>{" "}
              {es
                ? "La frecuencia de los mensajes varía. Pueden aplicar tarifas de mensajes y datos."
                : "Message frequency varies. Message and data rates may apply."}
            </p>
            <p>
              <strong>{es ? "Cancelar la suscripción:" : "Opting out:"}</strong>{" "}
              {es
                ? "Responde STOP para cancelar en cualquier momento. Recibirás un mensaje de confirmación y ningún otro mensaje de texto. Responde START para volver a suscribirte."
                : "Reply STOP to cancel at any time. You will receive one confirmation message and no further texts. Reply START to rejoin."}
            </p>
            <p>
              <strong>{es ? "Ayuda:" : "Help:"}</strong>{" "}
              {es ? "Responde HELP para obtener ayuda, o escríbenos a " : "Reply HELP for help, or contact us at "}
              <a href="mailto:info@passkindnessforward.com" className="text-warm-sky underline">info@passkindnessforward.com</a>.
            </p>
            <p>
              {es
                ? "Los operadores no son responsables de mensajes retrasados o no entregados. El consentimiento para recibir mensajes de texto no es una condición para ninguna compra ni participación."
                : "Carriers are not liable for delayed or undelivered messages. Consent to receive text messages is not a condition of any purchase or participation."}
            </p>
            <p>
              {es ? "Consulta nuestra Política de Privacidad en " : "See our Privacy Policy at "}
              <a href="https://pasalopalante.com/privacy#sms" className="text-warm-sky underline">https://pasalopalante.com/privacy#sms</a>.
            </p>

            <h2 className="font-display text-2xl text-foreground mt-8">
              {lang === "es" ? "Privacidad" : "Privacy"}
            </h2>
            <p>
              {lang === "es"
                ? "Manejamos tus datos según nuestra "
                : "We handle your data under our "}
              <a href="/privacy" className="text-warm-sky underline">{lang === "es" ? "Política de Privacidad" : "Privacy Policy"}</a>.
            </p>

            <h2 className="font-display text-2xl text-foreground mt-8">
              {lang === "es" ? "Contacto" : "Contact"}
            </h2>
            <p>
              Te Amo PR · 550 Av. de la Constitución #905, San Juan, PR · EIN 66-0975633 ·{" "}
              <a href="mailto:info@passkindnessforward.com" className="text-warm-sky underline">info@passkindnessforward.com</a> · (787) 705-0778
            </p>
          </section>
        </article>
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
