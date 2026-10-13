import { useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SEO from "@/components/SEO";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { useMovementTotals } from "@shared/hooks/useMovementTotals";
import { ExternalLink, Search } from "lucide-react";

interface Partner {
  name: string;
  /** A filename served from /partners/, or a full https:// URL (e.g. a Wikimedia hotlink). */
  logo?: string;
  /** Some logos need a dark tile instead of the default white one to stay legible (e.g. a white-on-transparent mark). */
  dark?: boolean;
  /** Bare domain, e.g. "jaworldwide.org" — rendered as a link to https://<website>. */
  website?: string;
  /** For individuals with no org logo (e.g. a head of state) — shown in place of a website link. */
  role?: string;
}

interface Pillar {
  id: string;
  n: string;
  tag: string;
  name: string;
  description: string;
  partners: Partner[];
}

// Each municipality's coat of arms, via Wikimedia Commons' own
// Special:FilePath redirect — resolves to the current file by page
// title, so no hash/path guessing is needed (an earlier hand-computed
// upload.wikimedia.org scheme produced broken links; this is Commons'
// documented way to hotlink a file without knowing its storage path).
// See the "Puerto Rico Municipalities Seals and Flags" sheet for the
// source list.
const PR_MUNICIPALITIES: Partner[] = [
  { name: "Adjuntas", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Adjuntas.svg" },
  { name: "Aguada", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Aguada.svg" },
  { name: "Aguadilla", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Aguadilla.svg" },
  { name: "Aguas Buenas", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Aguas_Buenas.svg" },
  { name: "Aibonito", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Aibonito.svg" },
  { name: "Añasco", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_A%C3%B1asco.svg" },
  { name: "Arecibo", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Arecibo.svg" },
  { name: "Arroyo", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Arroyo.svg" },
  { name: "Barceloneta", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Barceloneta.svg" },
  { name: "Barranquitas", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Barranquitas.svg" },
  { name: "Bayamón", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Bayam%C3%B3n.svg" },
  { name: "Cabo Rojo", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Cabo_Rojo.svg" },
  { name: "Caguas", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Caguas.svg" },
  { name: "Camuy", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Camuy.svg" },
  { name: "Canóvanas", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Can%C3%B3vanas.svg" },
  { name: "Carolina", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Carolina.svg" },
  { name: "Cataño", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Cata%C3%B1o.svg" },
  { name: "Cayey", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Cayey.svg" },
  { name: "Ceiba", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Ceiba.svg" },
  { name: "Ciales", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Ciales.svg" },
  { name: "Cidra", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Cidra.svg" },
  { name: "Coamo", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Coamo.svg" },
  { name: "Comerío", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Comer%C3%ADo.svg" },
  { name: "Corozal", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Corozal.svg" },
  { name: "Culebra", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Culebra.svg" },
  { name: "Dorado", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Dorado.svg" },
  { name: "Fajardo", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Fajardo.svg" },
  { name: "Florida", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Florida.svg" },
  { name: "Guánica", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Gu%C3%A1nica.svg" },
  { name: "Guayama", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Guayama.svg" },
  { name: "Guayanilla", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Guayanilla.svg" },
  { name: "Guaynabo", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Guaynabo.svg" },
  { name: "Gurabo", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Gurabo.svg" },
  { name: "Hatillo", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Hatillo.svg" },
  { name: "Hormigueros", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Hormigueros.svg" },
  { name: "Humacao", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Humacao.svg" },
  { name: "Isabela", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Isabela.svg" },
  { name: "Jayuya", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Jayuya.svg" },
  { name: "Juana Díaz", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Juana_D%C3%ADaz.svg" },
  { name: "Juncos", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Juncos.svg" },
  { name: "Lajas", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Lajas.svg" },
  { name: "Lares", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Lares.svg" },
  { name: "Las Marías", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Las_Mar%C3%ADas.svg" },
  { name: "Las Piedras", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Las_Piedras.svg" },
  { name: "Loíza", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Lo%C3%ADza.svg" },
  { name: "Luquillo", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Luquillo.svg" },
  { name: "Manatí", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Manat%C3%AD.svg" },
  { name: "Maricao", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Maricao.svg" },
  { name: "Maunabo", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Maunabo.svg" },
  { name: "Mayagüez", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Mayag%C3%BCez.svg" },
  { name: "Moca", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Moca.svg" },
  { name: "Morovis", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Morovis.svg" },
  { name: "Naguabo", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Naguabo.svg" },
  { name: "Naranjito", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Naranjito.svg" },
  { name: "Orocovis", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Orocovis.svg" },
  { name: "Patillas", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Patillas.svg" },
  { name: "Peñuelas", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Pe%C3%B1uelas.svg" },
  { name: "Ponce", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Ponce.svg" },
  { name: "Quebradillas", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Quebradillas.svg" },
  { name: "Rincón", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Rinc%C3%B3n.svg" },
  { name: "Río Grande", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_R%C3%ADo_Grande.svg" },
  { name: "Sabana Grande", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Sabana_Grande.svg" },
  { name: "Salinas", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Salinas.svg" },
  { name: "San Germán", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_San_Germ%C3%A1n.svg" },
  { name: "San Juan", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_San_Juan.svg" },
  { name: "San Lorenzo", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_San_Lorenzo.svg" },
  { name: "San Sebastián", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_San_Sebasti%C3%A1n.svg" },
  { name: "Santa Isabel", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Santa_Isabel.svg" },
  { name: "Toa Alta", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Toa_Alta.svg" },
  { name: "Toa Baja", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Toa_Baja.svg" },
  { name: "Trujillo Alto", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Trujillo_Alto.svg" },
  { name: "Utuado", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Utuado.svg" },
  { name: "Vega Alta", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Vega_Alta.svg" },
  { name: "Vega Baja", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Vega_Baja.svg" },
  { name: "Vieques", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Vieques.svg" },
  { name: "Villalba", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Villalba.svg" },
  { name: "Yabucoa", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Yabucoa.svg" },
  { name: "Yauco", logo: "https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Yauco.svg" },
];

function buildPillars(isEs: boolean): Pillar[] {
  return [
    {
      id: "corporate",
      n: "01",
      tag: isEs ? "CORPORATIVO" : "CORPORATE",
      name: isEs ? "Corporativo" : "Corporate",
      description: isEs
        ? "Empresas y marcas que patrocinan activaciones de bondad, igualan las horas de voluntariado de sus equipos y ayudan a financiar el alcance del movimiento."
        : "Businesses and brands that sponsor kindness activations, match their teams' volunteer hours, and help fund the movement's reach.",
      partners: [
        { name: "Eucaforest", logo: "corporate_eucaforest-logo1b.png" },
        { name: "Loving AI", logo: "corporate_loving-ai.webp", website: "lovingai.org" },
        { name: "NuCalm", logo: "corporate_nucalm.png", website: "nucalm.com" },
        { name: "SHRM", logo: "corporate_shrm.png", website: "shrm.org" },
      ],
    },
    {
      id: "media",
      n: "02",
      tag: isEs ? "MEDIOS Y PRENSA" : "MEDIA / PRESS",
      name: isEs ? "Medios y Prensa" : "Media / Press",
      description: isEs
        ? "Cadenas y redes de medios que amplifican el movimiento ante sus audiencias y ayudan a correr la voz de la bondad."
        : "Broadcasters and media networks that amplify the movement to their audiences and help spread the word on kindness.",
      partners: [{ name: "C-Suite Network", logo: "corporate_c-suite-network.png", website: "c-suitenetwork.com" }],
    },
    {
      id: "faith-based",
      n: "03",
      tag: isEs ? "FE Y ESPIRITUALIDAD" : "FAITH-BASED",
      name: isEs ? "Fe y Espiritualidad" : "Faith-Based",
      description: isEs
        ? "Iglesias, ministerios y comunidades de fe que movilizan a sus congregaciones y tejen la bondad en su servicio a los demás."
        : "Churches, ministries, and faith communities that mobilize their congregations and weave kindness into their service to others.",
      partners: [
        { name: "Awaken — Michael Krauss", logo: "faith-based_awaken---michael-krauss.jpg" },
        { name: "Oneness", logo: "faith-based_oneness.png" },
        { name: "Yoga Vidya", logo: "faith-based_yoga-vidya.jpg" },
      ],
    },
    {
      id: "government",
      n: "04",
      tag: isEs ? "GOBIERNO" : "GOVERNMENT",
      name: isEs ? "Gobierno" : "Government",
      description: isEs
        ? "Municipios y agencias públicas que llevan la campaña a sus ciudades, proclaman la Temporada de Bondad y apoyan activaciones locales."
        : "Municipalities and public agencies that bring the campaign to their cities, proclaim the Kindness Season, and support local activations.",
      partners: [
        {
          name: "Pres. Andrés Pastrana",
          role: isEs ? "Ex Presidente · Líder Cívico Global · Colombia" : "Former President · Global Civic Leader · Colombia",
        },
        ...PR_MUNICIPALITIES,
      ],
    },
    {
      id: "nonprofits",
      n: "05",
      tag: isEs ? "ORG. SIN FINES DE LUCRO" : "NONPROFIT",
      name: isEs ? "Organizaciones sin Fines de Lucro" : "Nonprofits",
      description: isEs
        ? "Organizaciones comunitarias que coorganizan activaciones, comparten recursos de bondad y conectan al movimiento con las personas a quienes sirven."
        : "Community organizations that co-host activations, share kindness resources, and connect the movement to the people they serve.",
      partners: [
        { name: "Coquí Charities", logo: "nonprofits_coqui-sq-logo-small-2-1.png" },
        { name: "Good Deeds Day", logo: "nonprofits_good-deeds-day.webp", website: "good-deeds-day.org" },
        { name: "HeartMath Institute", logo: "nonprofits_hmi-logo.png", website: "heartmath.org" },
        { name: "Kids for Peace", logo: "nonprofits_kids-for-peace.png", website: "kidsforpeaceglobal.org" },
        { name: "Million Peacemakers", logo: "nonprofits_million-peacemakers.png" },
        { name: "Peace and Love Inc. Ltd" },
        { name: "Te Amo PR", logo: "nonprofits_te-amo-pr.png", website: "teamopr.org" },
        { name: "Unify.org", logo: "nonprofits_unify.webp", website: "unify.org" },
      ],
    },
    {
      id: "education",
      n: "06",
      tag: isEs ? "EDUCACIÓN" : "EDUCATION",
      name: isEs ? "Educación" : "Education",
      description: isEs
        ? "Escuelas, campus y educadores que llevan la bondad a las aulas con actividades y proyectos liderados por estudiantes, adecuados para cada edad."
        : "Schools, campuses, and educators who bring kindness into classrooms with age-appropriate prompts, activities, and student-led projects.",
      partners: [
        { name: "Departamento de Educación PR", logo: "education_departamento-educacion-pr.png", website: "de.pr.gov" },
        { name: "JA Worldwide", logo: "education_ja-worldwide.png", website: "jaworldwide.org" },
        { name: "Learning Planet Institute", logo: "education_learning-planet-institute.png", website: "learning-planet.org" },
        { name: "Ministry of Education, Culture, Youth & Sport (MECYS)", logo: "education_mecys.png" },
        { name: "Ministry of Education — Anguilla", logo: "education_ministry-of-education-anguilla.png" },
        {
          name: "Ministry of Education, Health & Social Services — Montserrat",
          logo: "education_ministry-of-education-montserrat.png",
        },
        { name: "Money & You / Excellerated Business Schools", logo: "education_money-and-you.png" },
      ],
    },
  ];
}

const INITIALS_STOPWORDS = new Set(["and", "of", "the", "&", "de", "la", "el"]);

function initials(name: string) {
  const words = name.split(/\s+/).filter((w) => w && !INITIALS_STOPWORDS.has(w.toLowerCase()));
  return words
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function logoSrc(logo: string) {
  return logo.startsWith("http") ? logo : `/partners/${logo}`;
}

function PartnerCard({ partner, tag }: { partner: Partner; tag: string }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div
        className={`flex h-44 items-center justify-center border-b border-border p-5 ${
          partner.dark ? "bg-cyan-900" : "bg-white"
        }`}
      >
        {partner.logo ? (
          <img
            src={logoSrc(partner.logo)}
            alt={partner.name}
            loading="lazy"
            className="max-h-32 w-auto max-w-[88%] object-contain"
          />
        ) : (
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full bg-warm-sand font-display text-2xl text-foreground"
            aria-hidden="true"
          >
            {initials(partner.name)}
          </div>
        )}
      </div>
      <div className="flex flex-grow flex-col gap-1.5 p-4">
        <span className="text-[10px] font-bold tracking-[0.14em] text-foreground/45">{tag}</span>
        <h3 className="text-sm font-bold leading-snug text-foreground">{partner.name}</h3>
        <div className="mt-auto pt-2">
          {partner.website ? (
            <a
              href={`https://${partner.website}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Visit ${partner.name} website (opens in a new tab)`}
              className="inline-flex items-center gap-1 break-all text-xs font-bold text-[#0079A8] hover:underline"
            >
              {partner.website}
              <ExternalLink size={12} className="shrink-0" />
            </a>
          ) : partner.role ? (
            <span className="text-xs font-medium leading-snug text-foreground/60">{partner.role}</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function compactNumber(n: number, locale: string) {
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export default function PartnersPage() {
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const locale = isEs ? "es" : "en";
  const { data: totals } = useMovementTotals();
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("all");

  const pillars = useMemo(() => buildPillars(isEs), [isEs]);
  const totalPartners = useMemo(() => pillars.reduce((n, p) => n + p.partners.length, 0), [pillars]);

  const q = query.trim().toLowerCase();
  const matchesQuery = (p: Partner) => !q || p.name.toLowerCase().includes(q) || (p.website ?? "").includes(q);

  const chips = useMemo(() => {
    const counts = pillars.map((p) => ({ id: p.id, label: p.name, count: p.partners.filter(matchesQuery).length }));
    const allCount = counts.reduce((n, c) => n + c.count, 0);
    return [{ id: "all", label: isEs ? "Todos" : "All", count: allCount }, ...counts];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pillars, q, isEs]);

  const sections = useMemo(
    () =>
      pillars
        .filter((p) => sector === "all" || p.id === sector)
        .map((p) => ({ ...p, items: p.partners.filter(matchesQuery) }))
        .filter((p) => p.items.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pillars, sector, q],
  );

  const shown = sections.reduce((n, s) => n + s.items.length, 0);

  return (
    <div className="min-h-screen bg-warm-cream">
      <SEO
        title="Our Partners — Pásalo Pa'lante"
        description="Meet the corporate, media, faith-based, government, nonprofit, and education partners powering Pásalo Pa'lante and the global kindness movement."
        path="/partners"
      />
      <ScrollToTop />
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-cyan-900 text-warm-cream">
          <img
            src="/world-map.svg"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 top-10 w-[560px] opacity-[0.06]"
          />
          <div className="section-padding relative mx-auto flex max-w-6xl flex-wrap items-end gap-12 pb-16 pt-28 md:pt-32">
            <div className="flex flex-1 flex-col gap-6" style={{ flexBasis: "560px" }}>
              <p className="text-xs font-bold tracking-[0.18em] text-warm-gold">
                {isEs ? "NUESTROS SOCIOS · LA COALICIÓN DE BONDAD" : "OUR PARTNERS · THE KINDNESS COALITION"}
              </p>
              <h1 className="font-display text-4xl leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
                {isEs ? "La coalición que pasa la bondad hacia adelante." : "The coalition carrying kindness forward."}
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-warm-cream/75 md:text-lg">
                {isEs
                  ? "Pásalo Pa'lante avanza gracias a las organizaciones que lo respaldan. A través de seis pilares, nuestros socios coorganizan activaciones, financian el movimiento y llevan la bondad a cada rincón de sus comunidades."
                  : "Pásalo Pa'lante moves forward because of the organizations standing behind it. Across six pillars, our partners co-host activations, fund the movement, and carry kindness into every corner of their communities."}
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                <a
                  href="#directory"
                  className="inline-flex h-[52px] items-center justify-center rounded-full bg-warm-terracotta px-7 text-sm font-bold text-white transition-transform duration-200 hover:scale-105"
                >
                  {isEs ? "Explora el directorio" : "Explore the directory"}
                </a>
                <a
                  href="#join"
                  className="inline-flex h-[52px] items-center justify-center rounded-full border-[1.5px] border-warm-cream/40 px-7 text-sm font-bold text-warm-cream transition-colors duration-200 hover:border-warm-cream"
                >
                  {isEs ? "Conviértete en socio" : "Become a partner"}
                </a>
              </div>
            </div>
            <dl className="grid flex-1 grid-cols-3 gap-0 border-t border-warm-cream/20" style={{ flexBasis: "320px" }}>
              <div className="flex flex-col gap-1.5 pr-4 pt-5">
                <dd className="font-display text-4xl leading-none md:text-5xl">{totalPartners}</dd>
                <dt className="text-xs font-semibold leading-tight text-warm-cream/70">
                  {isEs ? "Organizaciones socias" : "Partner organizations"}
                </dt>
              </div>
              <div className="flex flex-col gap-1.5 border-l border-warm-cream/20 px-4 pt-5">
                <dd className="font-display text-4xl leading-none md:text-5xl">{pillars.length}</dd>
                <dt className="text-xs font-semibold leading-tight text-warm-cream/70">
                  {isEs ? "Sectores trabajando juntos" : "Sectors working together"}
                </dt>
              </div>
              <div className="flex flex-col gap-1.5 border-l border-warm-cream/20 py-5 pl-4">
                <dd className="font-display text-4xl leading-none text-warm-gold md:text-5xl">
                  {totals ? compactNumber(totals.pledged, locale) : "—"}
                </dd>
                <dt className="text-xs font-semibold leading-tight text-warm-cream/70">
                  {isEs ? "Actos de bondad, una meta compartida" : "Acts of kindness, one shared goal"}
                </dt>
              </div>
            </dl>
          </div>
          <div aria-hidden="true" className="flex h-1.5">
            <span className="flex-1" style={{ background: "#00a3e0" }} />
            <span className="flex-1 bg-warm-terracotta" />
            <span className="flex-1 bg-warm-gold" />
            <span className="flex-1" style={{ background: "#d81b60" }} />
          </div>
        </section>

        {/* Sticky search / filter bar */}
        <div id="directory" className="sticky top-0 z-10 border-b border-border bg-warm-cream/95 backdrop-blur">
          <div className="section-padding mx-auto flex max-w-6xl flex-wrap items-center gap-3 py-4">
            <div className="relative min-w-[220px] flex-[999_1_300px]">
              <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" />
              <label htmlFor="partner-search" className="sr-only">
                {isEs ? "Buscar socios" : "Search partners"}
              </label>
              <input
                id="partner-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isEs ? "Buscar socios" : "Search partners"}
                className="h-12 w-full rounded-full border border-border bg-white pl-11 pr-4 text-sm text-foreground outline-none focus:border-warm-terracotta"
              />
            </div>
            <div role="group" aria-label={isEs ? "Filtrar por sector" : "Filter by sector"} className="flex flex-[1_1_auto] flex-wrap gap-2">
              {chips.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={sector === c.id}
                  onClick={() => setSector(c.id)}
                  className={`flex h-10 items-center gap-1.5 rounded-full border px-4 text-[13px] font-bold transition-colors ${
                    sector === c.id
                      ? "border-cyan-900 bg-cyan-900 text-white"
                      : "border-border bg-white text-foreground hover:border-warm-terracotta"
                  }`}
                >
                  {c.label}
                  <span className="text-xs font-semibold opacity-75">{c.count}</span>
                </button>
              ))}
            </div>
            <span className="text-[13px] font-semibold text-foreground/70">
              {isEs ? `Mostrando ${shown} de ${totalPartners}` : `Showing ${shown} of ${totalPartners}`}
            </span>
          </div>
        </div>

        {/* Directory */}
        <div className="section-padding mx-auto flex max-w-6xl flex-col gap-16 py-14">
          <p className="-mb-10 max-w-3xl text-sm leading-relaxed text-foreground/60">
            {isEs
              ? "Estos son los socios fundadores confirmados para la Temporada de Bondad Global. Hay más organizaciones completando su incorporación y se añadirán a esta lista a medida que se confirmen."
              : "These are the founding partners confirmed for Global Kindness Season. More organizations are completing onboarding and will be added to this list as they're confirmed."}
          </p>
          {sections.map((s) => (
            <section key={s.id} aria-labelledby={`sec-${s.id}`} className="flex flex-col gap-6">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-5">
                <div className="flex items-baseline gap-4">
                  <span className="font-display text-xl text-warm-terracotta">{s.n}</span>
                  <h2 id={`sec-${s.id}`} className="font-display text-3xl text-foreground md:text-4xl">
                    {s.name}
                  </h2>
                  <span className="whitespace-nowrap rounded-full bg-warm-sand px-2.5 py-1 text-xs font-bold text-foreground/70">
                    {s.items.length} {s.items.length === 1 ? (isEs ? "socio" : "partner") : isEs ? "socios" : "partners"}
                  </span>
                </div>
                <p className="max-w-lg text-sm leading-relaxed text-foreground/70">{s.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4">
                {s.items.map((p) => (
                  <PartnerCard key={p.name} partner={p} tag={s.tag} />
                ))}
              </div>
            </section>
          ))}

          {shown === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-3xl border-[1.5px] border-dashed border-border px-6 py-16 text-center">
              <h2 className="font-display text-2xl text-foreground">
                {isEs ? "Ningún socio coincide con esa búsqueda" : "No partners match that search"}
              </h2>
              <p className="text-sm text-foreground/70">
                {isEs ? "Prueba con otro nombre o explora todos los sectores." : "Try another name, or browse all sectors."}
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSector("all");
                }}
                className="mt-2 h-[46px] rounded-full bg-cyan-900 px-6 text-sm font-bold text-white"
              >
                {isEs ? "Mostrar todos los socios" : "Show all partners"}
              </button>
            </div>
          )}
        </div>

        {/* Become a partner */}
        <section id="join" className="section-padding mx-auto max-w-6xl pb-24 pt-4">
          <div className="relative overflow-hidden rounded-[28px] bg-cyan-900 p-8 text-warm-cream md:p-16">
            <img
              src="/world-map.svg"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-20 -left-16 w-[340px] opacity-[0.06]"
            />
            <div className="relative flex flex-wrap items-center gap-10">
              <div className="flex flex-1 flex-col gap-4" style={{ flexBasis: "420px" }}>
                <p className="text-xs font-bold tracking-[0.18em] text-warm-gold">
                  {isEs ? "CONVIÉRTETE EN SOCIO" : "BECOME A PARTNER"}
                </p>
                <h2 className="font-display text-3xl leading-tight md:text-4xl">
                  {isEs ? "Pon el nombre de tu organización detrás de la bondad." : "Put your organization's name behind kindness."}
                </h2>
                <p className="text-base leading-relaxed text-warm-cream/75">
                  {isEs
                    ? "Únete al movimiento y ayúdanos a pasar la bondad. Cuéntanos sobre tu organización y te contactaremos con los próximos pasos."
                    : "Join the movement and help us pass kindness forward. Tell us about your organization and we'll follow up with next steps."}
                </p>
              </div>
              <div className="flex flex-1 flex-col gap-3" style={{ flexBasis: "280px", maxWidth: "320px" }}>
                <a
                  href="/partners/apply"
                  className="flex h-14 items-center justify-center rounded-full bg-warm-terracotta text-base font-bold text-white transition-transform duration-200 hover:scale-105"
                >
                  {isEs ? "Contáctanos" : "Get in touch"}
                </a>
                <a
                  href="mailto:info@teamopr.org"
                  className="flex h-14 items-center justify-center rounded-full border-[1.5px] border-warm-cream/40 text-sm font-semibold text-warm-cream"
                >
                  info@teamopr.org
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
