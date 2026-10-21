import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SEO from "@/components/SEO";
import { useLanguage } from "@shared/contexts/LanguageContext";
import {
  ExternalLink,
  Facebook,
  Instagram,
  Linkedin,
  Mic,
  Newspaper,
  Radio,
  Twitter,
  Youtube,
} from "lucide-react";
import {
  broadcastOutlets,
  digitalNews,
  mediaSummary,
  otherOutletsReached,
  socialCoverage,
  videoAndPodcast,
  type MediaItem,
} from "@/data/mediaCoverage";

// /media: 2025 Pásalo Pa'lante press coverage. Shown on both
// pasalopalante.com and passkindnessforward.com (shared build — see
// apps/website/index.html) since Pass Kindness Forward uses this coverage
// too, even though the record itself is Puerto Rico–specific — copy below
// is kept brand-neutral for that reason, no on-page explanation needed.

const ICONS: Record<MediaItem["type"], typeof Newspaper> = {
  article: Newspaper,
  youtube: Youtube,
  facebook: Facebook,
  instagram: Instagram,
  x: Twitter,
  linkedin: Linkedin,
  spotify: Mic,
};

function MediaCard({ item }: { item: MediaItem }) {
  const Icon = ICONS[item.type];
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-2 rounded-2xl border border-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-foreground/50">
          <Icon size={16} className="shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wide text-foreground/50">
            {item.outlet}
          </span>
        </div>
        <ExternalLink
          size={14}
          className="shrink-0 text-foreground/30 transition-colors group-hover:text-warm-terracotta"
        />
      </div>
      {item.title && (
        <p className="text-sm font-semibold leading-snug text-foreground">{item.title}</p>
      )}
      {item.note && <p className="text-xs leading-snug text-foreground/60">{item.note}</p>}
    </a>
  );
}

function Section({
  eyebrow,
  items,
}: {
  eyebrow: string;
  items: MediaItem[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-12">
      <p className="eyebrow mb-5">{eyebrow}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <MediaCard key={`${item.url}-${i}`} item={item} />
        ))}
      </div>
    </div>
  );
}

function OutletChips({ names }: { names: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {names.map((name) => (
        <span
          key={name}
          className="rounded-full border border-border bg-white px-3.5 py-1.5 text-xs font-medium text-foreground/70"
        >
          {name}
        </span>
      ))}
    </div>
  );
}

