import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CalendarPlus, Hand, Heart, ImagePlus, Pin, Search, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { cx, PauseMark, Segmented } from "@/components/bits";
import { useAct, useCommunity, useItems, useKit } from "@/lib/hub";
import { AMBASSADOR, changeSpace, daysUntil, resetSpace, shrinkPhoto, spaceDay, spaceId, useSpace, type BoardEntry, type Lang, type SpaceState, type WallPost } from "@/lib/space";
import { asset } from "@/lib/base";

type Tab = "home" | "wall" | "board" | "dates" | "partners";

const T = {
  en: {
    title: "Community",
    sub: "Where Kindness Forward partners and ambassadors meet each other.",
    preview: "A partner will arrive here already signed in through the partner portal, so there is nothing to log in to today.",
    viewingAs: "Viewing as",
    yourOrg: "Your organisation",
    ambassador: "An ambassador",
    back: "Back to the hub",
    tabs: { home: "Home", wall: "Wall", board: "Asks and offers", dates: "Dates", partners: "Partners" },
    fromTeam: "From the Kindness Forward team",
    pinned: "Pinned",
    kit: "This week's kit",
    kitBody: (n: number) => (n === 1 ? "One post ready to share, with the caption written for you." : `${n} posts ready to share, with the captions written for you.`),
    openKit: "Open the kit",
    together: "Together",
    joined: (n: number) => (n === 1 ? "One partner is in" : `${n} partners are in`),
    countIn: "Count us in",
    youAreIn: "You are in",
    of: "of",
    daysLeft: (n: number) => (n === 1 ? "One day left" : `${n} days left`),
    comingUp: "Coming up",
    everyDate: "See every date",
    wallSub: "What partners are doing, in their own words. Leave a kudos when something moves you.",
    share: "Share something with the other partners",
    sharePlaceholder: "What did your team do? Two or three lines is plenty.",
    addPhoto: "Add a photo",
    removePhoto: "Remove the photo",
    consent: "The people shown have agreed to be shared",
    send: "Send to the wall",
    sent: "Thank you. The team reads each post before the other partners see it.",
    waiting: "Waiting for the team's yes",
    kudos: "Kudos",
    need: "We need",
    offer: "We can offer",
    boardSub: "Ask for a hand, or offer one. When someone raises a hand, the Kindness Forward team introduces you both, so no contact details are shown here.",
    canHelp: "We can help",
    wouldLike: "We would like this",
    handUp: "Hand raised. The team will introduce you.",
    hands: (n: number) => (n === 1 ? "One hand raised" : `${n} hands raised`),
    addNeed: "Add a need",
    addOffer: "Add an offer",
    boardPlaceholder: "Say it in one or two sentences",
    add: "Add it",
    datesSub: "Kindness Forward moments and what partners are planning. Add yours, and the team will see it in time to plan a mention.",
    addDate: "Add your date",
    what: "What is happening",
    when: "When",
    dateSent: "Added. The team can see it too.",
    yours: "Yours",
    dirSub: "Every organisation on the public partner list. Ask for an introduction and the team will connect you.",
    find: "Find a partner",
    everyKind: "Every kind",
    intro: "Ask for an introduction",
    introAsked: "Asked",
    introDone: "The team will introduce you.",
    none: "No partner matches that.",
    wallEmpty: "Nothing here yet. Be the first: tell the other partners what your team did for kindness this week.",
    boardEmpty: "Nothing yet. Add the first one below.",
    reset: "Start the preview again",
  },
  es: {
    title: "Comunidad",
    sub: "Donde los aliados y embajadores de Kindness Forward se encuentran.",
    preview: "Cada aliado llegará aquí con su sesión del portal de aliados ya iniciada, así que hoy no hace falta entrar con contraseña.",
    viewingAs: "Viendo como",
    yourOrg: "Tu organización",
    ambassador: "Embajador o embajadora",
    back: "Volver al hub",
    tabs: { home: "Inicio", wall: "Muro", board: "Pedidos y ofertas", dates: "Fechas", partners: "Aliados" },
    fromTeam: "Del equipo de Kindness Forward",
    pinned: "Fijado",
    kit: "El kit de esta semana",
    kitBody: (n: number) => (n === 1 ? "Una publicación lista para compartir, con el texto ya escrito." : `${n} publicaciones listas para compartir, con los textos ya escritos.`),
    openKit: "Abrir el kit",
    together: "Juntos",
    joined: (n: number) => (n === 1 ? "Un aliado se sumó" : `${n} aliados se sumaron`),
    countIn: "Cuenten con nosotros",
    youAreIn: "Ya estás dentro",
    of: "de",
    daysLeft: (n: number) => (n === 1 ? "Queda un día" : `Quedan ${n} días`),
    comingUp: "Lo que viene",
    everyDate: "Ver todas las fechas",
    wallSub: "Lo que hacen los aliados, en sus propias palabras. Deja un aplauso cuando algo te conmueva.",
    share: "Comparte algo con los demás aliados",
    sharePlaceholder: "¿Qué hizo tu equipo? Con dos o tres líneas basta.",
    addPhoto: "Añadir una foto",
    removePhoto: "Quitar la foto",
    consent: "Las personas que aparecen aceptaron ser compartidas",
    send: "Enviar al muro",
    sent: "Gracias. El equipo lee cada publicación antes de que la vean los demás aliados.",
    waiting: "Esperando el visto bueno del equipo",
    kudos: "Aplausos",
    need: "Necesitamos",
    offer: "Podemos ofrecer",
    boardSub: "Pide una mano u ofrece una. Cuando alguien levanta la mano, el equipo de Kindness Forward los presenta, así que aquí no se muestran datos de contacto.",
    canHelp: "Podemos ayudar",
    wouldLike: "Nos interesa",
    handUp: "Mano levantada. El equipo los va a presentar.",
    hands: (n: number) => (n === 1 ? "Una mano levantada" : `${n} manos levantadas`),
    addNeed: "Añadir un pedido",
    addOffer: "Añadir una oferta",
    boardPlaceholder: "Dilo en una o dos oraciones",
    add: "Añadir",
    datesSub: "Los momentos de Kindness Forward y lo que planifican los aliados. Añade el tuyo y el equipo lo verá a tiempo para mencionarlo.",
    addDate: "Añade tu fecha",
    what: "Qué va a pasar",
    when: "Cuándo",
    dateSent: "Añadida. El equipo también la puede ver.",
    yours: "Tuya",
    dirSub: "Todas las organizaciones de la lista pública de aliados. Pide una presentación y el equipo los conecta.",
    find: "Buscar un aliado",
    everyKind: "Todos los tipos",
    intro: "Pedir una presentación",
    introAsked: "Pedida",
    introDone: "El equipo los va a presentar.",
    none: "Ningún aliado coincide con eso.",
    wallEmpty: "Todavía no hay nada. Sé el primero: cuéntales a los demás aliados qué hizo tu equipo por la bondad esta semana.",
    boardEmpty: "Todavía no hay nada. Añade lo primero aquí abajo.",
    reset: "Empezar la vista previa de nuevo",
  },
} as const;

