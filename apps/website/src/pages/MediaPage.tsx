import { useEffect, useRef, useState, type ReactNode } from "react";
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
  Play,
  Twitter,
  Youtube,
} from "lucide-react";
import {
  broadcastOutlets,
  digitalNews,
  featuredUrls,
  mediaSummary,
  otherOutletsReached,
  socialCoverage,
  videoAndPodcast,
  type MediaItem,
} from "@/data/mediaCoverage";
import { loadFacebookSdk, loadInstagramEmbed, loadTwitterWidgets } from "@/lib/socialEmbeds";

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
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      {item.imageUrl && (
        <div className="aspect-video w-full overflow-hidden bg-foreground/5">
          <img
            src={item.imageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        </div>
      )}
      <div className="flex flex-col gap-2 p-5">
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
      </div>
    </a>
  );
}

function extractYouTubeId(url: string): string | null {
  const patterns = [/youtube\.com\/watch\?v=([^&]+)/, /youtube\.com\/live\/([^?&]+)/, /youtu\.be\/([^?&]+)/];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractSpotifyEpisodeId(url: string): string | null {
  const match = url.match(/open\.spotify\.com\/episode\/([^?&]+)/);
  return match ? match[1] : null;
}

/** Real thumbnail + play button for YouTube (click reveals the actual
 * player), and Spotify's own official embed for its episode — both work
 * without loading a platform SDK script, unlike Facebook/Instagram/X. */
function VideoEmbedCard({ item }: { item: MediaItem }) {
  const [playing, setPlaying] = useState(false);

  if (item.type === "spotify") {
    const episodeId = extractSpotifyEpisodeId(item.url);
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-foreground/50">
          <Mic size={16} className="shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wide text-foreground/50">
            {item.outlet}
          </span>
        </div>
        {item.title && (
          <p className="text-sm font-semibold leading-snug text-foreground">{item.title}</p>
        )}
        {episodeId ? (
          <iframe
            title={item.title ?? item.outlet}
            src={`https://open.spotify.com/embed/episode/${episodeId}?utm_source=generator`}
            width="100%"
            height="152"
            style={{ borderRadius: 12, border: 0 }}
            loading="lazy"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          />
        ) : (
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-[#0079A8] hover:underline">
            {item.outlet} <ExternalLink size={12} className="inline" />
          </a>
        )}
      </div>
    );
  }

  const videoId = item.type === "youtube" ? extractYouTubeId(item.url) : null;
  if (!videoId) return <MediaCard item={item} />;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-foreground/50">
        <Youtube size={16} className="shrink-0" />
        <span className="text-xs font-bold uppercase tracking-wide text-foreground/50">{item.outlet}</span>
      </div>
      {item.title && <p className="text-sm font-semibold leading-snug text-foreground">{item.title}</p>}
      {item.note && <p className="text-xs leading-snug text-foreground/60">{item.note}</p>}
      <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
        {playing ? (
          <iframe
            title={item.title ?? item.outlet}
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
            className="absolute inset-0 h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={`Play: ${item.title ?? item.outlet}`}
            className="group absolute inset-0 h-full w-full"
          >
            <img
              src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/30">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform group-hover:scale-110">
                <Play size={24} className="ml-1 fill-warm-terracotta text-warm-terracotta" />
              </span>
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

const EMBED_WIDTH = 340;

/** Facebook's own "fb-video" plugin covers reels too — detected from the
 * URL shape, since the report doesn't separately flag which links are
 * video vs. a plain post. */
function isFacebookVideoUrl(url: string): boolean {
  return /\/(reel|share\/v|videos)\//.test(url);
}

function extractLinkedInUrn(url: string): string | null {
  const match = url.match(/\/update\/(urn:li:activity:\d+)/);
  return match ? match[1] : null;
}

// Same icon+outlet header every other card on this page uses, plus a
// working link out to the original post — so a card still shows something
// useful (not an empty box) if its embed script is blocked, which is
// common for Facebook/Instagram/X specifically (ad blockers target them
// by name far more often than YouTube or Spotify).
function EmbedShell({ item, children }: { item: MediaItem; children: ReactNode }) {
  const Icon = ICONS[item.type];
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-foreground/50">
          <Icon size={16} className="shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wide text-foreground/50">{item.outlet}</span>
        </div>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open original post from ${item.outlet} (opens in a new tab)`}
        >
          <ExternalLink size={14} className="shrink-0 text-foreground/30 transition-colors hover:text-warm-terracotta" />
        </a>
      </div>
      {item.title && <p className="text-sm font-semibold leading-snug text-foreground">{item.title}</p>}
      {item.note && <p className="text-xs leading-snug text-foreground/60">{item.note}</p>}
      <div className="flex justify-center overflow-hidden rounded-xl">{children}</div>
    </div>
  );
}

function FacebookEmbed({ item }: { item: MediaItem }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    loadFacebookSdk().then(() => window.FB?.XFBML.parse(ref.current ?? undefined));
  }, []);
  return (
    <div ref={ref}>
      <EmbedShell item={item}>
        {isFacebookVideoUrl(item.url) ? (
          <div className="fb-video" data-href={item.url} data-width={EMBED_WIDTH} data-show-text="false" />
        ) : (
          <div className="fb-post" data-href={item.url} data-width={EMBED_WIDTH} />
        )}
      </EmbedShell>
    </div>
  );
}

function InstagramEmbed({ item }: { item: MediaItem }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    loadInstagramEmbed().then(() => window.instgrm?.Embeds.process());
  }, []);
  return (
    <div ref={ref}>
      <EmbedShell item={item}>
        <blockquote
          className="instagram-media"
          data-instgrm-permalink={item.url}
          data-instgrm-version="14"
          style={{ margin: 0, width: "100%", maxWidth: EMBED_WIDTH }}
        />
      </EmbedShell>
    </div>
  );
}

function TwitterEmbed({ item }: { item: MediaItem }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    loadTwitterWidgets().then(() => window.twttr?.widgets.load(ref.current ?? undefined));
  }, []);
  return (
    <div ref={ref}>
      <EmbedShell item={item}>
        <blockquote className="twitter-tweet">
          <a href={item.url}>{item.note ?? item.outlet}</a>
        </blockquote>
      </EmbedShell>
    </div>
  );
}

function LinkedInEmbed({ item }: { item: MediaItem }) {
  const urn = extractLinkedInUrn(item.url);
  if (!urn) return <MediaCard item={item} />;
  return (
    <EmbedShell item={item}>
      <iframe
        title={item.outlet}
        src={`https://www.linkedin.com/embed/feed/update/${urn}`}
        height={400}
        width="100%"
        style={{ border: 0, maxWidth: EMBED_WIDTH }}
        allowFullScreen
      />
    </EmbedShell>
  );
}

/** Dispatches every embeddable item to its platform's real embed — YouTube
 * thumbnail+play, Spotify's own player, or each social platform's official
 * widget — falling back to a plain link card for anything without one
 * (plain news articles, or a malformed URL). */
function RichEmbedCard({ item }: { item: MediaItem }) {
  switch (item.type) {
    case "youtube":
    case "spotify":
      return <VideoEmbedCard item={item} />;
    case "facebook":
      return <FacebookEmbed item={item} />;
    case "instagram":
      return <InstagramEmbed item={item} />;
    case "x":
      return <TwitterEmbed item={item} />;
    case "linkedin":
      return <LinkedInEmbed item={item} />;
    default:
      return <MediaCard item={item} />;
  }
}

function Section({
  eyebrow,
  items,
  CardComponent = MediaCard,
  columns = 3,
}: {
  eyebrow: string;
  items: MediaItem[];
  CardComponent?: typeof MediaCard;
  columns?: 2 | 3;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-12">
      <p className="eyebrow mb-5">{eyebrow}</p>
      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${columns === 3 ? "lg:grid-cols-3" : ""}`}>
        {items.map((item, i) => (
          <CardComponent key={`${item.url}-${i}`} item={item} />
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

  const featured = [...videoAndPodcast, ...socialCoverage].filter((item) =>
    featuredUrls.includes(item.url),
  );

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
                <dd className="font-display text-xl leading-snug md:text-2xl">
                  {isEs ? (
                    <>
                      Puerto Rico registró{" "}
                      <span className="text-3xl md:text-4xl">
                        {new Intl.NumberFormat(locale).format(1135096)}
                      </span>{" "}
                      actos de bondad en 5 días.
                    </>
                  ) : (
                    <>
                      Puerto Rico recorded{" "}
                      <span className="text-3xl md:text-4xl">
                        {new Intl.NumberFormat(locale).format(1135096)}
                      </span>{" "}
                      acts of kindness in 5 days.
                    </>
                  )}
                </dd>
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
            eyebrow={isEs ? "Destacados" : "Featured"}
            items={featured}
            CardComponent={RichEmbedCard}
            columns={2}
          />
          <Section
            eyebrow={isEs ? "Noticias y prensa digital" : "Digital news & press"}
            items={digitalNews}
          />
          <Section
            eyebrow={isEs ? "Video y podcast" : "Video & podcast"}
            items={videoAndPodcast}
            CardComponent={RichEmbedCard}
            columns={2}
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
