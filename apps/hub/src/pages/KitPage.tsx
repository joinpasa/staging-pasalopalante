import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cx, PauseMark, Segmented } from "@/components/bits";
import { useAct, useItems, useKit } from "@/lib/hub";
import { longDate } from "@/lib/time";
import type { Item } from "@/lib/types";
import { asset } from "@/lib/base";

type Lang = "en" | "es";

const T = {
  en: {
    eyebrow: "Kindness kit, week of",
    title: "This week's posts, ready to share",
    ask: "This week's ask",
    copy: "Copy the caption",
    copied: "Caption copied",
    open: "Open the file",
    shared: "I shared it",
    thanks: "Thank you. The team can see you shared.",
    none: "This week's posts are on their way. Please check back soon.",
    storyTitle: "Send us your story",
    storyBody: "A moment of kindness you saw, an event you are planning, or an idea for a post. The team reads every one.",
    iam: "I am",
    partner: "A partner",
    ambassador: "An ambassador",
    name: "Your name or organisation",
    what: "What is it",
    story: "A story",
    date: "A date or event",
    idea: "An idea",
    text: "Tell us in a few lines",
    link: "A link to a photo or video, if you have one",
    consent: "The people shown have agreed to be shared",
    send: "Send it to the team",
    sent: "Thank you. It is with the team.",
    again: "Send another",
  },
  es: {
    eyebrow: "Kit de bondad, semana del",
    title: "Las publicaciones de esta semana, listas para compartir",
    ask: "La invitación de esta semana",
    copy: "Copiar el texto",
    copied: "Texto copiado",
    open: "Abrir el archivo",
    shared: "Ya lo compartí",
    thanks: "Gracias. El equipo puede ver que lo compartiste.",
    none: "Las publicaciones de esta semana están en camino. Vuelve pronto.",
    storyTitle: "Cuéntanos tu historia",
    storyBody: "Un momento de bondad que viste, un evento que estás organizando o una idea para una publicación. El equipo las lee todas.",
    iam: "Soy",
    partner: "Una organización aliada",
    ambassador: "Embajador o embajadora",
    name: "Tu nombre u organización",
    what: "Qué es",
    story: "Una historia",
    date: "Una fecha o evento",
    idea: "Una idea",
    text: "Cuéntanos en pocas líneas",
    link: "Un enlace a una foto o video, si lo tienes",
    consent: "Las personas que aparecen aceptaron ser compartidas",
    send: "Enviar al equipo",
    sent: "Gracias. Ya está con el equipo.",
    again: "Enviar otra",
  },
} as const;

/** The page a partner or an ambassador opens: this week's posts to share, and a way to write back. */
export default function KitPage() {
  const act = useAct();
  const { data: kit } = useKit();
  const { data: items = [] } = useItems();
  const [lang, setLang] = useState<Lang>("en");
  const [shared, setShared] = useState(false);
  const t = T[lang];
  const posts = items.filter((i) => i.inKit && ["approved", "scheduled", "posted"].includes(i.stage));
  if (!kit) return null;

  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-[1040px] items-center justify-between gap-4 px-5 py-5">
        <img src={asset("kf-logo.webp")} alt="Kindness Forward" className="h-9 w-auto" />
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
      </header>

      <main className="mx-auto max-w-[1040px] px-5 pb-20">
        <section className="border-b border-line pb-9 pt-6">
          <p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-muted">
            <PauseMark className="h-3.5" /> {t.eyebrow} {longDate(kit.weekStart)}
          </p>
          <h1 className="mt-3 max-w-[720px] text-[32px] font-extrabold leading-[1.08] tracking-[-0.03em] sm:text-[42px]">{t.title}</h1>
          <div className="mt-7 max-w-[640px] border-l-[3px] border-sun pl-4">
            <p className="text-[12.5px] font-semibold text-ink-muted">{t.ask}</p>
            <p className="mt-1 text-[18px] font-semibold leading-snug">{lang === "en" ? kit.askEn : kit.askEs}</p>
          </div>
        </section>

        {posts.length === 0 ? (
          <p className="py-12 text-[15px] text-ink-muted">{t.none}</p>
        ) : (
          <ul className="grid gap-x-8 gap-y-10 py-10 sm:grid-cols-2">
            {posts.map((p) => (
              <KitPost key={p.id} item={p} lang={lang} />
            ))}
          </ul>
        )}

        <section className="flex flex-wrap items-center gap-4 border-y border-line py-6">
          {shared ? (
            <p className="flex items-center gap-2 text-[15px] font-semibold">
              <Check size={18} strokeWidth={2.6} className="text-[#2f9e6e]" /> {t.thanks}
            </p>
          ) : (
            <button
              type="button"
              className="btn-accent h-11 px-5 text-[15px]"
              onClick={async () => {
                await act((s) => s.markShared());
                setShared(true);
              }}
            >
              <Check size={17} strokeWidth={2.6} /> {t.shared}
            </button>
          )}
          <p className="text-[14px] text-ink-muted">#PassKindnessForward</p>
        </section>

        <StoryForm lang={lang} />
      </main>
    </div>
  );
}