type Words = (typeof T)[Lang];

const KIND_ES: Record<string, string> = {
  Government: "Municipio",
  Business: "Negocio",
  Nonprofit: "Organización sin fines de lucro",
  Education: "Educación",
  "Media and press": "Medios",
  "Faith and spiritual": "Fe y espiritualidad",
  Ambassador: "Embajador",
  Other: "Otro",
};
const KIND_TONE: Record<string, string> = {
  Government: "bg-sky-soft text-sky-ink",
  Business: "bg-orange-soft text-orange-ink",
  Nonprofit: "bg-rose-soft text-rose-ink",
  Education: "bg-sun-soft text-sun-ink",
  "Media and press": "bg-navy text-white",
  "Faith and spiritual": "bg-sky text-white",
  Ambassador: "bg-orange text-white",
};
const kindLabel = (kind: string, lang: Lang) => (lang === "es" ? (KIND_ES[kind] ?? kind) : kind === "Government" ? "Municipality" : kind);

/** The page a partner or an ambassador opens to meet the others. Stands alone, like the kit page. */
export default function SpacePage() {
  const space = useSpace();
  const { data: community } = useCommunity();
  // /space?tab=wall&lang=es opens straight on a tab, which helps when presenting
  const [lang, setLang] = useState<Lang>(() => (new URLSearchParams(window.location.search).get("lang") === "es" ? "es" : "en"));
  const [tab, setTabState] = useState<Tab>(() => {
    const asked = new URLSearchParams(window.location.search).get("tab") as Tab | null;
    return asked && asked in T.en.tabs ? asked : "home";
  });
  const setTab = (next: Tab) => {
    setTabState(next);
    const url = new URL(window.location.href);
    if (next === "home") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(window.history.state, "", url);
  };
  const t = T[lang];
  const partners = useMemo(() => [...(community?.partners ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [community]);
  const me = space.me || t.yourOrg;
  const myKind = space.me === AMBASSADOR ? "Ambassador" : (partners.find((p) => p.name === space.me)?.category ?? "Other");
  const who = { me, kind: myKind };

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-x-5 gap-y-2 px-5 py-2.5 text-[12.5px] text-ink-muted">
          <span className="rounded bg-sun-soft px-1.5 py-0.5 font-bold text-sun-ink">Preview</span>
          <span className="min-w-0 flex-1 basis-[280px]">{t.preview}</span>
          <label className="flex items-center gap-2 font-semibold">
            {t.viewingAs}
            <select value={space.me} onChange={(e) => changeSpace((s) => void (s.me = e.target.value))} className="max-w-[220px] cursor-pointer truncate rounded-md border border-line bg-white px-2 py-1 font-bold text-ink outline-none">
              <option value="">{t.yourOrg}</option>
              <option value={AMBASSADOR}>{t.ambassador}</option>
              {partners.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <header className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-4 px-5 pt-5">
        <img src={asset("kf-logo.webp")} alt="Kindness Forward" className="h-9 w-auto" />
        <div className="flex items-center gap-3">
          <Link to="/community" className="btn-quiet hidden sm:inline-flex">
            <ArrowLeft size={15} /> {t.back}
          </Link>
          <Segmented
            value={lang}
            onChange={setLang}
            options={
              [
                ["en", "English"],
                ["es", "Español"],
              ] as const
            }
          />
        </div>
      </header>

      <main className="mx-auto max-w-[1120px] px-5 pb-24">
        <section className="pb-7 pt-8">
          <p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-muted">
            <PauseMark className="h-3.5" /> {me}
          </p>
          <h1 className="mt-2 text-[34px] font-extrabold leading-[1.08] tracking-[-0.03em] sm:text-[44px]">{t.title}</h1>
          <p className="mt-2 max-w-[620px] text-[16px] leading-relaxed text-ink-muted">{t.sub}</p>
        </section>

        <nav className="scroll-x sticky top-0 z-10 -mx-5 flex gap-1 overflow-x-auto border-b border-line bg-white/95 px-5 backdrop-blur">
          {(Object.keys(t.tabs) as Tab[]).map((k) => (
            <button key={k} type="button" onClick={() => setTab(k)} aria-pressed={tab === k} className={cx("-mb-px shrink-0 whitespace-nowrap border-b-[3px] px-3 py-3 text-[14.5px] transition", tab === k ? "border-orange font-bold text-navy" : "border-transparent font-semibold text-ink-muted hover:text-navy")}>
              {t.tabs[k]}
            </button>
          ))}
        </nav>

        <div className="pt-9">
          {tab === "home" && <Home space={space} lang={lang} t={t} who={who} go={setTab} />}
          {tab === "wall" && <Wall space={space} lang={lang} t={t} who={who} />}
          {tab === "board" && <Board space={space} lang={lang} t={t} who={who} />}
          {tab === "dates" && <Dates space={space} lang={lang} t={t} who={who} />}
          {tab === "partners" && <Directory space={space} lang={lang} t={t} who={who} />}
        </div>

        <p className="mt-16 border-t border-line pt-5 text-[12.5px] text-ink-faint">
          #PassKindnessForward
          <button
            type="button"
            className="ml-4 font-semibold underline-offset-2 hover:underline"
            onClick={() => {
              resetSpace();
              toast.success(t.reset);
            }}
          >
            {t.reset}
          </button>
        </p>
      </main>
    </div>
  );
}

interface TabProps {
  space: SpaceState;
  lang: Lang;
  t: Words;
  who: { me: string; kind: string };
}

function Photo({ src, className }: { src: string; className?: string }) {
  const [gone, setGone] = useState(false);
  if (gone) return null;
  return <img src={src} alt="" loading="lazy" onError={() => setGone(true)} className={cx("bg-paper object-cover", className)} />;
}

/* ---------------- home ---------------- */

function Home({ space, lang, t, who, go }: TabProps & { go: (tab: Tab) => void }) {
  const { data: kit } = useKit();
  const { data: items = [] } = useItems();
  const ready = items.filter((i) => i.inKit && ["approved", "scheduled", "posted"].includes(i.stage)).length;
  const c = space.challenge;
  const inIt = c.joined.includes(who.me);
  const left = daysUntil(c.ends);
  const soon = space.dates.filter((d) => daysUntil(d.date) >= 0).slice(0, 4);
  const notices = [...space.notices].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.at.localeCompare(a.at));

  return (
    <div className="grid gap-x-14 gap-y-12 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="min-w-0">
        <h2 className="eyebrow">{t.fromTeam}</h2>
        <ul className="mt-3 border-t border-line">
          {notices.map((n) => (
            <li key={n.id} className="grid gap-x-6 gap-y-3 border-b border-line py-6 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-faint">
                  {spaceDay(n.at, lang)}
                  {n.pinned && (
                    <span className="inline-flex items-center gap-1 font-semibold text-orange-ink">
                      <Pin size={12} /> {t.pinned}
                    </span>
                  )}
                </p>
                <h3 className="mt-1.5 text-[20px] font-extrabold leading-snug tracking-[-0.02em]">{lang === "es" ? n.titleEs || n.titleEn : n.titleEn}</h3>
                <p className="mt-2 max-w-[620px] text-[15px] leading-relaxed text-ink-muted">{lang === "es" ? n.bodyEs || n.bodyEn : n.bodyEn}</p>
              </div>
              {n.image && <Photo src={n.image} className="h-[120px] w-full rounded-xl sm:w-[180px]" />}
            </li>
          ))}
        </ul>
      </section>

      <aside className="space-y-9">
        <section className="rounded-xl bg-navy px-6 py-6 text-white">
          <p className="flex items-center gap-2 text-[12.5px] font-semibold text-white/75">
            <PauseMark className="h-3.5" tone="white" /> {t.kit}
          </p>
          {kit && <p className="mt-3 text-[18px] font-bold leading-snug">{lang === "es" ? kit.askEs : kit.askEn}</p>}
          <p className="mt-3 text-[13.5px] leading-relaxed text-white/80">{t.kitBody(ready)}</p>
          <Link to="/kit" className="btn mt-4 bg-white text-navy hover:bg-sun-soft">
            {t.openKit}
          </Link>
        </section>

        <section>
          <h2 className="flex items-center gap-2">
            <span className="eyebrow">{t.together}</span>
          </h2>
          <p className="mt-2 text-[18px] font-extrabold leading-snug tracking-[-0.02em]">{lang === "es" ? c.titleEs : c.titleEn}</p>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">{lang === "es" ? c.bodyEs : c.bodyEn}</p>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-paper">
            <div className="h-full rounded-full bg-orange" style={{ width: `${Math.min(100, (c.done / c.goal) * 100)}%` }} />
          </div>
          <p className="mt-2 flex flex-wrap justify-between gap-x-4 text-[13px] text-ink-muted">
            <span>
              <span className="font-bold tabular-nums text-ink">{c.done}</span> {t.of} {c.goal}
            </span>
            <span>{left > 0 ? t.daysLeft(left) : ""}</span>
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={inIt ? "btn-ghost" : "btn-accent"}
              disabled={inIt}
              onClick={() =>
                changeSpace((s) => {
                  if (!s.challenge.joined.includes(who.me)) s.challenge.joined.push(who.me);
                })
              }
            >
              {inIt ? t.youAreIn : t.countIn}
            </button>
            <span className="text-[13px] text-ink-muted">{t.joined(c.joined.length)}</span>
          </div>
        </section>

        <section>
          <h2 className="eyebrow">{t.comingUp}</h2>
          <ul className="mt-2 border-t border-line">
            {soon.map((d) => (
              <li key={d.id} className="flex items-baseline gap-3 border-b border-line py-2.5 text-[14px]">
                <span className="w-[58px] shrink-0 font-bold tabular-nums">{spaceDay(d.date, lang)}</span>
                <span className="min-w-0">
                  <span className="font-semibold">{d.label}</span>
                  {d.org && <span className="block text-[12.5px] text-ink-faint">{d.org}</span>}
                </span>
              </li>
            ))}
          </ul>
          <button type="button" className="mt-3 text-[13.5px] font-semibold text-sky-ink hover:underline" onClick={() => go("dates")}>
            {t.everyDate}
          </button>
        </section>
      </aside>
    </div>
  );
}

/* ---------------- wall ---------------- */

function Wall({ space, lang, t, who }: TabProps) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<string>();
  const [consent, setConsent] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const posts = space.wall.filter((p) => p.status === "live" || (p.status === "waiting" && p.org === who.me)).sort((a, b) => Number(b.status === "waiting") - Number(a.status === "waiting") || b.at.localeCompare(a.at));

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    changeSpace((s) => {
      s.wall.unshift({ id: spaceId("w"), at: new Date().toISOString(), org: who.me, kind: who.kind, text: text.trim(), image, consent, status: "waiting", kudos: 0, kudosBy: [] });
    });
    setText("");
    setImage(undefined);
    setConsent(false);
    toast.success(t.sent);
  };

  return (
    <div className="grid gap-x-14 gap-y-10 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="min-w-0 lg:order-1">
        <p className="max-w-[560px] text-[15px] leading-relaxed text-ink-muted">{t.wallSub}</p>
        {posts.length === 0 && <p className="mt-5 rounded-xl bg-paper px-5 py-4 text-[15px] text-ink-muted">{t.wallEmpty}</p>}
        <ul className="mt-5 space-y-5">
          {posts.map((p) => (
            <WallCard key={p.id} post={p} lang={lang} t={t} me={who.me} />
          ))}
        </ul>
      </section>

      <aside className="lg:order-2">
        <form onSubmit={send} className="rounded-xl border border-line p-5 lg:sticky lg:top-16">
          <label htmlFor="wall-text" className="block text-[16px] font-extrabold leading-snug tracking-[-0.01em]">
            {t.share}
          </label>
          <textarea id="wall-text" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder={t.sharePlaceholder} className="field mt-3 resize-y leading-relaxed" />
          {image && (
            <div className="relative mt-3">
              <img src={image} alt="" className="max-h-[200px] w-full rounded-lg object-cover" />
              <button type="button" aria-label={t.removePhoto} title={t.removePhoto} onClick={() => setImage(undefined)} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-navy shadow-pop">
                <X size={15} />
              </button>
            </div>
          )}
          <input
            ref={file}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) setImage(await shrinkPhoto(f));
            }}
          />
          <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-[13.5px]">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#0e234b]" />
            <span className={cx(consent ? "font-semibold" : "text-ink-muted")}>{t.consent}</span>
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="submit" className="btn-primary" disabled={!text.trim()}>
              {t.send}
            </button>
            {!image && (
              <button type="button" className="btn-ghost" onClick={() => file.current?.click()}>
                <ImagePlus size={15} /> {t.addPhoto}
              </button>
            )}
          </div>
        </form>
      </aside>
    </div>
  );
}