function compactNumber(n: number, locale: string) {
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export default function MediaPage() {
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const locale = isEs ? "es" : "en";

  return (
    <div className="min-h-screen bg-warm-cream">
      <SEO
        title="In the Press — Pásalo Pa'lante"
        description="1,135,096 acts of kindness, every municipality, millions of impressions. See the coverage, then join the next wave."
        path="/media"
      />
      <ScrollToTop />
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-cyan-900 text-warm-cream">
          <div className="section-padding relative mx-auto flex max-w-6xl flex-wrap items-end gap-12 pb-16 pt-28 md:pt-32">
            <div className="flex flex-1 flex-col gap-6" style={{ flexBasis: "560px" }}>
              <p className="text-xs font-bold tracking-[0.18em] text-warm-gold">
                {isEs ? "EN LA PRENSA" : "IN THE PRESS"}
              </p>
              <h1 className="font-display text-4xl leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
                {isEs
                  ? "Un récord mundial no pasa desapercibido."
                  : "A world record doesn't go unnoticed."}
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-warm-cream/75 md:text-lg">
                {isEs
                  ? "En noviembre de 2025, el movimiento de bondad llegó a cada rincón de Puerto Rico — y la prensa lo cubrió. Esto es apenas una muestra de esa cobertura. La próxima ola será aún más grande."
                  : "In November 2025, the kindness movement reached every corner of Puerto Rico — and the press took notice. This is a sample of that coverage. The next wave is going to be bigger."}
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                <a
                  href="/get-involved"
                  className="inline-flex h-[52px] items-center justify-center rounded-full bg-warm-terracotta px-7 text-sm font-bold text-white transition-transform duration-200 hover:scale-105"
                >
                  {isEs ? "Únete al movimiento" : "Join the movement"}
                </a>
                <a
                  href="mailto:info@passkindnessforward.com?subject=Press%20inquiry"
                  className="inline-flex h-[52px] items-center justify-center rounded-full border-[1.5px] border-warm-cream/40 px-7 text-sm font-bold text-warm-cream transition-colors duration-200 hover:border-warm-cream"
                >
                  {isEs ? "Contacto de prensa" : "Press inquiries"}
                </a>
              </div>
            </div>
            <dl className="grid flex-1 grid-cols-2 gap-0 border-t border-warm-cream/20" style={{ flexBasis: "320px" }}>
              <div className="flex flex-col gap-1.5 pr-4 pt-5">
                <dd className="font-display text-4xl leading-none md:text-5xl">
                  {new Intl.NumberFormat(locale).format(1135096)}
                </dd>
                <dt className="text-xs font-semibold leading-tight text-warm-cream/70">
                  {isEs ? "Actos de bondad en 5 días" : "Acts of kindness in 5 days"}
                </dt>
              </div>
              <div className="flex flex-col gap-1.5 border-l border-warm-cream/20 py-5 pl-4">
                <dd className="font-display text-4xl leading-none text-warm-gold md:text-5xl">
                  {compactNumber(mediaSummary.impressions, locale)}+
                </dd>
                <dt className="text-xs font-semibold leading-tight text-warm-cream/70">
                  {isEs ? "Impresiones estimadas" : "Estimated impressions"}
                </dt>
              </div>
              <div className="flex flex-col gap-1.5 pr-4 pt-5">
                <dd className="font-display text-4xl leading-none md:text-5xl">
                  ${compactNumber(mediaSummary.earnedMediaValue, locale)}+
                </dd>
                <dt className="text-xs font-semibold leading-tight text-warm-cream/70">
                  {isEs ? "Valor en medios ganados" : "Earned media value"}
                </dt>
              </div>
              <div className="flex flex-col gap-1.5 border-l border-warm-cream/20 py-5 pl-4">
                <dd className="font-display text-4xl leading-none text-warm-gold md:text-5xl">
                  {mediaSummary.placementCount}+
                </dd>
                <dt className="text-xs font-semibold leading-tight text-warm-cream/70">
                  {isEs ? "Apariciones en medios" : "Media placements"}
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

        <div className="section-padding mx-auto max-w-6xl py-14 md:py-16">
          <Section
            eyebrow={isEs ? "Noticias y prensa digital" : "Digital news & press"}
            items={digitalNews}
          />
          <Section
            eyebrow={isEs ? "Video y podcast" : "Video & podcast"}
            items={videoAndPodcast}
          />
          <Section
            eyebrow={isEs ? "Cobertura en redes sociales" : "Social media coverage"}
            items={socialCoverage}
          />

          <div className="grid grid-cols-1 gap-10 border-t border-border pt-10 md:grid-cols-2">
            <div>
              <p className="eyebrow mb-4">
                {isEs ? "Transmisión y radio" : "Broadcast & radio"}
              </p>
              <OutletChips names={broadcastOutlets} />
            </div>
            <div>
              <p className="eyebrow mb-4">
                {isEs ? "Otros medios alcanzados" : "Other outlets reached"}
              </p>
              <OutletChips names={otherOutletsReached} />
            </div>
          </div>

          <p className="mt-10 max-w-2xl text-xs leading-relaxed text-foreground/50">
            {isEs
              ? "Esta es una muestra de nuestra cobertura de 2025, no un registro completo — otros clips, reposts y cobertura internacional no están incluidos."
              : "This is a sample of our 2025 coverage, not a complete record — other clips, reposts, and international pickup aren't included."}
          </p>
        </div>

        {/* Closing CTA */}
        <section className="bg-warm-sand py-16 md:py-20">
          <div className="section-padding mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
            <p className="eyebrow">{isEs ? "La próxima ola" : "The next wave"}</p>
            <h2 className="font-display text-3xl leading-tight text-foreground md:text-4xl">
              {isEs
                ? "Puerto Rico demostró que se puede. Ahora es el turno del mundo."
                : "Puerto Rico proved it's possible. Now it's the world's turn."}
            </h2>
            <p className="max-w-xl text-base leading-relaxed text-foreground/70">
              {isEs
                ? "Súmate a la Temporada Global de la Bondad y ayuda a crear el próximo récord — o cúbrelo tú mismo."
                : "Join Global Kindness Season and help create the next record — or cover it yourself."}
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              <a
                href="/get-involved"
                className="inline-flex h-[52px] items-center justify-center rounded-full bg-warm-terracotta px-7 text-sm font-bold text-white transition-transform duration-200 hover:scale-105"
              >
                {isEs ? "Únete al movimiento" : "Join the movement"}
              </a>
              <a
                href="mailto:info@passkindnessforward.com?subject=Press%20inquiry"
                className="inline-flex h-[52px] items-center justify-center rounded-full border-[1.5px] border-foreground/20 px-7 text-sm font-bold text-foreground transition-colors duration-200 hover:border-foreground/50"
              >
                {isEs ? "Contacto de prensa" : "Press inquiries"}
                <ExternalLink size={14} className="ml-1.5 shrink-0" />
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
