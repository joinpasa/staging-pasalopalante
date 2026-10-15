import { useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SEO from "@/components/SEO";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { Skeleton } from "@shared/components/ui/skeleton";
import { ExternalLink, Facebook, Globe, Instagram, Megaphone, Search } from "lucide-react";
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
    <article className="flex flex-col items-center rounded-2xl border border-border bg-white/70 px-5 pb-5 pt-7 text-center">
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
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-primary">{title}</p>
      <h3 className="mb-1 font-display text-xl text-foreground">{entry.name}</h3>
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
          aria-label={`${entry.name}'s profile`}
          className="mt-4 flex h-11 w-11 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-primary hover:text-primary"
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
      <main className="pt-32 pb-20 section-padding">
        <article className="max-w-5xl mx-auto">
          <header className="mb-10 text-center">
            <p className="eyebrow">{isEs ? "Embajadores" : "Ambassadors"}</p>
            <h1 className="headline-xl text-foreground mt-3 mb-4">
              {isEs ? "Embajadores Globales de Bondad" : "Global Kindness Ambassadors"}
            </h1>
            <p className="text-base md:text-lg text-foreground/75 leading-relaxed max-w-2xl mx-auto">
              {isEs
                ? "Encuentra al embajador que lidera la bondad en tu país, conecta con ellos y planifiquen juntos actos de bondad durante esta Temporada de Bondad Global."
                : "Find the ambassador leading kindness in your country, connect with them, and plan acts of kindness together this Global Kindness Season."}
            </p>
            {!isLoading && all.length > 0 && (
              <div className="mt-7 flex flex-wrap justify-center gap-x-10 gap-y-2">
                <p className="text-sm text-foreground/75">
                  <strong className="font-display text-3xl text-foreground">{all.length}</strong>{" "}
                  {isEs ? "embajadores" : "ambassadors"}
                </p>
                <p className="text-sm text-foreground/75">
                  <strong className="font-display text-3xl text-foreground">{countries.length}</strong>{" "}
                  {isEs ? "países" : "countries"}
                </p>
              </div>
            )}
          </header>

          <div
            className="mb-10 flex items-center gap-4 rounded-2xl border border-border bg-white py-5 pl-6 pr-6"
            style={{ borderLeft: "4px solid #0e234b" }}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-warm-sand">
              <Megaphone size={22} className="text-cyan-900" />
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
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-60 rounded-2xl" />
              ))}
            </div>
          ) : all.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-white/50 px-6 py-14 text-center">
              <h3 className="mb-2.5 font-display text-2xl text-foreground">
                {isEs ? "Aún no hay embajadores aquí" : "No ambassador here yet"}
              </h3>
              <p className="mx-auto mb-6 max-w-md text-foreground/75 leading-relaxed">
                {isEs
                  ? "Tu país o ciudad podría ser el próximo. Sé el primer Embajador Global de Bondad y lidera el movimiento donde vives."
                  : "Your country or city could be next. Be the first Global Kindness Ambassador and lead the movement where you live."}
              </p>
              <a
                href="/get-involved/ambassadors"
                className="inline-flex items-center justify-center rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground transition-transform duration-200 hover:scale-105"
              >
                {isEs ? "Sé el primer embajador" : "Become the first ambassador"}
              </a>
            </div>
          ) : (
            <>
              <div className="mx-auto mb-6 flex max-w-2xl flex-wrap justify-center gap-3">
                <div className="relative min-w-[220px] flex-[999_1_320px]">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40"
                  />
                  <label htmlFor="ambassador-search" className="sr-only">
                    {isEs ? "Buscar embajadores" : "Search ambassadors"}
                  </label>
                  <input
                    id="ambassador-search"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={isEs ? "Buscar por nombre, país o ciudad" : "Search by name, country or city"}
                    className="h-12 w-full rounded-full border border-border bg-white px-5 pl-10 text-sm text-foreground outline-none focus:border-primary"
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
                    className="h-12 w-full rounded-full border border-border bg-white px-4 text-sm text-foreground outline-none focus:border-primary"
                  >
                    <option value="">{isEs ? "Todos los países" : "All countries"}</option>
                    {countries.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {categories.length > 1 && (
                <div role="group" aria-label={isEs ? "Filtrar por categoría" : "Filter by category"} className="mb-10 flex flex-wrap justify-center gap-2">
                  {["All", ...categories].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      aria-pressed={category === c}
                      className={`min-h-11 rounded-full border px-5 text-sm font-medium transition-colors ${
                        category === c
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-white text-foreground hover:border-primary"
                      }`}
                    >
                      {c === "All" ? (isEs ? "Todos" : "All") : c}
                    </button>
                  ))}
                </div>
              )}

              {shown.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {shown.map((a, i) => (
                    <DirectoryCard key={a.id} entry={a} tint={TINTS[i % TINTS.length]} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-white/50 px-6 py-14 text-center">
                  <h3 className="mb-2.5 font-display text-2xl text-foreground">
                    {isEs ? "Nadie coincide con tu búsqueda" : "No one matches your search"}
                  </h3>
                  <p className="text-foreground/75">
                    {isEs ? "Prueba con otro país, categoría o término de búsqueda." : "Try a different country, category or search term."}
                  </p>
                </div>
              )}
            </>
          )}

          <section className="mt-16 text-center">
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
                <div key={s.step} className="rounded-2xl border border-border bg-white/70 p-6">
                  <p className="mb-2 text-[11px] font-bold tracking-[0.15em] text-primary">{s.step}</p>
                  <h3 className="mb-2 font-display text-xl text-foreground">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-foreground/75">{s.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-16 text-center bg-warm-earth text-warm-cream rounded-2xl p-10">
            <h2 className="font-display text-2xl md:text-3xl mb-3">
              {isEs ? "Sé parte del movimiento de bondad más grande" : "Be part of the biggest kindness movement"}
            </h2>
            <p className="text-warm-cream/85 leading-relaxed max-w-2xl mx-auto mb-6">
              {isEs
                ? "Conviértete en Embajador Global de Bondad y ayúdanos a inspirar mil millones de actos de bondad, comenzando donde vives."
                : "Become a Global Kindness Ambassador and help inspire 1 billion acts of kindness, starting where you live."}
            </p>
            <a
              href="/get-involved/ambassadors"
              className="inline-flex items-center justify-center rounded-full bg-warm-cream px-8 py-3 text-sm font-semibold text-warm-earth transition-transform duration-200 hover:scale-105"
            >
              {isEs ? "Sé Embajador Global" : "Become a Global Ambassador"}
            </a>
          </section>
        </article>
      </main>
      <Footer />
    </div>
  );
}
