import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SEO from "@/components/SEO";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { Building2, GraduationCap, HandHeart, HeartHandshake, Landmark } from "lucide-react";

interface Partner {
  name: string;
  logo: string;
  /** Some logos need a dark tile instead of the default light one to stay legible (e.g. a white-on-transparent mark). */
  dark?: boolean;
}

interface Pillar {
  id: string;
  icon: typeof Building2;
  name: { en: string; es: string };
  description: { en: string; es: string };
  partners: Partner[];
}

const PILLARS: Pillar[] = [
  {
    id: "corporate",
    icon: Building2,
    name: { en: "Corporate", es: "Corporativo" },
    description: {
      en: "Businesses and brands that sponsor kindness activations, match their teams' volunteer hours, and help fund the movement's reach.",
      es: "Empresas y marcas que patrocinan activaciones de bondad, igualan las horas de voluntariado de sus equipos y ayudan a financiar el alcance del movimiento.",
    },
    partners: [
      { name: "Animaze", logo: "corporate_animaze.png" },
      { name: "C-Suite Network", logo: "corporate_c-suite-network.png" },
      { name: "Caribbean Cinemas", logo: "corporate_caribbean-cinemas-logo.png" },
      { name: "Eucaforest", logo: "corporate_eucaforest-logo1b.png" },
      { name: "Good Pop", logo: "corporate_gdd_goodpop_logo.svg" },
      { name: "Good News Network", logo: "corporate_goodnewsnetwork_logo.jpg" },
      { name: "HB CBC News", logo: "corporate_hb-cbc-news.jpg" },
      { name: "HTS", logo: "corporate_hts.png" },
      { name: "Laser 101 St Maarten", logo: "corporate_laser101-st-maarteen.png" },
      { name: "Mone & You", logo: "corporate_mone--you.png" },
      { name: "Platea PR", logo: "corporate_platea-pr.png" },
      { name: "TV15SXM", logo: "corporate_tv15sxm.png" },
      { name: "The Weather Network", logo: "corporate_the_weather_network_2011.svg" },
      { name: "bMedia", logo: "corporate_logo-bmedia--color.svg" },
    ],
  },
  {
    id: "faith-based",
    icon: HeartHandshake,
    name: { en: "Faith-Based", es: "Fe y Espiritualidad" },
    description: {
      en: "Churches, ministries, and faith communities that mobilize their congregations and weave kindness into their service to others.",
      es: "Iglesias, ministerios y comunidades de fe que movilizan a sus congregaciones y tejen la bondad en su servicio a los demás.",
    },
    partners: [
      { name: "Awaken — Michael Krauss", logo: "faith-based_awaken---michael-krauss.jpg" },
      { name: "Brahma Kumaris", logo: "faith-based_brahma-kumaris.png" },
      { name: "ISKCON", logo: "faith-based_iskcon.png", dark: true },
      { name: "Oneness", logo: "faith-based_oneness.png" },
      { name: "Purity Weaves Destiny", logo: "faith-based_purity-weaves-destiny-blue-3-1.webp" },
      { name: "The Art of Living", logo: "faith-based_the-art-of-living.png" },
      { name: "Yoga Vidya", logo: "faith-based_yoga-vidya.jpg" },
    ],
  },
  {
    id: "government",
    icon: Landmark,
    name: { en: "Government", es: "Gobierno" },
    description: {
      en: "Municipalities and public agencies that bring the campaign to their cities, proclaim the Kindness Season, and support local activations.",
      es: "Municipios y agencias públicas que llevan la campaña a sus ciudades, proclaman la Temporada de Bondad y apoyan activaciones locales.",
    },
    partners: [
      { name: "Montserrat", logo: "government_montserrat.png" },
      { name: "WIPR", logo: "government_wipr6.png" },
    ],
  },
  {
    id: "nonprofits",
    icon: HandHeart,
    name: { en: "Nonprofits", es: "Organizaciones sin Fines de Lucro" },
    description: {
      en: "Community organizations that co-host activations, share kindness resources, and connect the movement to the people they serve.",
      es: "Organizaciones comunitarias que coorganizan activaciones, comparten recursos de bondad y conectan al movimiento con las personas a quienes sirven.",
    },
    partners: [
      { name: "WEDU", logo: "nonprofits_70e7b25ec4_wedu_logo_navy_web.png" },
      { name: "Ad Council", logo: "nonprofits_ad-council.brightspotcdn.png" },
      { name: "AIESEC", logo: "nonprofits_aiesec_logo_black.svg" },
      { name: "Coquí", logo: "nonprofits_coqui-sq-logo-small-2-1.png" },
      { name: "HMI", logo: "nonprofits_hmi-logo.png" },
      { name: "HITN", logo: "nonprofits_hitn.webp" },
      { name: "Kids for Peace", logo: "nonprofits_kids-for-peace.png" },
      { name: "Main", logo: "nonprofits_main_logo.png" },
      { name: "Million Peacemakers", logo: "nonprofits_million-peacemakers.png" },
      { name: "PBS", logo: "nonprofits_pbs_logo_2019.svg" },
      { name: "Rotary Westminster", logo: "nonprofits_rotary-westminster.png" },
      { name: "WKM", logo: "nonprofits_wkm_wide.png" },
    ],
  },
  {
    id: "education",
    icon: GraduationCap,
    name: { en: "Education", es: "Educación" },
    description: {
      en: "Schools, campuses, and educators who bring kindness into classrooms with age-appropriate prompts, activities, and student-led projects.",
      es: "Escuelas, campus y educadores que llevan la bondad a las aulas con actividades y proyectos liderados por estudiantes, adecuados para cada edad.",
    },
    partners: [
      { name: "Departamento de Educación PR", logo: "education_departamento-educacion-pr.png" },
      { name: "MECYS", logo: "education_mecys.png" },
    ],
  },
];