function KitPost({ item, lang }: { item: Item; lang: Lang }) {
  const t = T[lang];
  const media = item.assets.find((a) => a.kind === "media");
  const cover = item.assets.find((a) => a.kind === "cover");
  const caption = (lang === "es" && item.captionEs.trim()) || item.captionEn;
  return (
    <li>
      <div className="overflow-hidden rounded-xl border border-line bg-paper">
        {media?.mime.startsWith("video/") ? <video src={media.url} poster={cover?.url} controls playsInline preload="metadata" className="aspect-[4/5] w-full object-contain" /> : media ? <img src={media.url} alt="" className="aspect-[4/5] w-full object-contain" /> : null}
      </div>
      <h2 className="mt-4 text-[17px] font-bold leading-snug tracking-[-0.01em]">{item.title}</h2>
      {caption && <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-ink-muted">{caption}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {caption && (
          <button
            type="button"
            className="btn-primary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(caption);
                toast.success(t.copied);
              } catch {
                toast(caption);
              }
            }}
          >
            <Copy size={15} /> {t.copy}
          </button>
        )}
        {media && (
          <a href={media.url} target="_blank" rel="noreferrer" className="btn-ghost">
            {t.open} <ExternalLink size={14} />
          </a>
        )}
      </div>
    </li>
  );
}

function StoryForm({ lang }: { lang: Lang }) {
  const t = T[lang];
  const act = useAct();
  const [group, setGroup] = useState<"partner" | "ambassador">("ambassador");
  const [kind, setKind] = useState<"story" | "date" | "idea">("story");
  const [from, setFrom] = useState("");
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const res = await act((s) => s.addSuggestion({ from, text, link, group, kind, consent: kind === "story" ? consent : undefined }));
    if (res) setSent(true);
  };

  return (
    <section className="grid gap-x-12 gap-y-6 pt-12 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div>
        <h2 className="text-[24px] font-extrabold leading-tight tracking-[-0.02em]">{t.storyTitle}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{t.storyBody}</p>
      </div>
      {sent ? (
        <div className="rounded-xl bg-paper px-6 py-8">
          <PauseMark className="mb-4 h-7" />
          <p className="text-[18px] font-bold">{t.sent}</p>
          <button
            type="button"
            className="btn-ghost mt-4"
            onClick={() => {
              setSent(false);
              setText("");
              setLink("");
              setConsent(false);
            }}
          >
            {t.again}
          </button>
        </div>
      ) : (
        <form onSubmit={send} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="kit-iam">
                {t.iam}
              </label>
              <select id="kit-iam" value={group} onChange={(e) => setGroup(e.target.value as typeof group)} className="field">
                <option value="ambassador">{t.ambassador}</option>
                <option value="partner">{t.partner}</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="kit-kind">
                {t.what}
              </label>
              <select id="kit-kind" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className="field">
                <option value="story">{t.story}</option>
                <option value="date">{t.date}</option>
                <option value="idea">{t.idea}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="kit-name">
              {t.name}
            </label>
            <input id="kit-name" value={from} onChange={(e) => setFrom(e.target.value)} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="kit-text">
              {t.text}
            </label>
            <textarea id="kit-text" required rows={4} value={text} onChange={(e) => setText(e.target.value)} className="field resize-y leading-relaxed" />
          </div>
          <div>
            <label className="label" htmlFor="kit-link">
              {t.link}
            </label>
            <input id="kit-link" type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" className="field" />
          </div>
          {kind === "story" && (
            <label className="flex cursor-pointer items-start gap-2.5 text-[14px]">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#0e234b]" />
              <span className={cx(consent ? "font-semibold" : "text-ink-muted")}>{t.consent}</span>
            </label>
          )}
          <button type="submit" className="btn-primary h-11 px-5 text-[15px]" disabled={!text.trim()}>
            {t.send}
          </button>
        </form>
      )}
    </section>
  );
}
