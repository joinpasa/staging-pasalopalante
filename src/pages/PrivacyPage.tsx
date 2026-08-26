import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SEO from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";

export default function PrivacyPage() {
  const { lang } = useLanguage();
  const isEs = lang === "es";

  const t = (en: string, es: string) => (isEs ? es : en);

  const Section = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
    <>
      <h2 className="font-display text-2xl text-warm-earth mt-10">
        {n}. {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </>
  );

  return (
    <div className="min-h-screen bg-warm-cream">
      <SEO
        title={t(
          "Privacy Policy & Legal Information — Pásalo Pa'lante",
          "Política de Privacidad e Información Legal — Pásalo Pa'lante"
        )}
        description={t(
          "How Pásalo Pa'lante, a sister initiative of Te Amo PR (a 501(c)(3) nonprofit), collects, uses, and protects information across the global kindness movement.",
          "Cómo Pásalo Pa'lante, iniciativa hermana de Te Amo PR (organización sin fines de lucro 501(c)(3)), recopila, usa y protege la información a través del movimiento global de bondad."
        )}
        path="/privacy"
      />
      <Navbar />
      <main className="pt-32 pb-20 section-padding">
        <article className="max-w-3xl mx-auto">
          <header className="mb-10 text-center">
            <p className="eyebrow">Pásalo Pa'lante</p>
            <h1 className="headline-xl text-warm-earth mt-3">
              {t("Privacy Policy & Legal Information", "Política de Privacidad e Información Legal")}
            </h1>
            <p className="text-sm text-foreground/60 mt-3">
              {t("Effective Date: June 17, 2026", "Fecha de vigencia: 17 de junio de 2026")}
              {" · "}
              {t("Last Updated: June 17, 2026", "Última actualización: 17 de junio de 2026")}
            </p>
            <div className="mt-4 text-sm text-foreground/70 space-y-1">
              <p>
                <strong>Pásalo Pa'lante</strong> —{" "}
                {t("a sister initiative of", "iniciativa hermana de")}{" "}
                <strong>Te Amo PR</strong>
              </p>
              <p>
                {t("Movement website:", "Sitio del movimiento:")}{" "}
                <a href="https://pasalopalante.com" className="text-primary underline">pasalopalante.com</a>
                {" · "}
                {t("Organization website:", "Sitio de la organización:")}{" "}
                <a href="https://teamopr.org" target="_blank" rel="noopener noreferrer" className="text-primary underline">teamopr.org</a>
              </p>
            </div>
          </header>

          <section className="text-foreground/85 leading-relaxed text-base md:text-lg">
            <Section n={1} title={t("Our Relationship to Te Amo PR", "Nuestra relación con Te Amo PR")}>
              <p>
                {t(
                  "Pásalo Pa'lante is a global kindness movement and sister website connected to Te Amo PR, a nonprofit organization dedicated to service, compassion, community impact, and positive transformation.",
                  "Pásalo Pa'lante es un movimiento global de bondad y un sitio hermano conectado con Te Amo PR, una organización sin fines de lucro dedicada al servicio, la compasión, el impacto comunitario y la transformación positiva."
                )}
              </p>
              <p>
                {t(
                  "Pásalo Pa'lante was created to expand the spirit of Te Amo PR into a global movement focused on kindness, gratitude, unity, and human connection. While teamopr.org serves as the primary organizational website for Te Amo PR, pasalopalante.com serves as a dedicated movement platform for Pásalo Pa'lante — public awareness, campaign participation, ambassador engagement, kindness activations, educational resources, storytelling, and community involvement.",
                  "Pásalo Pa'lante fue creado para expandir el espíritu de Te Amo PR a un movimiento global enfocado en la bondad, la gratitud, la unidad y la conexión humana. Mientras teamopr.org sirve como sitio organizacional principal de Te Amo PR, pasalopalante.com sirve como plataforma dedicada al movimiento Pásalo Pa'lante — conciencia pública, participación en campañas, embajadores, activaciones, recursos educativos, narrativas e involucramiento comunitario."
                )}
              </p>
              <p>
                {t(
                  "Together, Te Amo PR and Pásalo Pa'lante share a common purpose: to inspire people, institutions, schools, businesses, communities, and nations to make kindness visible, practical, and contagious.",
                  "Juntos, Te Amo PR y Pásalo Pa'lante comparten un propósito común: inspirar a personas, instituciones, escuelas, empresas, comunidades y naciones a hacer la bondad visible, práctica y contagiosa."
                )}
              </p>
              <ul className="list-none pl-0 space-y-1 text-sm bg-warm-cream/60 border border-warm-earth/10 rounded-lg p-4">
                <li><strong>{t("Legal nonprofit organization:", "Organización legal sin fines de lucro:")}</strong> Te Amo PR</li>
                <li><strong>{t("Sister initiative / movement platform:", "Iniciativa hermana / plataforma del movimiento:")}</strong> Pásalo Pa'lante</li>
                <li><strong>{t("Primary organization website:", "Sitio principal de la organización:")}</strong> teamopr.org</li>
                <li><strong>{t("Movement website:", "Sitio del movimiento:")}</strong> pasalopalante.com</li>
                <li><strong>{t("Nonprofit registration / EIN:", "Registro sin fines de lucro / EIN:")}</strong> 66-0975633</li>
                <li><strong>{t("Mailing address:", "Dirección postal:")}</strong> 550 Av. de la Constitución #905, San Juan</li>
                <li>
                  <strong>{t("Email:", "Correo:")}</strong>{" "}
                  <a href="mailto:info@teamopr.org" className="text-primary underline">info@teamopr.org</a>
                  {" · "}
                  <a href="mailto:hello@pasalopalante.com" className="text-primary underline">hello@pasalopalante.com</a>
                </li>
              </ul>
            </Section>

            <Section n={2} title={t("Our Mission", "Nuestra misión")}>
              <p>
                {t(
                  "Pásalo Pa'lante exists to mobilize acts of kindness around the world and inspire people to pass kindness forward in daily life.",
                  "Pásalo Pa'lante existe para movilizar actos de bondad alrededor del mundo e inspirar a las personas a pasar la bondad pa'lante en su vida diaria."
                )}
              </p>
              <p>
                {t(
                  "The movement encourages individuals and institutions to participate in a shared culture of kindness through simple, meaningful actions: helping others, expressing gratitude, serving communities, supporting neighbors, uplifting families, and creating moments of compassion across countries and cultures.",
                  "El movimiento alienta a personas e instituciones a participar en una cultura compartida de bondad mediante acciones simples y significativas: ayudar al prójimo, expresar gratitud, servir a las comunidades, apoyar a los vecinos, elevar a las familias y crear momentos de compasión entre países y culturas."
                )}
              </p>
              <p>{t("Our work may include:", "Nuestro trabajo puede incluir:")}</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>{t("Public kindness campaigns.", "Campañas públicas de bondad.")}</li>
                <li>{t("Educational and community resources.", "Recursos educativos y comunitarios.")}</li>
                <li>{t("School, university, and youth activations.", "Activaciones en escuelas, universidades y juventudes.")}</li>
                <li>{t("Ambassador and champion programs.", "Programas de embajadores y campeones.")}</li>
                <li>{t("Partnerships with nonprofits, institutions, municipalities, companies, and community groups.", "Alianzas con organizaciones sin fines de lucro, instituciones, municipios, empresas y grupos comunitarios.")}</li>
                <li>{t("Storytelling that highlights acts of kindness.", "Narrativas que destacan actos de bondad.")}</li>
                <li>{t("Volunteer participation opportunities.", "Oportunidades de voluntariado.")}</li>
                <li>{t("Donation and sponsorship support for mission-related programming.", "Apoyo de donaciones y patrocinios para programación de la misión.")}</li>
              </ul>
              <p>
                {t(
                  "Pásalo Pa'lante is not a political campaign, religious campaign, commercial brand campaign, or government program. It is a kindness movement connected to Te Amo PR's nonprofit mission.",
                  "Pásalo Pa'lante no es una campaña política, religiosa, comercial de marca ni un programa gubernamental. Es un movimiento de bondad conectado a la misión sin fines de lucro de Te Amo PR."
                )}
              </p>
            </Section>

            <Section n={3} title={t("Purpose of This Page", "Propósito de esta página")}>
              <p>{t("This page explains:", "Esta página explica:")}</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>{t("How we collect, use, and protect personal information.", "Cómo recopilamos, usamos y protegemos la información personal.")}</li>
                <li>{t("How donations, partnerships, and participation may be handled.", "Cómo se manejan las donaciones, alianzas y participación.")}</li>
                <li>{t("The relationship between Pásalo Pa'lante and Te Amo PR.", "La relación entre Pásalo Pa'lante y Te Amo PR.")}</li>
                <li>{t("The terms that apply when using this website.", "Los términos aplicables al usar este sitio.")}</li>
                <li>{t("How to contact us about privacy, legal, nonprofit, donation, or partnership matters.", "Cómo contactarnos para asuntos de privacidad, legales, sin fines de lucro, donaciones o alianzas.")}</li>
              </ul>
            </Section>

            <Section n={4} title={t("Information We Collect", "Información que recopilamos")}>
              <h3 className="font-semibold mt-2">{t("Information You Provide Directly", "Información que provees directamente")}</h3>
              <p>{t("You may voluntarily provide information when you:", "Puedes proveer información voluntariamente cuando:")}</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>{t("Fill out a contact form.", "Completas un formulario de contacto.")}</li>
                <li>{t("Sign up for updates.", "Te suscribes a actualizaciones.")}</li>
                <li>{t("Register as a participant, ambassador, volunteer, school, organization, or partner.", "Te registras como participante, embajador, voluntario, escuela, organización o socio.")}</li>
                <li>{t("Submit a kindness story or impact report.", "Envías una historia de bondad o reporte de impacto.")}</li>
                <li>{t("Make a donation.", "Haces una donación.")}</li>
                <li>{t("Request resources.", "Solicitas recursos.")}</li>
                <li>{t("Contact us by email.", "Nos contactas por correo.")}</li>
                <li>{t("Apply to collaborate with the movement.", "Aplicas para colaborar con el movimiento.")}</li>
                <li>{t("Participate in a campaign, event, pledge, or activation.", "Participas en una campaña, evento, compromiso o activación.")}</li>
              </ul>
              <p>{t("This information may include name, email, phone, country/city, organization, role, message content, participation interest, donation information, volunteer or ambassador information, and photos, stories, videos, or testimonials you choose to submit.", "Esta información puede incluir nombre, correo, teléfono, país/ciudad, organización, rol, contenido del mensaje, interés de participación, información de donación, información de voluntariado o embajador, y fotos, historias, videos o testimonios que decidas enviar.")}</p>

              <h3 className="font-semibold mt-4">{t("Information Collected Automatically", "Información recopilada automáticamente")}</h3>
              <p>{t("When you visit pasalopalante.com, certain technical information may be collected automatically, including IP address, browser type, device, operating system, pages visited, date and time, referring site, approximate location, interaction data, and cookies or similar technologies. This information helps us understand how visitors use the site, improve performance, measure campaign reach, and maintain security.", "Cuando visitas pasalopalante.com, cierta información técnica puede recopilarse automáticamente, incluyendo dirección IP, tipo de navegador, dispositivo, sistema operativo, páginas visitadas, fecha y hora, sitio de referencia, ubicación aproximada, datos de interacción y cookies o tecnologías similares. Esto nos ayuda a entender el uso del sitio, mejorar el desempeño, medir el alcance y mantener la seguridad.")}</p>
            </Section>

            <Section n={5} title={t("How We Use Information", "Cómo usamos la información")}>
              <p>{t("We may use collected information to:", "Podemos usar la información recopilada para:")}</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>{t("Respond to messages, questions, or requests.", "Responder mensajes, preguntas o solicitudes.")}</li>
                <li>{t("Share updates about Pásalo Pa'lante and Te Amo PR.", "Compartir actualizaciones sobre Pásalo Pa'lante y Te Amo PR.")}</li>
                <li>{t("Register individuals, ambassadors, schools, institutions, or partners.", "Registrar individuos, embajadores, escuelas, instituciones o socios.")}</li>
                <li>{t("Coordinate campaigns, events, activations, and volunteer opportunities.", "Coordinar campañas, eventos, activaciones y oportunidades de voluntariado.")}</li>
                <li>{t("Process donations or sponsorship inquiries.", "Procesar donaciones o consultas de patrocinio.")}</li>
                <li>{t("Send receipts or acknowledgments where applicable.", "Enviar recibos o acuses donde corresponda.")}</li>
                <li>{t("Measure website traffic and campaign performance.", "Medir el tráfico del sitio y el desempeño de campañas.")}</li>
                <li>{t("Improve website content, resources, and user experience.", "Mejorar el contenido, los recursos y la experiencia de usuario.")}</li>
                <li>{t("Protect against fraud, spam, misuse, or security threats.", "Proteger contra fraude, spam, abuso o amenazas de seguridad.")}</li>
                <li>{t("Comply with legal, tax, accounting, nonprofit, or reporting obligations.", "Cumplir obligaciones legales, fiscales, contables, sin fines de lucro o de reporte.")}</li>
                <li>{t("Share impact stories, only with appropriate permission where personally identifiable content is involved.", "Compartir historias de impacto, solo con permiso apropiado cuando hay contenido personalmente identificable.")}</li>
                <li>{t("Support Google Ads, Google Analytics, or similar tools used for mission-related outreach.", "Apoyar Google Ads, Google Analytics u otras herramientas usadas para el alcance de la misión.")}</li>
              </ul>
              <p><strong>{t("We do not sell personal information.", "No vendemos información personal.")}</strong></p>
            </Section>

            <Section n={6} title={t("Donations and Payment Information", "Donaciones e información de pago")}>
              <p>{t("If donations are accepted through pasalopalante.com or through links connected to Te Amo PR, donations may be processed by secure third-party payment processors. We do not directly store full credit card numbers or full payment credentials on our website. Payment processors may collect and process donation information according to their own privacy policies and security standards.", "Si se aceptan donaciones a través de pasalopalante.com o enlaces conectados a Te Amo PR, las donaciones pueden ser procesadas por procesadores de pago externos seguros. No almacenamos números completos de tarjeta ni credenciales completas de pago en nuestro sitio. Los procesadores pueden recopilar y procesar información de donación de acuerdo con sus propias políticas.")}</p>
              <p>{t("Donation-related information may include donor name, email, billing address, amount, date, transaction confirmation, payment method type, and any donor message or dedication voluntarily provided. Donation records may be maintained by Te Amo PR or its authorized service providers for accounting, tax, donor acknowledgment, audit, legal, and nonprofit compliance purposes.", "La información puede incluir nombre del donante, correo, dirección de facturación, monto, fecha, confirmación, tipo de método de pago y cualquier mensaje o dedicatoria. Los registros pueden ser mantenidos por Te Amo PR o sus proveedores autorizados para contabilidad, impuestos, reconocimiento, auditoría, cumplimiento legal y sin fines de lucro.")}</p>
              <p><strong>{t("Important:", "Importante:")}</strong> {t("Unless otherwise stated, donations connected to Pásalo Pa'lante support the nonprofit mission and programming of Te Amo PR and/or the Pásalo Pa'lante movement.", "A menos que se indique lo contrario, las donaciones conectadas a Pásalo Pa'lante apoyan la misión y programación sin fines de lucro de Te Amo PR y/o el movimiento Pásalo Pa'lante.")}</p>
            </Section>

            <Section n={7} title={t("Email Communications", "Comunicaciones por correo")}>
              <p>{t("When you submit your email address, we may use it to send movement updates, campaign announcements, volunteer/ambassador information, educational resources, donation acknowledgments, event information, partnership follow-ups, and impact updates.", "Cuando envías tu correo, podemos usarlo para enviar actualizaciones del movimiento, anuncios de campañas, información de voluntariado/embajadores, recursos educativos, acuses de donación, información de eventos, seguimientos de alianzas y actualizaciones de impacto.")}</p>
              <p>{t("You may unsubscribe from non-essential emails at any time. We may still send transactional or administrative messages when necessary (donation receipts, legal notices, registration confirmations, direct replies).", "Puedes darte de baja de correos no esenciales en cualquier momento. Aún podemos enviar mensajes transaccionales o administrativos cuando sea necesario (recibos, avisos legales, confirmaciones, respuestas directas).")}</p>
            </Section>

            <Section n={8} title={t("Cookies and Analytics", "Cookies y analíticas")}>
              <p>{t("Pásalo Pa'lante may use cookies, pixels, analytics tools, or similar technologies to understand website traffic, improve performance, measure campaign effectiveness, prevent spam, remember preferences, and support outreach connected to the nonprofit mission. These tools may include Google Analytics, Google Ads conversion tracking, Meta tools, email marketing analytics, or similar services. Users may control cookies through browser settings; disabling them may affect some functionality.", "Pásalo Pa'lante puede usar cookies, pixeles, herramientas de analítica o tecnologías similares para entender el tráfico, mejorar el desempeño, medir la efectividad de campañas, prevenir spam, recordar preferencias y apoyar el alcance de la misión. Estas herramientas pueden incluir Google Analytics, seguimiento de conversiones de Google Ads, herramientas de Meta, analíticas de correo o servicios similares. Los usuarios pueden controlar las cookies desde su navegador; deshabilitarlas puede afectar funcionalidad.")}</p>
            </Section>

            <Section n={9} title={t("Google Ads, Google Ad Grants, and Measurement", "Google Ads, Google Ad Grants y medición")}>
              <p>{t("Pásalo Pa'lante may use Google Ads, Google Ad Grants, Google Analytics, conversion tracking, and related tools to help people discover the movement, learn about Te Amo PR, participate in kindness campaigns, donate, volunteer, or connect with mission-related resources. Google Ad Grants provides qualifying nonprofits with in-kind search advertising, and Google requires participating organizations to maintain a high-quality website that clearly communicates mission and activities.", "Pásalo Pa'lante puede usar Google Ads, Google Ad Grants, Google Analytics, seguimiento de conversiones y herramientas relacionadas para ayudar a personas a descubrir el movimiento, conocer a Te Amo PR, participar en campañas, donar, ser voluntarios o conectar con recursos de la misión. Google Ad Grants provee publicidad en especie a organizaciones sin fines de lucro elegibles, y Google requiere mantener un sitio web de alta calidad que comunique claramente la misión y actividades.")}</p>
              <p>{t("Information collected through Google tools may be used to understand which pages are visited, which campaigns are effective, and whether users complete meaningful actions such as signing up, contacting us, donating, or registering. We do not use Google Ads or analytics tools to sell personal information.", "La información recopilada mediante herramientas de Google puede usarse para entender qué páginas se visitan, qué campañas son efectivas y si los usuarios completan acciones significativas como suscribirse, contactarnos, donar o registrarse. No usamos Google Ads ni analíticas para vender información personal.")}</p>
            </Section>

            <Section n={10} title={t("How We Share Information", "Cómo compartimos información")}>
              <p>{t("We may share information only when appropriate and necessary, including with:", "Podemos compartir información solo cuando sea apropiado y necesario, incluyendo con:")}</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>{t("Te Amo PR team members, officers, staff, contractors, advisors, or authorized volunteers.", "Miembros del equipo, oficiales, personal, contratistas, asesores o voluntarios autorizados de Te Amo PR.")}</li>
                <li>{t("Website hosting providers.", "Proveedores de alojamiento web.")}</li>
                <li>{t("Email and communication platforms.", "Plataformas de correo y comunicación.")}</li>
                <li>{t("Donation and payment processors.", "Procesadores de donaciones y pagos.")}</li>
                <li>{t("Analytics and advertising platforms.", "Plataformas de analítica y publicidad.")}</li>
                <li>{t("Legal, accounting, tax, or compliance professionals.", "Profesionales legales, contables, fiscales o de cumplimiento.")}</li>
                <li>{t("Event, campaign, or operational partners when needed to fulfill a user-requested activity.", "Socios de eventos, campañas u operaciones cuando sea necesario para cumplir una actividad solicitada por el usuario.")}</li>
                <li>{t("Government, legal, or regulatory authorities when required by law.", "Autoridades gubernamentales, legales o regulatorias cuando lo exija la ley.")}</li>
              </ul>
              <p>{t("We do not sell personal information to advertisers, data brokers, or unrelated third parties.", "No vendemos información personal a anunciantes, intermediarios de datos ni terceros no relacionados.")}</p>
            </Section>

            <Section n={11} title={t("User-Submitted Stories, Photos, Videos, and Testimonials", "Historias, fotos, videos y testimonios enviados por usuarios")}>
              <p>{t("Pásalo Pa'lante may invite participants to submit kindness stories, photos, videos, impact reports, testimonials, or campaign participation materials. By submitting content, you confirm that:", "Pásalo Pa'lante puede invitar a participantes a enviar historias de bondad, fotos, videos, reportes de impacto, testimonios o materiales de campaña. Al enviar contenido, confirmas que:")}</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>{t("You have the right to submit the content.", "Tienes el derecho de enviar el contenido.")}</li>
                <li>{t("The content does not violate the rights of another person.", "El contenido no viola los derechos de otra persona.")}</li>
                <li>{t("The content may be reviewed by our team.", "El contenido puede ser revisado por nuestro equipo.")}</li>
                <li>{t("We may contact you for permission, clarification, or follow-up.", "Podemos contactarte para permiso, aclaración o seguimiento.")}</li>
                <li>{t("Public use of identifiable stories, photos, or videos will be handled with care and, where appropriate, additional consent.", "El uso público de historias, fotos o videos identificables se manejará con cuidado y, cuando corresponda, con consentimiento adicional.")}</li>
              </ul>
              <p>{t("We may edit submitted stories for length, clarity, grammar, translation, formatting, or accessibility, while preserving the spirit of the submission. For minors, parents, guardians, schools, or authorized institutions should provide permission before submitting identifiable information, images, or stories involving children.", "Podemos editar historias por extensión, claridad, gramática, traducción, formato o accesibilidad, preservando el espíritu del envío. Para menores, padres, tutores, escuelas o instituciones autorizadas deben proveer permiso antes de enviar información, imágenes o historias identificables que involucren niños.")}</p>
            </Section>

            <Section n={12} title={t("Children's Privacy", "Privacidad de menores")}>
              <p>{t("Pásalo Pa'lante may include school, youth, family, and educational participation. We care deeply about protecting children and young people. We do not knowingly collect personal information from children under the age required by applicable law without appropriate parent, guardian, school, or institutional consent.", "Pásalo Pa'lante puede incluir participación escolar, juvenil, familiar y educativa. Nos importa profundamente proteger a los niños y jóvenes. No recopilamos a sabiendas información personal de niños menores de la edad requerida por la ley aplicable sin consentimiento apropiado de padres, tutores, escuelas o instituciones.")}</p>
              <p>{t("If a parent, guardian, or school believes a child's personal information has been submitted without proper authorization, please contact us so we can review and, if appropriate, remove the information.", "Si un padre, tutor o escuela cree que la información personal de un niño ha sido enviada sin autorización adecuada, contáctanos para que podamos revisar y, si corresponde, eliminar la información.")}</p>
            </Section>

            <Section n={13} title={t("Data Security", "Seguridad de los datos")}>
              <p>{t("We use reasonable administrative, technical, and organizational safeguards to protect personal information. These may include secure hosting, SSL/HTTPS encryption, limited access controls, trusted service providers, and routine monitoring. No website, email system, payment processor, or online platform can guarantee complete security. Users should avoid sending highly sensitive personal information through general contact forms or unsecured email.", "Usamos salvaguardas administrativas, técnicas y organizacionales razonables para proteger la información personal. Estas pueden incluir alojamiento seguro, cifrado SSL/HTTPS, controles de acceso limitados, proveedores confiables y monitoreo rutinario. Ningún sitio, correo, procesador de pago o plataforma puede garantizar seguridad completa. Los usuarios deben evitar enviar información altamente sensible por formularios generales o correo no seguro.")}</p>
            </Section>

            <Section n={14} title={t("Data Retention", "Retención de datos")}>
              <p>{t("We keep personal information only as long as reasonably necessary for the purposes described in this policy, including responding to inquiries, managing participation, maintaining donation and accounting records, supporting nonprofit reporting, complying with legal obligations, resolving disputes, protecting website security, and preserving mission-related historical records or impact data. Donation, tax, and accounting records may be retained for longer periods as required by law or nonprofit best practices.", "Conservamos la información personal solo durante el tiempo razonablemente necesario para los propósitos descritos, incluyendo responder consultas, gestionar participación, mantener registros de donaciones y contabilidad, apoyar reportes sin fines de lucro, cumplir con la ley, resolver disputas, proteger la seguridad del sitio y preservar registros históricos o de impacto. Los registros de donaciones, fiscales y contables pueden conservarse por períodos más largos según lo requiera la ley.")}</p>
            </Section>

            <Section n={15} title={t("Your Choices and Rights", "Tus opciones y derechos")}>
              <p>{t("Depending on your location, you may have rights related to your personal information, including the right to:", "Dependiendo de tu ubicación, puedes tener derechos sobre tu información personal, incluyendo:")}</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>{t("Request access to personal information we hold about you.", "Solicitar acceso a la información personal que tenemos sobre ti.")}</li>
                <li>{t("Request correction of inaccurate information.", "Solicitar corrección de información inexacta.")}</li>
                <li>{t("Request deletion of certain information.", "Solicitar eliminación de cierta información.")}</li>
                <li>{t("Opt out of non-essential emails.", "Darte de baja de correos no esenciales.")}</li>
                <li>{t("Request that we stop using submitted content publicly.", "Solicitar que dejemos de usar contenido enviado públicamente.")}</li>
                <li>{t("Ask questions about how your information is used.", "Hacer preguntas sobre cómo se usa tu información.")}</li>
              </ul>
              <p>{t("To make a request, contact us using the information below. We may need to verify your identity before fulfilling certain requests.", "Para hacer una solicitud, contáctanos usando la información abajo. Podemos necesitar verificar tu identidad antes de cumplir ciertas solicitudes.")}</p>
            </Section>

            <Section n={16} title={t("International Visitors", "Visitantes internacionales")}>
              <p>{t("Pásalo Pa'lante is a global movement and may receive visitors, participants, partners, and supporters from many countries. By using this website or submitting information, you understand that your information may be processed in the United States, Puerto Rico, or other locations where our service providers operate. We aim to handle personal information respectfully and responsibly, regardless of where a visitor is located.", "Pásalo Pa'lante es un movimiento global y puede recibir visitantes, participantes, socios y simpatizantes de muchos países. Al usar este sitio o enviar información, entiendes que tu información puede procesarse en Estados Unidos, Puerto Rico u otras ubicaciones donde operan nuestros proveedores. Buscamos manejar la información personal con respeto y responsabilidad, sin importar la ubicación del visitante.")}</p>
            </Section>

            <Section n={17} title={t("External Links", "Enlaces externos")}>
              <p>{t("pasalopalante.com may link to external websites, including teamopr.org, donation processors, social media platforms, partner websites, event platforms, educational resources, media coverage, and volunteer or registration tools. We are not responsible for the privacy practices, content, security, or policies of external websites. Users should review the privacy policies of any third-party sites they visit.", "pasalopalante.com puede enlazar a sitios externos, incluyendo teamopr.org, procesadores de donaciones, redes sociales, sitios de socios, plataformas de eventos, recursos educativos, cobertura de medios y herramientas de voluntariado o registro. No somos responsables de las prácticas, contenido, seguridad o políticas de sitios externos. Los usuarios deben revisar las políticas de privacidad de cualquier sitio de terceros que visiten.")}</p>
            </Section>

            <Section n={18} title={t("Nonprofit Transparency", "Transparencia sin fines de lucro")}>
              <p>{t("Pásalo Pa'lante is presented as a sister initiative and movement platform connected to Te Amo PR. To support public trust and nonprofit transparency, this website clearly includes or links to: Te Amo PR's legal nonprofit name, nonprofit registration/EIN, mission statement, contact information, programs/activities, donation information (where applicable), leadership/organizational information (where appropriate), and annual/impact reports or public charity documentation (where available).", "Pásalo Pa'lante se presenta como iniciativa hermana y plataforma del movimiento conectada con Te Amo PR. Para apoyar la confianza pública y la transparencia sin fines de lucro, este sitio incluye o enlaza claramente: nombre legal sin fines de lucro de Te Amo PR, registro/EIN, declaración de misión, información de contacto, programas/actividades, información de donaciones (cuando aplique), información organizacional/de liderazgo (cuando corresponda) y reportes anuales/de impacto o documentación de caridad pública (cuando esté disponible).")}</p>
            </Section>

            <Section n={19} title={t("Terms of Website Use", "Términos de uso del sitio")}>
              <p>{t("By using pasalopalante.com, you agree to use the site respectfully, lawfully, and in alignment with the mission of kindness. You agree not to:", "Al usar pasalopalante.com, aceptas usar el sitio con respeto, legalmente y en alineación con la misión de bondad. Aceptas no:")}</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>{t("Submit false, harmful, abusive, hateful, defamatory, or misleading content.", "Enviar contenido falso, dañino, abusivo, odioso, difamatorio o engañoso.")}</li>
                <li>{t("Interfere with website security or functionality.", "Interferir con la seguridad o funcionalidad del sitio.")}</li>
                <li>{t("Attempt unauthorized access to website systems.", "Intentar acceso no autorizado a los sistemas del sitio.")}</li>
                <li>{t("Misrepresent your identity or affiliation.", "Tergiversar tu identidad o afiliación.")}</li>
                <li>{t("Use the movement name, logo, or materials in a way that implies authorization without permission.", "Usar el nombre, logo o materiales del movimiento de manera que implique autorización sin permiso.")}</li>
                <li>{t("Use Pásalo Pa'lante or Te Amo PR materials for political, hateful, fraudulent, exploitative, or commercial purposes unrelated to the mission.", "Usar materiales de Pásalo Pa'lante o Te Amo PR para propósitos políticos, de odio, fraudulentos, de explotación o comerciales no relacionados con la misión.")}</li>
              </ul>
              <p>{t("We reserve the right to remove content, deny participation, restrict access, or take appropriate action if website use violates these terms or harms the integrity of the movement.", "Nos reservamos el derecho de eliminar contenido, denegar participación, restringir acceso o tomar acción apropiada si el uso del sitio viola estos términos o daña la integridad del movimiento.")}</p>
            </Section>

            <Section n={20} title={t("Intellectual Property", "Propiedad intelectual")}>
              <p>{t("The names, logos, designs, taglines, campaign language, materials, graphics, videos, written content, and other creative assets associated with Pásalo Pa'lante and Te Amo PR may be protected by copyright, trademark, or other intellectual property laws.", "Los nombres, logos, diseños, lemas, lenguaje de campañas, materiales, gráficos, videos, contenido escrito y otros activos creativos asociados con Pásalo Pa'lante y Te Amo PR pueden estar protegidos por derechos de autor, marcas u otras leyes de propiedad intelectual.")}</p>
              <p>{t("Users may share public campaign materials for personal, educational, community, or mission-aligned purposes, provided they do not alter the materials in a misleading way or imply unauthorized endorsement. Written permission is required for commercial use, major public campaigns, merchandise, co-branded materials, institutional use, sponsorship promotion, or any use that suggests official partnership.", "Los usuarios pueden compartir materiales públicos para propósitos personales, educativos, comunitarios o alineados con la misión, siempre que no los alteren de forma engañosa o impliquen respaldo no autorizado. Se requiere permiso escrito para uso comercial, campañas públicas mayores, mercancía, materiales co-marcados, uso institucional, promoción de patrocinios o cualquier uso que sugiera alianza oficial.")}</p>
            </Section>

            <Section n={21} title={t("No Guarantee of Participation, Partnership, or Recognition", "Sin garantía de participación, alianza o reconocimiento")}>
              <p>{t("Submitting a form, story, partnership inquiry, ambassador application, sponsorship inquiry, or volunteer interest form does not guarantee acceptance, approval, recognition, publication, partnership, funding, or official affiliation. Pásalo Pa'lante and Te Amo PR may review opportunities based on mission alignment, safety, capacity, geography, timing, values, and available resources.", "Enviar un formulario, historia, consulta de alianza, aplicación de embajador, consulta de patrocinio o formulario de voluntariado no garantiza aceptación, aprobación, reconocimiento, publicación, alianza, financiamiento o afiliación oficial. Pásalo Pa'lante y Te Amo PR pueden revisar oportunidades según alineación de misión, seguridad, capacidad, geografía, tiempo, valores y recursos disponibles.")}</p>
            </Section>

            <Section n={22} title={t("Disclaimer", "Aviso legal")}>
              <p>{t("The information on this website is provided for general educational, inspirational, nonprofit, and community engagement purposes. Nothing on this website should be considered legal, financial, medical, tax, or professional advice. While we work to keep information accurate and current, we do not guarantee that all website content will always be complete, error-free, or up to date.", "La información en este sitio se provee para propósitos generales educativos, inspiracionales, sin fines de lucro y de involucramiento comunitario. Nada en este sitio debe considerarse asesoría legal, financiera, médica, fiscal o profesional. Aunque trabajamos para mantener la información precisa y actual, no garantizamos que todo el contenido siempre sea completo, libre de errores o actualizado.")}</p>
            </Section>

            <Section n={23} title={t("Limitation of Liability", "Limitación de responsabilidad")}>
              <p>{t("To the fullest extent permitted by law, Pásalo Pa'lante, Te Amo PR, and their respective team members, officers, volunteers, advisors, contractors, partners, or representatives are not liable for damages arising from use of this website, inability to access the website, reliance on website content, third-party links, or participation in activities promoted through the website. Some jurisdictions do not allow certain limitations, so some of these terms may not apply to all users.", "En la medida máxima permitida por la ley, Pásalo Pa'lante, Te Amo PR y sus respectivos miembros del equipo, oficiales, voluntarios, asesores, contratistas, socios o representantes no son responsables por daños derivados del uso del sitio, incapacidad para acceder, dependencia del contenido, enlaces de terceros o participación en actividades promovidas. Algunas jurisdicciones no permiten ciertas limitaciones, por lo que algunos términos pueden no aplicar a todos los usuarios.")}</p>
            </Section>

            <Section n={24} title={t("Changes to This Policy", "Cambios a esta política")}>
              <p>{t("We may update this Privacy Policy and Legal Information page from time to time. Updates will be posted on this page with a revised \"Last Updated\" date. Continued use of pasalopalante.com after updates means you accept the revised policy.", "Podemos actualizar esta Política de Privacidad e Información Legal de vez en cuando. Las actualizaciones se publicarán en esta página con una nueva fecha de \"Última actualización\". El uso continuado de pasalopalante.com después de las actualizaciones significa que aceptas la política revisada.")}</p>
            </Section>

            <Section n={25} title={t("Contact Information", "Información de contacto")}>
              <p>{t("For privacy, legal, nonprofit, donation, partnership, media, or general inquiries, please contact:", "Para asuntos de privacidad, legales, sin fines de lucro, donaciones, alianzas, medios o consultas generales, contacta:")}</p>
              <div className="bg-warm-cream/60 border border-warm-earth/10 rounded-lg p-4 text-sm space-y-1">
                <p><strong>Te Amo PR / Pásalo Pa'lante</strong></p>
                <p>{t("Website:", "Sitio:")} <a href="https://teamopr.org" target="_blank" rel="noopener noreferrer" className="text-primary underline">teamopr.org</a></p>
                <p>{t("Movement Website:", "Sitio del movimiento:")} <a href="https://pasalopalante.com" className="text-primary underline">pasalopalante.com</a></p>
                <p>{t("Email:", "Correo:")} <a href="mailto:info@teamopr.org" className="text-primary underline">info@teamopr.org</a> · <a href="mailto:hello@pasalopalante.com" className="text-primary underline">hello@pasalopalante.com</a></p>
                <p>{t("Mailing Address:", "Dirección postal:")} 550 Av. de la Constitución #905, San Juan</p>
                <p>{t("Nonprofit Registration / EIN:", "Registro sin fines de lucro / EIN:")} 66-0975633</p>
              </div>
              <p className="text-sm text-foreground/70">{t("For privacy requests, please include \"Privacy Request\" in the subject line.", "Para solicitudes de privacidad, incluye \"Privacy Request\" en el asunto.")}</p>
            </Section>
          </section>
        </article>
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
