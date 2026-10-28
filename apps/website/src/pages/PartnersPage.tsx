import { useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SEO from "@/components/SEO";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { useMovementTotals } from "@shared/hooks/useMovementTotals";
import { Skeleton } from "@shared/components/ui/skeleton";
import { ExternalLink, Facebook, Search, Sparkles, Star } from "lucide-react";
import { usePartnerDirectory, type PartnerEntry } from "@/hooks/usePartnerDirectory";

const INITIALS_STOPWORDS = new Set(["and", "of", "the", "&", "de", "la", "el"]);

function initials(name: string) {
  const words = name.split(/\s+/).filter((w) => w && !INITIALS_STOPWORDS.has(w.toLowerCase()));
  return words
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function PartnerCard({ partner, featured = false }: { partner: PartnerEntry; featured?: boolean }) {
  return (
    <article
      className={`relative flex flex-col overflow-hidden rounded-2xl bg-white ${
        featured ? "border-2 border-warm-gold shadow-md" : "border border-border shadow-sm"
      }`}
    >
      {featured && (
        <span className="absolute start-3 top-3 z-[1] inline-flex items-center gap-1 rounded-full bg-warm-gold px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#0e234b]">
          <Star size={11} className="fill-current" />
          Featured
        </span>
      )}
      <div
        className={`flex items-center justify-center border-b border-border p-5 ${featured ? "h-40 md:h-56" : "h-44"} ${
          partner.dark ? "bg-cyan-900" : "bg-white"
        }`}
      >
        {partner.logoUrl ? (
          <img
            src={partner.logoUrl}
            alt={partner.name}
            loading="lazy"
            className={`w-auto max-w-[88%] object-contain ${featured ? "max-h-28 md:max-h-40" : "max-h-32"}`}
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
        <h3 className={`font-bold leading-snug text-foreground ${featured ? "text-base" : "text-sm"}`}>{partner.name}</h3>
        <div className="mt-auto flex flex-col gap-1 pt-2">
          {partner.role && <span className="text-xs font-medium leading-snug text-foreground/60">{partner.role}</span>}
          {partner.website && (
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
          )}
          {partner.facebook && (
            <a
              href={partner.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Visit ${partner.name} on Facebook (opens in a new tab)`}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#0079A8] hover:underline"
            >
              <Facebook size={12} className="shrink-0" />
              Facebook
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function compactNumber(n: number, locale: string) {
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export default function PartnersPage() {
  const { lang, t } = useLanguage();
  const tp = t.partnersPage;
  const locale = lang;
  const { data: totals } = useMovementTotals();
  const { data: entries, isLoading } = usePartnerDirectory();
  const [query, setQuery] = useState("");

  // Categories are hidden for now (some are still too thin to stand on their
  // own) — every partner renders in one flat list. Organizations come first
  // A–Z, then the municipalities A–Z, so the long list of towns doesn't bury
  // them. Each row's own category (from the sheet) stays available so the
  // sector view can come back once each group is big enough.
  const partners = useMemo(() => {
    const all = entries ?? [];
    const byName = (a: PartnerEntry, b: PartnerEntry) => a.name.localeCompare(b.name, locale);
    const orgs = all.filter((p) => p.category !== "Government").sort(byName);
    const towns = all.filter((p) => p.category === "Government").sort(byName);
    return [...orgs, ...towns];
  }, [entries, locale]);
  const totalPartners = partners.length;
  // Sheet order (sort_order, then name) — the team controls the order of
  // the Featured row from the sheet. Featured partners still also appear in
  // the full directory below.
  const featuredPartners = useMemo(() => (entries ?? []).filter((p) => p.featured), [entries]);

  const q = query.trim().toLowerCase();
  const matchesQuery = (p: PartnerEntry) => !q || p.name.toLowerCase().includes(q) || (p.website ?? "").includes(q);

  const items = useMemo(
    () => partners.filter(matchesQuery),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [partners, q],
  );

  const shown = items.length;

  return (
    <div className="min-h-screen bg-warm-cream">
      <SEO
        title="Our Partners — Kindness Forward"
        description="Meet the businesses, media, governments, nonprofits, and educators powering Pásalo Pa'lante and the global kindness movement."
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
            className="pointer-events-none absolute -end-20 top-10 w-[560px] opacity-[0.06]"
          />
          <div className="section-padding relative mx-auto flex max-w-6xl flex-wrap items-end gap-12 pb-16 pt-28 md:pt-32">
            <div className="flex flex-1 flex-col gap-6" style={{ flexBasis: "560px" }}>
              <p className="text-xs font-bold tracking-[0.18em] text-warm-gold">
                {tp.eyebrow}
              </p>
              <h1 className="font-display text-4xl leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
                {tp.heading}
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-warm-cream/75 md:text-lg">
                {tp.intro}
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                <a
                  href="#directory"
                  className="inline-flex h-[52px] items-center justify-center rounded-full bg-warm-terracotta px-7 text-sm font-bold text-white transition-transform duration-200 hover:scale-105"
                >
                  {tp.exploreDirectory}
                </a>
                <a
                  href="#join"
                  className="inline-flex h-[52px] items-center justify-center rounded-full border-[1.5px] border-warm-cream/40 px-7 text-sm font-bold text-warm-cream transition-colors duration-200 hover:border-warm-cream"
                >
                  {tp.becomePartner}
                </a>
              </div>
            </div>
            <dl className="grid flex-1 grid-cols-2 gap-0 border-t border-warm-cream/20" style={{ flexBasis: "320px" }}>
              <div className="flex flex-col gap-1.5 pe-4 pt-5">
                <dd className="font-display text-4xl leading-none md:text-5xl">{!isLoading ? totalPartners : "—"}</dd>
                <dt className="text-xs font-semibold leading-tight text-warm-cream/70">
                  {tp.statPartners}
                </dt>
              </div>
              <div className="flex flex-col gap-1.5 border-l border-warm-cream/20 py-5 ps-4">
                <dd className="font-display text-4xl leading-none text-warm-gold md:text-5xl">
                  {totals ? compactNumber(totals.pledged, locale) : "—"}
                </dd>
                <dt className="text-xs font-semibold leading-tight text-warm-cream/70">
                  {tp.statActs}
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

        {/* Featured partners — only rendered when at least one row in the
            PKF_Partners sheet is marked Featured. */}
        {featuredPartners.length > 0 && (
          <section aria-labelledby="featured-partners" className="section-padding mx-auto max-w-6xl pb-4 pt-14">
            <div className="mb-6 flex flex-col gap-2">
              <p className="text-xs font-bold tracking-[0.18em] text-warm-terracotta">
                {tp.featuredEyebrow}
              </p>
              <h2 id="featured-partners" className="font-display text-3xl leading-tight text-foreground md:text-4xl">
                {tp.featuredHeading}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
              {featuredPartners.map((p) => (
                <PartnerCard key={p.id} partner={p} featured />
              ))}
            </div>
          </section>
        )}

        {/* Sticky search / filter bar */}
        <div id="directory" className="sticky top-0 z-10 border-b border-border bg-warm-cream/95 backdrop-blur">
          <div className="section-padding mx-auto flex max-w-6xl flex-wrap items-center gap-3 py-4">
            <div className="relative min-w-[220px] flex-[999_1_300px]">
              <Search size={16} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-foreground/40" />
              <label htmlFor="partner-search" className="sr-only">
                {tp.searchPartners}
              </label>
              <input
                id="partner-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tp.searchPartners}
                className="h-12 w-full rounded-full border border-border bg-white ps-11 pe-4 text-sm text-foreground outline-none focus:border-warm-terracotta"
              />
            </div>
            <span className="text-[13px] font-semibold text-foreground/70">
              {tp.showing.replace("{shown}", String(shown)).replace("{total}", String(totalPartners))}
            </span>
          </div>
        </div>

        {/* Directory */}
        <div className="section-padding mx-auto flex max-w-6xl flex-col gap-16 py-14">
          <div
            className="-mb-10 flex items-center gap-4 rounded-2xl border border-border bg-white py-5 ps-6 pe-6"
            style={{ borderLeft: "4px solid #0e234b" }}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-warm-sand">
              <Sparkles size={22} className="text-warm-terracotta" />
            </div>
            <div>
              <h2 className="text-xl leading-snug text-foreground">
                {tp.updatingNotice}
              </h2>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <Skeleton key={i} className="h-44 rounded-2xl" />
              ))}
            </div>
          ) : shown > 0 ? (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4">
              {items.map((p) => (
                <PartnerCard key={p.id} partner={p} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-3xl border-[1.5px] border-dashed border-border px-6 py-16 text-center">
              <h2 className="font-display text-2xl text-foreground">
                {tp.noMatchHeading}
              </h2>
              <p className="text-sm text-foreground/70">
                {tp.noMatchBody}
              </p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mt-2 h-[46px] rounded-full bg-cyan-900 px-6 text-sm font-bold text-white"
              >
                {tp.showAll}
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
              className="pointer-events-none absolute -bottom-20 -start-16 w-[340px] opacity-[0.06]"
            />
            <div className="relative flex flex-wrap items-center gap-10">
              <div className="flex flex-1 flex-col gap-4" style={{ flexBasis: "420px" }}>
                <p className="text-xs font-bold tracking-[0.18em] text-warm-gold">
                  {tp.joinEyebrow}
                </p>
                <h2 className="font-display text-3xl leading-tight md:text-4xl">
                  {tp.joinHeading}
                </h2>
                <p className="text-base leading-relaxed text-warm-cream/75">
                  {tp.joinBody}
                </p>
              </div>
              <div className="flex flex-1 flex-col gap-3" style={{ flexBasis: "280px", maxWidth: "320px" }}>
                <a
                  href="/partners/apply"
                  className="flex h-14 items-center justify-center rounded-full bg-warm-terracotta text-base font-bold text-white transition-transform duration-200 hover:scale-105"
                >
                  {tp.becomePartner}
                </a>
                <p className="mt-2 text-center text-xs font-semibold uppercase tracking-[0.14em] text-warm-cream/60">
                  {tp.emailQuestion}
                </p>
                <a
                  href="mailto:info@passkindnessforward.com"
                  className="flex h-14 items-center justify-center rounded-full border-[1.5px] border-warm-cream/40 text-sm font-semibold text-warm-cream"
                >
                  info@passkindnessforward.com
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
