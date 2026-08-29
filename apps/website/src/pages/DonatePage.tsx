import Navbar from "@/components/Navbar";
import DonateStrip from "@/components/DonateStrip";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SEO from "@/components/SEO";
import { useLanguage } from "@shared/contexts/LanguageContext";

const DonatePage = () => {
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const t = (en: string, es: string) => (isEs ? es : en);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Donate — Fund the Global Kindness Movement | Pásalo Pa'lante"
        description="Support Pásalo Pa'lante with a tax-deductible donation through Te Amo PR, a U.S. 501(c)(3) nonprofit (EIN 66-0975633). Every gift fuels acts of kindness worldwide."
        path="/donate"
      />
      <Navbar />
      <main className="pt-28">
        <section className="section-padding pb-12 max-w-3xl mx-auto">
          <header className="text-center mb-10">
            <p className="eyebrow">Pásalo Pa'lante</p>
            <h1 className="headline-xl text-warm-earth mt-3 mb-4">
              {t("Donate", "Dona")}
            </h1>
            <p className="text-base md:text-lg text-foreground/75 leading-relaxed">
              {t(
                "Your gift fuels a global kindness movement. Pásalo Pa'lante is a sister initiative of Te Amo PR, a U.S. 501(c)(3) nonprofit (EIN 66-0975633). All donations are tax-deductible to the fullest extent allowed by U.S. law.",
                "Tu donación impulsa un movimiento global de bondad. Pásalo Pa'lante es una iniciativa hermana de Te Amo PR, una organización sin fines de lucro 501(c)(3) (EIN 66-0975633). Todas las donaciones son deducibles de impuestos hasta donde permite la ley de EE.UU."
              )}
            </p>
          </header>

          <div className="bg-white/70 border border-warm-earth/10 rounded-2xl p-6 md:p-8 space-y-4">
            <h2 className="font-display text-2xl text-warm-earth">
              {t("How to donate securely", "Cómo donar de forma segura")}
            </h2>
            <ol className="list-decimal pl-6 space-y-3 text-foreground/85 leading-relaxed">
              <li>
                <strong>{t("Online via PayPal Giving:", "En línea con PayPal Giving:")}</strong>{" "}
                {t(
                  "Click the donate button below. PayPal processes the transaction securely; we never see or store your card details.",
                  "Haz clic en el botón de donar abajo. PayPal procesa la transacción de forma segura; nunca vemos ni almacenamos los datos de tu tarjeta."
                )}
              </li>
              <li>
                <strong>{t("By check:", "Por cheque:")}</strong>{" "}
                {t(
                  "Make checks payable to ",
                  "Cheques a nombre de "
                )}
                <em>Te Amo PR</em>{t(
                  " and mail to 550 Av. de la Constitución #905, San Juan, PR.",
                  " y envía por correo a 550 Av. de la Constitución #905, San Juan, PR."
                )}
              </li>
              <li>
                <strong>{t("ACH / wire transfer / sponsorship:", "ACH / transferencia / patrocinio:")}</strong>{" "}
                {t(
                  "Email ",
                  "Escribe a "
                )}
                <a href="mailto:info@teamopr.org" className="text-primary underline">info@teamopr.org</a>
                {t(
                  " and our team will send banking instructions and a sponsorship deck.",
                  " y nuestro equipo te enviará instrucciones bancarias y un dossier de patrocinio."
                )}
              </li>
            </ol>

            <div className="border-t border-warm-earth/10 pt-4 text-sm text-foreground/70 space-y-1">
              <p>
                <strong>{t("Tax receipts:", "Recibos de impuestos:")}</strong>{" "}
                {t(
                  "All donors receive an emailed acknowledgment from Te Amo PR with the EIN and donation details, suitable for U.S. tax purposes.",
                  "Todos los donantes reciben un acuse por correo de Te Amo PR con el EIN y los detalles, válido para fines fiscales en EE.UU."
                )}
              </p>
              <p>
                <strong>{t("Where funds go:", "A dónde van los fondos:")}</strong>{" "}
                {t(
                  "Donations support Pásalo Pa'lante programming, ambassador and volunteer support, school activations, partner outreach, technology, and Te Amo PR's broader nonprofit mission.",
                  "Las donaciones apoyan la programación de Pásalo Pa'lante, embajadores y voluntarios, activaciones escolares, alianzas, tecnología y la misión sin fines de lucro de Te Amo PR."
                )}
              </p>
              <p>
                <strong>{t("Questions:", "Preguntas:")}</strong>{" "}
                <a href="mailto:info@teamopr.org" className="text-primary underline">info@teamopr.org</a> · (787) 705-0778
              </p>
            </div>
          </div>
        </section>

        <DonateStrip />
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
};

export default DonatePage;
