import { useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SEO from "@/components/SEO";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { Skeleton } from "@shared/components/ui/skeleton";
import { ExternalLink, Facebook, Globe, Instagram, Search, Users } from "lucide-react";
import { useDirectory, type DirectoryEntry } from "@/hooks/useDirectory";

const TINTS = ["bg-warm-sand", "bg-[#e2f1ea]", "bg-[#eee6f3]", "bg-[#e2eff8]", "bg-[#fdf0d9]"];

const INITIALS_STOPWORDS = new Set(["and", "of", "the", "&", "de", "la", "el"]);

function initials(name: string) {
  const words = name
    .replace(/["()]/g, "")
    .split(/\s+/)
    .filter((w) => w && !INITIALS_STOPWORDS.has(w.toLowerCase()));
  return words
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Public display name: first name + last-name initial only (e.g. "Ada
 * Monzón" -> "Ada M."), per Chin's privacy rule for the directory — the
 * full name still syncs from the sheet and is used internally (bios,
 * outreach), this only affects what's rendered on the page. Strips a
 * leading title ("Dr.") and any parenthetical or quoted nickname (e.g.
 * 'Angelique "La Burbu" Burgos' -> "Angelique B.") before splitting.
 * A one-word name (a stage name like "Sukadev") is shown as-is. A few
 * rows hold two people in one field ("Marilyn & Manuel", "Emily Collins /
 * Romina Garay") — those are a known rough edge of this heuristic; the
 * cleaner long-term fix is splitting them into their own sheet rows.
 */
function displayName(name: string) {
  const cleaned = name
    .replace(/\([^)]*\)/g, " ")
    .replace(/["“][^"”]*["”]/g, " ")
    .replace(/^(Dr|Mr|Mrs|Ms|Rev|Prof)\.?\s+/i, "")
    .trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return name;
  if (words.length === 1) return words[0];
  const lastInitial = words[words.length - 1][0]?.toUpperCase();
  return lastInitial ? `${words[0]} ${lastInitial}.` : words[0];
}

function socialIcon(url: string) {
  if (/instagram\.com/i.test(url)) return Instagram;
  if (/facebook\.com/i.test(url)) return Facebook;
  if (/tiktok\.com|twitter\.com|x\.com|linkedin\.com|youtube\.com/i.test(url)) return ExternalLink;
  return Globe;
}

function DirectoryCard({ entry, tint }: { entry: DirectoryEntry; tint: string }) {
  const place = [entry.region, entry.country].filter(Boolean).join(", ") || entry.country || entry.region;
  const title = entry.designation || entry.category;
  const Icon = entry.socialLink ? socialIcon(entry.socialLink) : null;

  return (
    <article className="flex flex-col items-center overflow-hidden rounded-2xl border border-border bg-white px-5 pb-5 pt-7 text-center shadow-sm">
      {entry.imageUrl ? (
        <img
          src={entry.imageUrl}
          alt=""
          loading="lazy"
          className="mb-4 h-[104px] w-[104px] rounded-full object-cover"
        />
      ) : (
        <div
          className={`mb-4 flex h-[104px] w-[104px] items-center justify-center rounded-full font-display text-3xl text-foreground ${tint}`}
          aria-hidden="true"
        >
          {initials(entry.name)}
        </div>
      )}
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-warm-terracotta">{title}</p>
      <h3 className="mb-1 font-display text-xl text-foreground">{displayName(entry.name)}</h3>
      {entry.handle && <p className="mb-1 text-sm text-foreground/60">{entry.handle}</p>}
      {place && <p className="text-sm text-foreground/70">{place}</p>}

      {entry.bio && (
        <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-foreground/65">{entry.bio}</p>
      )}

      {entry.socialLink && Icon && (
        <a
          href={entry.socialLink}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${displayName(entry.name)}'s profile`}
          className="mt-4 flex h-11 w-11 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-warm-terracotta hover:text-warm-terracotta"
        >
          <Icon size={17} strokeWidth={1.8} />
        </a>
      )}
    </article>
  );
}

export default function GlobalAmbassadorsPage() {
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const { data: entries, isLoading } = useDirectory();
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [category, setCategory] = useState("All");

  const all = entries ?? [];
  const countries = useMemo(
    () => Array.from(new Set(all.map((a) => a.country).filter((c): c is string => !!c))).sort(),
    [all],
  );
  const categories = useMemo(() => Array.from(new Set(all.map((a) => a.category))).sort(), [all]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((a) => {
      if (country && a.country !== country) return false;
      if (category !== "All" && a.category !== category) return false;
      if (q && !`${a.name} ${a.region ?? ""} ${a.country ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [all, query, country, category]);

  return (
    <div className="min-h-screen bg-warm-cream">
      <SEO
        title="Global Kindness Ambassadors — Pásalo Pa'lante"
        description="Find the Global Kindness Ambassador leading kindness in your country, connect with them, and plan acts of kindness together."
        path="/ambassadors"
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
                {isEs ? "NUESTROS EMBAJADORES · LA COALICIÓN DE BONDAD" : "OUR AMBASSADORS · THE KINDNESS COALITION"}
              </p>
              <h1 className="font-display text-4xl leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
                {isEs ? "Las voces que llevan la bondad adelante." : "The voices carrying kindness forward."}
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-warm-cream/75 md:text-lg">
                {isEs
                  ? "Encuentra al embajador o campeón que lidera la bondad en tu país, conecta con ellos y planifiquen juntos actos de bondad."
                  : "Find the ambassador or champion leading kindness in your country, connect with them, and plan acts of kindness together."}
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                <a
                  href="#directory"
                  className="inline-flex h-[52px] items-center justify-center rounded-full bg-warm-terracotta px-7 text-sm font-bold text-white transition-transform duration-200 hover:scale-105"
                >
                  {isEs ? "Explora el directorio" : "Explore the directory"}
                </a>
                <a
                  href="/get-involved/ambassadors"
                  className="inline-flex h-[52px] items-center justify-center rounded-full border-[1.5px] border-warm-cream/40 px-7 text-sm font-bold text-warm-cream transition-colors duration-200 hover:border-warm-cream"
                >
                  {isEs ? "Sé Embajador" : "Become an Ambassador"}
                </a>
              </div>
            </div>
            <dl className="grid flex-1 grid-cols-2 gap-0 border-t border-warm-cream/20" style={{ flexBasis: "320px" }}>
              <div className="flex flex-col gap-1.5 pr-4 pt-5">
                <dd className="font-display text-4xl leading-none md:text-5xl">{!isLoading ? all.length : "—"}</dd>
                <dt className="text-xs font-semibold leading-tight text-warm-cream/70">
                  {isEs ? "Embajadores y campeones" : "Ambassadors & champions"}
                </dt>
              </div>
              <div className="flex flex-col gap-1.5 border-l border-warm-cream/20 py-5 pl-4">
                <dd className="font-display text-4xl leading-none text-warm-gold md:text-5xl">
                  {!isLoading ? countries.length : "—"}
                </dd>
                <dt className="text-xs font-semibold leading-tight text-warm-cream/70">
                  {isEs ? "Países representados" : "Countries represented"}
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
              <label htmlFor="ambassador-search" className="sr-only">
                {isEs ? "Buscar embajadores" : "Search ambassadors"}
              </label>
              <input
                id="ambassador-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isEs ? "Buscar por nombre, país o ciudad" : "Search by name, country or city"}
                className="h-12 w-full rounded-full border border-border bg-white pl-11 pr-4 text-sm text-foreground outline-none focus:border-warm-terracotta"
              />
            </div>
            <div className="min-w-[180px] flex-[1_1_200px]">
              <label htmlFor="ambassador-country" className="sr-only">
                {isEs ? "País" : "Country"}
              </label>
              <select
                id="ambassador-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="h-12 w-full rounded-full border border-border bg-white px-4 text-sm text-foreground outline-none focus:border-warm-terracotta"
              >
                <option value="">{isEs ? "Todos los países" : "All countries"}</option>
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-[13px] font-semibold text-foreground/70">
              {isEs ? `Mostrando ${shown.length} de ${all.length}` : `Showing ${shown.length} of ${all.length}`}
            </span>
          </div>
          {categories.length > 1 && (
            <div
              role="group"
              aria-label={isEs ? "Filtrar por categoría" : "Filter by category"}
              className="section-padding mx-auto flex max-w-6xl flex-wrap gap-2 pb-4"
            >
              {["All", ...categories].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  aria-pressed={category === c}
                  className={`min-h-9 rounded-full border px-4 text-xs font-semibold transition-colors ${
                    category === c
                      ? "border-cyan-900 bg-cyan-900 text-white"
                      : "border-border bg-white text-foreground hover:border-warm-terracotta"
                  }`}
                >
                  {c === "All" ? (isEs ? "Todos" : "All") : c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Directory */}
        <div className="section-padding mx-auto flex max-w-6xl flex-col gap-10 py-14">
          <div
            className="flex items-center gap-4 rounded-2xl border border-border bg-white py-5 pl-6 pr-6"
            style={{ borderLeft: "4px solid #0e234b" }}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-warm-sand">
              <Users size={22} className="text-cyan-900" />
            </div>
            <div>
              <p className="text-xs font-bold tracking-[0.14em] text-foreground/50">
                {isEs ? "MÁS EN CAMINO" : "MORE JOINING SOON"}
              </p>
              <h3 className="font-display text-xl leading-snug text-foreground">
                {isEs
                  ? "Estos son nuestros embajadores confirmados"
                  : "These are our confirmed ambassadors and champions"}
              </h3>
              <p className="text-sm leading-relaxed text-foreground/70">
                {isEs
                  ? "Hay más personas completando su aprobación y se añadirán a este directorio en cuanto se confirmen."
                  : "More people are completing approval and will be added to this directory as they're confirmed."}
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-60 rounded-2xl" />
              ))}
            </div>
          ) : all.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-3xl border-[1.5px] border-dashed border-border px-6 py-16 text-center">
              <h2 className="font-display text-2xl text-foreground">
                {isEs ? "Aún no hay embajadores aquí" : "No ambassador here yet"}
              </h2>
              <p className="max-w-md text-sm leading-relaxed text-foreground/70">
                {isEs
                  ? "Tu país o ciudad podría ser el próximo. Sé el primer Embajador Global de Bondad y lidera el movimiento donde vives."
                  : "Your country or city could be next. Be the first Global Kindness Ambassador and lead the movement where you live."}
              </p>
              <a
                href="/get-involved/ambassadors"
                className="mt-2 inline-flex h-[46px] items-center justify-center rounded-full bg-cyan-900 px-6 text-sm font-bold text-white"
              >
                {isEs ? "Sé el primer embajador" : "Become the first ambassador"}
              </a>
            </div>
          ) : shown.length > 0 ? (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4">
              {shown.map((a, i) => (
                <DirectoryCard key={a.id} entry={a} tint={TINTS[i % TINTS.length]} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-3xl border-[1.5px] border-dashed border-border px-6 py-16 text-center">
              <h2 className="font-display text-2xl text-foreground">
                {isEs ? "Nadie coincide con tu búsqueda" : "No one matches your search"}
              </h2>
              <p className="text-sm text-foreground/70">
                {isEs ? "Prueba con otro país, categoría o término de búsqueda." : "Try a different country, category or search term."}
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setCountry("");
                  setCategory("All");
                }}
                className="mt-2 h-[46px] rounded-full bg-cyan-900 px-6 text-sm font-bold text-white"
              >
                {isEs ? "Mostrar todos" : "Show everyone"}
              </button>
            </div>
          )}

          {!isLoading && all.length > 0 && (
            <section className="mt-6 text-center">
              <p className="eyebrow">{isEs ? "Conecta" : "Connect"}</p>
              <h2 className="headline-xl text-foreground mt-3 mb-4" style={{ fontSize: "2.25rem" }}>
                {isEs ? "Tres pasos para la bondad en conjunto" : "Three Steps to Kindness Together"}
              </h2>
              <p className="text-foreground/75 leading-relaxed max-w-xl mx-auto mb-10">
                {isEs
                  ? "Nuestros embajadores están aquí para ayudarte a comprometerte, planificar y multiplicar la bondad donde estás."
                  : "Our ambassadors are here to help you pledge, plan and multiply kindness where you are."}
              </p>
              <div className="grid gap-4 text-left sm:grid-cols-3">
                {[
                  {
                    step: isEs ? "PASO 1" : "STEP 1",
                    title: isEs ? "Encuentra tu país" : "Find your country",
                    body: isEs
                      ? "Busca o filtra para ver quién lidera la bondad cerca de ti."
                      : "Search or filter to see who is leading kindness near you.",
                  },
                  {
                    step: isEs ? "PASO 2" : "STEP 2",
                    title: isEs ? "Saluda" : "Say hello",
                    body: isEs
                      ? "Síguelos o envíales un mensaje a través de los enlaces en su tarjeta."
                      : "Follow them or send a message through the links on their card.",
                  },
                  {
                    step: isEs ? "PASO 3" : "STEP 3",
                    title: isEs ? "Comprométanse juntos" : "Pledge together",
                    body: isEs
                      ? "Únanse para realizar actos de bondad en su escuela, ciudad o trabajo."
                      : "Team up on acts of kindness for your school, city or workplace.",
                  },
                ].map((s) => (
                  <div key={s.step} className="rounded-2xl border border-border bg-white p-6 shadow-sm">
                    <p className="mb-2 text-[11px] font-bold tracking-[0.15em] text-warm-terracotta">{s.step}</p>
                    <h3 className="mb-2 font-display text-xl text-foreground">{s.title}</h3>
                    <p className="text-sm leading-relaxed text-foreground/75">{s.body}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Become an ambassador */}
        <section className="section-padding mx-auto max-w-6xl pb-24 pt-4">
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
                  {isEs ? "SÉ EMBAJADOR" : "BECOME AN AMBASSADOR"}
                </p>
                <h2 className="font-display text-3xl leading-tight md:text-4xl">
                  {isEs
                    ? "Pon tu nombre detrás de la bondad, donde vives."
                    : "Put your name behind kindness, right where you live."}
                </h2>
                <p className="text-base leading-relaxed text-warm-cream/75">
                  {isEs
                    ? "Conviértete en Embajador Global de Bondad y ayúdanos a inspirar mil millones de actos de bondad, comenzando donde vives."
                    : "Become a Global Kindness Ambassador and help inspire 1 billion acts of kindness, starting where you live."}
                </p>
              </div>
              <div className="flex flex-1 flex-col gap-3" style={{ flexBasis: "280px", maxWidth: "320px" }}>
                <a
                  href="/get-involved/ambassadors"
                  className="flex h-14 items-center justify-center rounded-full bg-warm-terracotta text-base font-bold text-white transition-transform duration-200 hover:scale-105"
                >
                  {isEs ? "Sé Embajador Global" : "Become a Global Ambassador"}
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