function WallCard({ post, lang, t, me }: { post: WallPost; lang: Lang; t: Words; me: string }) {
  const mine = post.kudosBy.includes(me);
  return (
    <li className="overflow-hidden rounded-xl border border-line">
      {post.image && <Photo src={post.image} className="aspect-[16/9] w-full object-[50%_35%]" />}
      <div className="px-5 py-4">
        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] text-ink-muted">
          <span className={cx("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px] font-extrabold", KIND_TONE[post.kind] ?? "bg-paper text-ink")} aria-hidden>
            {post.org.replace(/^(an?|una?|el|la)\s+/i, "").slice(0, 1).toUpperCase()}
          </span>
          <span className="text-[14px] font-bold text-ink">{post.org}</span>
          <span className="rounded bg-paper px-1.5 py-px font-semibold">{kindLabel(post.kind, lang)}</span>
          <span className="text-ink-faint">{spaceDay(post.at, lang)}</span>
        </p>
        <p className="mt-2.5 whitespace-pre-line text-[15.5px] leading-relaxed">{post.text}</p>
        {post.status === "waiting" ? (
          <p className="mt-3 flex items-center gap-1.5 text-[13px] font-semibold text-sun-ink">
            <ShieldCheck size={14} /> {t.waiting}
          </p>
        ) : (
          <button
            type="button"
            aria-pressed={mine}
            onClick={() =>
              changeSpace((s) => {
                const p = s.wall.find((w) => w.id === post.id);
                if (!p) return;
                if (p.kudosBy.includes(me)) {
                  p.kudosBy = p.kudosBy.filter((k) => k !== me);
                  p.kudos -= 1;
                } else {
                  p.kudosBy.push(me);
                  p.kudos += 1;
                }
              })
            }
            className={cx("mt-3 inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition", mine ? "border-rose bg-rose-soft text-rose-ink" : "border-line text-ink-muted hover:border-rose/40 hover:text-rose-ink")}
          >
            <Heart size={14} fill={mine ? "currentColor" : "none"} /> {t.kudos} <span className="tabular-nums">{post.kudos}</span>
          </button>
        )}
      </div>
    </li>
  );
}