export default function PartnersPage() {
  const { lang } = useLanguage();
  const isEs = lang === "es";

  return (
    <div className="min-h-screen bg-warm-cream">
      <SEO
        title="Our Partners — Pásalo Pa'lante"
        description="Meet the corporate, faith-based, government, nonprofit, and education partners powering Pásalo Pa'lante and the global kindness movement."
        path="/partners"
      />
      <ScrollToTop />
      <Navbar />
      <main className="pt-32 pb-20 section-padding">
        <article className="max-w-5xl mx-auto">
          <header className="mb-14 text-center">
            <p className="eyebrow">{isEs ? "Juntos Pasamos la Bondad" : "Together We Pass It Forward"}</p>
            <h1 className="headline-xl text-foreground mt-3 mb-4">{isEs ? "Nuestros Socios" : "Our Partners"}</h1>
            <p className="text-base md:text-lg text-foreground/75 leading-relaxed max-w-2xl mx-auto">
              {isEs
                ? "Pásalo Pa'lante avanza gracias a las organizaciones que lo respaldan. A través de cinco pilares, nuestros socios coorganizan activaciones, financian el movimiento y llevan la bondad a cada rincón de sus comunidades."
                : "Pásalo Pa'lante moves forward because of the organizations standing behind it. Across five pillars, our partners co-host activations, fund the movement, and carry kindness into every corner of their communities."}
            </p>
          </header>

          <div className="space-y-14">
            {PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <section key={pillar.id} aria-labelledby={`pillar-${pillar.id}`}>
                  <div className="flex items-start gap-4 mb-6">
                    <span className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-warm-sand text-warm-earth">
                      <Icon size={22} strokeWidth={2} />
                    </span>
                    <div>
                      <h2 id={`pillar-${pillar.id}`} className="font-display text-2xl md:text-3xl text-foreground">
                        {isEs ? pillar.name.es : pillar.name.en}
                      </h2>
                      <p className="text-foreground/75 leading-relaxed max-w-3xl mt-2">
                        {isEs ? pillar.description.es : pillar.description.en}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                    {pillar.partners.map((partner) => (
                      <div
                        key={partner.name}
                        className={`flex items-center justify-center rounded-2xl border border-border px-6 py-8 transition-shadow duration-200 hover:shadow-lg ${
                          partner.dark ? "bg-warm-earth text-warm-cream" : "bg-warm-sand/80"
                        }`}
                      >
                        <img
                          src={`/partners/${partner.logo}`}
                          alt={partner.name}
                          loading="lazy"
                          className="max-h-16 w-auto max-w-full object-contain"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          <section className="mt-16 text-center bg-warm-earth text-warm-cream rounded-2xl p-10">
            <h2 className="font-display text-2xl md:text-3xl mb-3">
              {isEs ? "Conviértete en socio" : "Become a partner"}
            </h2>
            <p className="text-warm-cream/85 leading-relaxed max-w-2xl mx-auto mb-6">
              {isEs
                ? "Únete al movimiento y ayúdanos a pasar la bondad. Cuéntanos sobre tu organización y te contactaremos con los próximos pasos."
                : "Join the movement and help us pass kindness forward. Tell us about your organization and we'll follow up with next steps."}
            </p>
            <a
              href="/contact"
              className="inline-flex items-center justify-center rounded-full bg-warm-cream px-8 py-3 text-sm font-semibold text-warm-earth transition-transform duration-200 hover:scale-105"
            >
              {isEs ? "Contáctanos" : "Get in touch"}
            </a>
          </section>
        </article>
      </main>
      <Footer />
    </div>
  );
}
