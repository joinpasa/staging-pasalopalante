import { useLanguage } from "@/contexts/LanguageContext";

const CONTENT = {
  en: {
    rolesEyebrow: "What These Roles Look Like",
    rolesHeading: "Ready to Do More Than Pledge?",
    rolesBody:
      "We're looking for people and organizations who want to help carry this further than a single act of kindness. If that's you, here's what each role looks like and how we'll support you.",
    roles: [
      {
        title: "Do Acts of Kindness Myself",
        body:
          "The foundation of the movement. Commit to your own acts of kindness during Global Kindness Season (Nov 1, 2026 – Jan 31, 2027) and help us reach a billion. No leadership role required, just you, showing up. Every pledge counts toward the world record.",
      },
      {
        title: "Champion (Influencer or Promoter)",
        body:
          "Use your platform, your voice, and your network to spread the movement. Whether you have a thousand followers or a million, Champions help kindness go viral. Contribute to a world record of kindness through inspiring and activating your community to pay kindness forward.",
      },
      {
        title: "Ambassador (Country Leader)",
        body:
          "Help us bring Pásalo Pa'lante to your country. As an Ambassador, you'll be the regional anchor, coordinating with local schools, businesses, faith communities, media, and grassroots leaders. We provide a national activation playbook, branding, direct support from our team, and a global network of fellow country leaders.",
      },
      {
        title: "Civic / Political Leader",
        body:
          "Mayors, council members, agency heads, and public sector leaders ready to bring kindness to their constituents. You'll get a municipal activation guide built on what worked across all 78 Puerto Rico municipalities in 2025, plus support for coordinating with schools, public services, and community partners in your region.",
      },
      {
        title: "Join the Team (Volunteer Opportunities)",
        body:
          "We need welcoming, creative people across every part of this movement: fundraising, content creation, social media, education outreach, translation, logistics, and more. Tell us what you're good at (or what you want to learn), and we'll find the right place for you. Bring your skills. Bring your ideas. We welcome both.",
      },
      {
        title: "Group Leader (Schools, Companies, Nonprofits, NGOs, Faith Communities, and More)",
        body:
          "Activate the pay-it-forward kindness movement throughout your community. Whether you lead a classroom of 30 or a company of 3,000, you'll get a turnkey activation toolkit, ready-to-use materials, a measurement system that connects your group's impact to the global total, and direct support from our team to make it easy.",
      },
    ],
    getEyebrow: "What You Get",
    getHeading: "We've Built the Infrastructure. You Bring the People.",
    getIntro:
      "When you sign up as a Champion, Ambassador, Civic Leader, Volunteer, or Group Leader, we'll send you:",
    getBullets: [
      "A welcome email with everything you need to get started",
      "A 30-minute welcome call to align on your goals and answer your questions",
      "An activation kit with branding, templates, and Kindness Cards",
      "A measurement dashboard to track your community's impact",
      "Access to the global network of leaders coordinating Global Kindness Season",
      "Ongoing support from our team in the lead-up to and during Global Kindness Season (Nov 1, 2026 – Jan 31, 2027)",
    ],
    getOutro:
      "This is a movement built by partnership. We're deeply grateful for every person and organization stepping in, and we're open to collaboration of all kinds. If you have questions before you sign up, reach out anytime:",
    contactEmail: "info@teamopr.org",
    contactPhone: "(787) 705-0778",
  },
  es: {
    rolesEyebrow: "Cómo se ven estos roles",
    rolesHeading: "¿Listo para hacer más que prometer?",
    rolesBody:
      "Buscamos personas y organizaciones que quieran llevar esto más allá de un solo acto de bondad. Si eres tú, así se ve cada rol y así te apoyaremos.",
    roles: [
      {
        title: "Hacer actos de bondad yo mismo/a",
        body:
          "La base del movimiento. Comprométete con tus propios actos de bondad durante la Temporada Global de la Bondad (1 nov 2026 – 31 ene 2027) y ayúdanos a llegar a mil millones. No se requiere un rol de liderazgo, solo tú, presente. Cada promesa cuenta para el récord mundial.",
      },
      {
        title: "Champion (Influencer o Promotor)",
        body:
          "Usa tu plataforma, tu voz y tu red para difundir el movimiento. Ya sea que tengas mil seguidores o un millón, los Champions ayudan a que la bondad se vuelva viral. Contribuye a un récord mundial de bondad inspirando y activando a tu comunidad para que sigan pasando la bondad.",
      },
      {
        title: "Embajador (Líder de País)",
        body:
          "Ayúdanos a llevar Pásalo Pa'lante a tu país. Como Embajador, serás el ancla regional, coordinando con escuelas, empresas, comunidades de fe, medios y líderes comunitarios. Proveemos un playbook nacional de activación, marca, apoyo directo de nuestro equipo y una red global de líderes de país.",
      },
      {
        title: "Líder Cívico / Político",
        body:
          "Alcaldes, legisladores, jefes de agencias y líderes del sector público listos para llevar la bondad a su gente. Tendrás una guía municipal de activación basada en lo que funcionó en los 78 municipios de Puerto Rico en 2025, más apoyo para coordinar con escuelas, servicios públicos y socios comunitarios de tu región.",
      },
      {
        title: "Únete al Equipo (Oportunidades de Voluntariado)",
        body:
          "Necesitamos personas creativas y acogedoras en cada parte de este movimiento: recaudación de fondos, creación de contenido, redes sociales, alcance educativo, traducción, logística y más. Dinos en qué eres bueno (o qué quieres aprender) y encontraremos el lugar adecuado para ti. Trae tus habilidades. Trae tus ideas. Bienvenidas ambas.",
      },
      {
        title: "Líder de Grupo (Escuelas, Empresas, Sin Fines de Lucro, ONGs, Comunidades de Fe y Más)",
        body:
          "Activa el movimiento de bondad pásalo pa'lante en toda tu comunidad. Lideres un salón de 30 o una empresa de 3,000, tendrás un kit de activación llave en mano, materiales listos, un sistema de medición que conecta el impacto de tu grupo con el total global y apoyo directo de nuestro equipo para hacerlo fácil.",
      },
    ],
    getEyebrow: "Lo que recibes",
    getHeading: "Construimos la infraestructura. Tú traes a las personas.",
    getIntro:
      "Cuando te inscribas como Champion, Embajador, Líder Cívico, Voluntario o Líder de Grupo, te enviaremos:",
    getBullets: [
      "Un correo de bienvenida con todo lo que necesitas para comenzar",
      "Una llamada de bienvenida de 30 minutos para alinear tus metas y responder tus preguntas",
      "Un kit de activación con marca, plantillas y Tarjetas de Bondad",
      "Un dashboard de medición para seguir el impacto de tu comunidad",
      "Acceso a la red global de líderes coordinando la Temporada Global de la Bondad",
      "Apoyo continuo de nuestro equipo antes y durante la Temporada Global de la Bondad (1 nov 2026 – 31 ene 2027)",
    ],
    getOutro:
      "Este es un movimiento construido por alianzas. Estamos profundamente agradecidos con cada persona y organización que se suma, y estamos abiertos a colaboraciones de todo tipo. Si tienes preguntas antes de inscribirte, escríbenos cuando quieras:",
    contactEmail: "info@teamopr.org",
    contactPhone: "(787) 705-0778",
  },
};