/* ---------------- asks and offers ---------------- */

function Board({ space, lang, t, who }: TabProps) {
  return (
    <>
      <p className="max-w-[640px] text-[15px] leading-relaxed text-ink-muted">{t.boardSub}</p>
      <div className="mt-7 grid gap-x-12 gap-y-12 md:grid-cols-2">
        <BoardCol side="need" entries={space.board} lang={lang} t={t} who={who} />
        <BoardCol side="offer" entries={space.board} lang={lang} t={t} who={who} />
      </div>
    </>
  );
}

function BoardCol({ side, entries, lang, t, who }: { side: BoardEntry["side"]; entries: BoardEntry[]; lang: Lang; t: Words; who: TabProps["who"] }) {
  const [text, setText] = useState("");
  const list = entries.filter((e) => e.side === side).sort((a, b) => b.at.localeCompare(a.at));
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    changeSpace((s) => {
      s.board.unshift({ id: spaceId("b"), at: new Date().toISOString(), org: who.me, side, text: text.trim(), hands: [] });
    });
    setText("");
  };
  return (
    <section>
      <h2 className="flex items-center gap-2.5 text-[22px] font-extrabold tracking-[-0.02em]">
        <span className={cx("h-5 w-[5px] rounded-full", side === "need" ? "bg-orange" : "bg-sky")} />
        {side === "need" ? t.need : t.offer}
      </h2>
      {list.length === 0 && <p className="mt-4 text-[14px] text-ink-muted">{t.boardEmpty}</p>}
      <ul className="mt-4 border-t border-line">
        {list.map((e) => {
          const up = e.hands.includes(who.me);
          const own = e.org === who.me;
          return (
            <li key={e.id} className="border-b border-line py-4">
              <p className="text-[15px] leading-relaxed">{e.text}</p>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] text-ink-muted">
                <span className="font-bold text-ink">{e.org}</span>
                <span className="text-ink-faint">{spaceDay(e.at, lang)}</span>
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {!own && (
                  <button
                    type="button"
                    disabled={up}
                    className={up ? "btn-ghost h-8 text-[13px]" : "btn-primary h-8 text-[13px]"}
                    onClick={() => {
                      changeSpace((s) => {
                        const b = s.board.find((x) => x.id === e.id);
                        if (b && !b.hands.includes(who.me)) b.hands.push(who.me);
                      });
                      toast.success(t.handUp);
                    }}
                  >
                    <Hand size={14} /> {side === "need" ? t.canHelp : t.wouldLike}
                  </button>
                )}
                {e.hands.length > 0 && <span className="text-[13px] text-ink-muted">{t.hands(e.hands.length)}</span>}
              </div>
            </li>
          );
        })}
      </ul>
      <form onSubmit={add} className="mt-4 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t.boardPlaceholder} aria-label={side === "need" ? t.addNeed : t.addOffer} className="field" />
        <button type="submit" className="btn-ghost shrink-0" disabled={!text.trim()}>
          {side === "need" ? t.addNeed : t.addOffer}
        </button>
      </form>
    </section>
  );
}

