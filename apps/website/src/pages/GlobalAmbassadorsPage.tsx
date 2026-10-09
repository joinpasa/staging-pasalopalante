import { useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SEO from "@/components/SEO";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { Skeleton } from "@shared/components/ui/skeleton";
import { Facebook, ExternalLink, Globe, Instagram, Link2, Search } from "lucide-react";
import { useAmbassadors, type Ambassador } from "@/hooks/useAmbassadors";

const TINTS = ["bg-warm-sand", "bg-[#e2f1ea]", "bg-[#eee6f3]", "bg-[#e2eff8]", "bg-[#fdf0d9]"];

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function AmbassadorCard({ ambassador, tint }: { ambassador: Ambassador; tint: string }) {
  const place = ambassador.region ? `${ambassador.region}, ${ambassador.country}` : ambassador.country;
  const socials = [
    ambassador.instagram && { href: ambassador.instagram, label: "Instagram", Icon: Instagram },
    ambassador.facebook && { href: ambassador.facebook, label: "Facebook", Icon: Facebook },
    ambassador.tiktok && { href: ambassador.tiktok, label: "TikTok", Icon: Link2 },
    ambassador.website && { href: ambassador.website, label: "website", Icon: Globe },
    ambassador.otherSocial && { href: ambassador.otherSocial, label: "more links", Icon: ExternalLink },
  ].filter(Boolean) as { href: string; label: string; Icon: typeof Instagram }[];

  return (
    <article className="flex flex-col items-center rounded-2xl border border-border bg-white/70 px-5 pb-5 pt-7 text-center">
      {ambassador.photoUrl ? (
        <img
          src={ambassador.photoUrl}
          alt=""
          loading="lazy"
          className="mb-4 h-[104px] w-[104px] rounded-full object-cover"
        />
      ) : (
        <div
          className={`mb-4 flex h-[104px] w-[104px] items-center justify-center rounded-full font-display text-3xl text-foreground ${tint}`}
          aria-hidden="true"
        >
          {initials(ambassador.name)}
        </div>
      )}
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-primary">{ambassador.role}</p>
      <h3 className="mb-1 font-display text-xl text-foreground">{ambassador.name}</h3>
      <p className="text-sm text-foreground/70">{place}</p>

      {socials.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {socials.map(({ href, label, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${ambassador.name} on ${label}`}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Icon size={17} strokeWidth={1.8} />
            </a>
          ))}
        </div>
      )}

      {ambassador.badgeUrl && (
        <a
          href={ambassador.badgeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 w-full rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          View badge
        </a>
      )}
    </article>
  );
}

export default function GlobalAmbassadorsPage() {
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const { data: ambassadors, isLoading } = useAmbassadors();
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [role, setRole] = useState("All");

  const all = ambassadors ?? [];
  const countries = useMemo(() => Array.from(new Set(all.map((a) => a.country))).sort(), [all]);
  const roles = useMemo(() => Array.from(new Set(all.map((a) => a.role))).sort(), [all]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((a) => {
      if (country && a.country !== country) return false;
      if (role !== "All" && a.role !== role) return false;
      if (q && !`${a.name} ${a.region ?? ""} ${a.country}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [all, query, country, role]);

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

              {roles.length > 1 && (
                <div role="group" aria-label={isEs ? "Filtrar por rol" : "Filter by role"} className="mb-10 flex flex-wrap justify-center gap-2">
                  {["All", ...roles].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      aria-pressed={role === r}
                      className={`min-h-11 rounded-full border px-5 text-sm font-medium transition-colors ${
                        role === r
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-white text-foreground hover:border-primary"
                      }`}
                    >
                      {r === "All" ? (isEs ? "Todos" : "All") : r}
                    </button>
                  ))}
                </div>
              )}

              {shown.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {shown.map((a) => (
                    <AmbassadorCard key={a.id} ambassador={a} tint={TINTS[shown.indexOf(a) % TINTS.length]} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-white/50 px-6 py-14 text-center">
                  <h3 className="mb-2.5 font-display text-2xl text-foreground">
                    {isEs ? "Nadie coincide con tu búsqueda" : "No one matches your search"}
                  </h3>
                  <p className="text-foreground/75">
                    {isEs ? "Prueba con otro país, rol o término de búsqueda." : "Try a different country, role or search term."}
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