export default function CommitRoles() {
  const { lang } = useLanguage();
  const c = CONTENT[lang as keyof typeof CONTENT] ?? CONTENT.en;

  return (
    <div className="max-w-3xl mx-auto mt-20 space-y-20">
      <section>
        <p className="text-xs uppercase tracking-widest text-primary mb-2 text-center">
          {c.rolesEyebrow}
        </p>
        <h2 className="headline-lg text-foreground text-center mb-4">{c.rolesHeading}</h2>
        <p className="body-lg text-muted-foreground text-center mb-10">{c.rolesBody}</p>

        <div className="space-y-6">
          {c.roles.map((r) => (
            <div
              key={r.title}
              className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm"
            >
              <h3 className="font-serif text-xl md:text-2xl text-foreground mb-2">{r.title}</h3>
              <p className="body-md text-muted-foreground">{r.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="text-xs uppercase tracking-widest text-primary mb-2 text-center">
          {c.getEyebrow}
        </p>
        <h2 className="headline-lg text-foreground text-center mb-4">{c.getHeading}</h2>
        <p className="body-lg text-muted-foreground text-center mb-8">{c.getIntro}</p>

        <ul className="space-y-3 mb-8 max-w-2xl mx-auto">
          {c.getBullets.map((b) => (
            <li key={b} className="flex gap-3 body-md text-foreground/80">
              <span className="text-primary mt-1">•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <p className="body-md text-muted-foreground text-center">
          {c.getOutro}{" "}
          <a href={`mailto:${c.contactEmail}`} className="text-primary underline">
            {c.contactEmail}
          </a>{" "}
          ·{" "}
          <a href={`tel:${c.contactPhone.replace(/[^\d+]/g, "")}`} className="text-primary underline">
            {c.contactPhone}
          </a>
        </p>
      </section>
    </div>
  );
}