/* ---------------- dates ---------------- */

function Dates({ space, lang, t, who }: TabProps) {
  const act = useAct();
  const [label, setLabel] = useState("");
  const [date, setDate] = useState("");
  const list = [...space.dates].filter((d) => daysUntil(d.date) >= 0).sort((a, b) => a.date.localeCompare(b.date));

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !date) return;
    changeSpace((s) => {
      s.dates.push({ id: spaceId("d"), date, label: label.trim(), org: who.me });
    });
    // it also lands in the team's inbox, next to everything else partners send
    await act((s) => s.addSuggestion({ from: who.me, text: `${label.trim()}, on ${date}. Added from the community space.`, group: who.kind === "Ambassador" ? "ambassador" : "partner", kind: "date" }));
    setLabel("");
    setDate("");
    toast.success(t.dateSent);
  };

  return (
    <div className="grid gap-x-14 gap-y-10 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="min-w-0">
        <p className="max-w-[560px] text-[15px] leading-relaxed text-ink-muted">{t.datesSub}</p>
        <ul className="mt-5 border-t border-line">
          {list.map((d) => (
            <li key={d.id} className="grid grid-cols-[76px_minmax(0,1fr)] gap-x-4 border-b border-line py-4">
              <span className="text-[17px] font-extrabold tabular-nums tracking-[-0.01em]">{spaceDay(d.date, lang)}</span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-[15.5px] font-bold">
                  {d.label}
                  {d.org === who.me && <span className="rounded bg-sky-soft px-1.5 py-px text-[11px] font-bold text-sky-ink">{t.yours}</span>}
                </p>
                <p className="mt-0.5 text-[13px] text-ink-muted">{d.org ?? "Kindness Forward"}</p>
                {d.note && <p className="mt-1 text-[13.5px] leading-relaxed text-ink-muted">{d.note}</p>}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <aside>
        <form onSubmit={add} className="space-y-4 rounded-xl border border-line p-5 lg:sticky lg:top-16">
          <h2 className="flex items-center gap-2 text-[16px] font-extrabold tracking-[-0.01em]">
            <CalendarPlus size={17} /> {t.addDate}
          </h2>
          <div>
            <label className="label" htmlFor="date-what">
              {t.what}
            </label>
            <input id="date-what" value={label} onChange={(e) => setLabel(e.target.value)} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="date-when">
              {t.when}
            </label>
            <input id="date-when" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field" />
          </div>
          <button type="submit" className="btn-primary" disabled={!label.trim() || !date}>
            {t.add}
          </button>
        </form>
      </aside>
    </div>
  );
}

/* ---------------- partners ---------------- */

function Directory({ space, lang, t, who }: TabProps) {
  const { data: community } = useCommunity();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");
  const kinds = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of community?.partners ?? []) m.set(p.category, (m.get(p.category) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [community]);
  if (!community) return null;
  const shown = community.partners.filter((p) => (kind === "all" || p.category === kind) && p.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <>
      <p className="max-w-[600px] text-[15px] leading-relaxed text-ink-muted">{t.dirSub}</p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label className="relative min-w-[220px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.find} aria-label={t.find} className="field pl-9" />
        </label>
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="field w-auto pr-8" aria-label={t.everyKind}>
          <option value="all">
            {t.everyKind} ({community.partners.length})
          </option>
          {kinds.map(([k, n]) => (
            <option key={k} value={k}>
              {kindLabel(k, lang)} ({n})
            </option>
          ))}
        </select>
      </div>
      <ul className="mt-5 grid border-t border-line md:grid-cols-2 md:gap-x-10">
        {shown.map((p) => {
          const asked = space.hellos.some((h) => h.from === who.me && h.to === p.name);
          return (
            <li key={p.name} className="flex items-center justify-between gap-3 border-b border-line py-2.5">
              <span className="min-w-0">
                <span className="block truncate text-[14.5px] font-semibold">{p.name}</span>
                <span className="block text-[12.5px] text-ink-faint">{kindLabel(p.category, lang)}</span>
              </span>
              {p.name !== who.me && (
                <button
                  type="button"
                  disabled={asked}
                  className="btn-quiet h-8 shrink-0 text-[13px]"
                  onClick={() => {
                    changeSpace((s) => {
                      s.hellos.unshift({ id: spaceId("h"), at: new Date().toISOString(), from: who.me, to: p.name });
                    });
                    toast.success(t.introDone);
                  }}
                >
                  {asked ? t.introAsked : t.intro}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {shown.length === 0 && <p className="py-6 text-[14px] text-ink-muted">{t.none}</p>}
    </>
  );
}
