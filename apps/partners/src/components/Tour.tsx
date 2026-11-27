import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Heart, ImagePlus, Package, Plus, UserRound, Users } from "lucide-react";
import { kindWords, useHubCopy } from "@/lib/hubCopy";
import { useMe } from "@/lib/hub";
import { useSession } from "@/lib/session";

/** Ask for the tour from anywhere (the Me page has a "Show me around" button). */
export const TOUR_EVENT = "pkf-hub-tour";
export function startTour() {
  window.dispatchEvent(new Event(TOUR_EVENT));
}

const doneKey = (id: string) => `pkf-hub-tour-done-${id}`;

/** anchor: the data-tour places to light up, first one showing on screen wins (a computer and a phone differ). */
type Step = { anchor: string[] | null; icon: typeof Heart; tint: string; en: [string, string]; es: [string, string] };

/**
 * The short tour a member sees the first time they come in (25 Nov 2026): seven quick cards, each
 * lighting up the part of the screen it talks about. Shown once per person on this device, and
 * again any time from the Me page. 27 Nov 2026: photos and videos, and Events, got their own
 * cards; Ideas is left to the menu so the tour stays short.
 */
export default function Tour() {
  const { lang } = useHubCopy();
  const { h } = useHubCopy();
  const { staff, partner } = useSession();
  const { data: me } = useMe();
  const who = staff?.id ?? partner?.id ?? null;
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // first visit: open by itself, once the page has settled
  useEffect(() => {
    if (!who || !me) return;
    let seen = true;
    try {
      seen = localStorage.getItem(doneKey(who)) === "1";
    } catch {
      /* private mode: don't nag */
    }
    if (seen) return;
    const t = window.setTimeout(() => setOpen(true), 700);
    return () => window.clearTimeout(t);
  }, [who, me]);

  useEffect(() => {
    const onAsk = () => {
      setI(0);
      setOpen(true);
    };
    window.addEventListener(TOUR_EVENT, onAsk);
    return () => window.removeEventListener(TOUR_EVENT, onAsk);
  }, []);

  const finish = useCallback(() => {
    setOpen(false);
    setI(0);
    try {
      if (who) localStorage.setItem(doneKey(who), "1");
    } catch {
      /* fine */
    }
  }, [who]);

  const words = kindWords(me?.kind ?? "organisation", lang);
  const solo = me?.kind === "ambassador";
  const steps: Step[] = [
    {
      anchor: null,
      icon: Heart,
      tint: "bg-tint-orange text-orange",
      en: ["Welcome to your Partners Hub", `${words.welcomeLine} Here's a quick look around.`],
      es: ["Bienvenidos a tu Partners Hub", `${words.welcomeLine} Te mostramos todo en un momento.`],
    },
    {
      anchor: ["media", "create"],
      icon: ImagePlus,
      tint: "bg-sky text-white",
      en: ["Photos and videos", "Add them here in one click. Post them for every member, or send them only to us for our socials."],
      es: ["Fotos y videos", "Añádelos aquí con un clic. Publícalos para todos los miembros o envíanoslos solo a nosotros para nuestras redes."],
    },
    {
      anchor: ["create"],
      icon: Plus,
      tint: "bg-orange text-white",
      en: ["Share", "Write a post, log an act toward your pledge, or send us a story in your own words."],
      es: ["Compartir", "Escribe una publicación, registra un acto de tu compromiso o envíanos una historia en tus palabras."],
    },
    {
      anchor: ["events"],
      icon: CalendarDays,
      tint: "bg-gold text-navy",
      en: ["Events", "The season's big moments, events from our team, and days worth planning for. Add any of them to your calendar."],
      es: ["Eventos", "Los grandes momentos de la temporada, eventos de nuestro equipo y días que vale la pena planificar. Añádelos a tu calendario."],
    },
    {
      anchor: ["kit"],
      icon: Package,
      tint: "bg-tint-sky text-sky",
      en: ["Your kit", solo ? "Ready posts and frames. Add your photo and they're made for you." : "Ready posts, frames and logos. Add your logo or a photo and they're made for you."],
      es: ["Tu kit", solo ? "Publicaciones y marcos listos. Añade tu foto y se hacen para ti." : "Publicaciones, marcos y logos listos. Añade tu logo o una foto y se hacen para ti."],
    },
    {
      anchor: ["people"],
      icon: Users,
      tint: "bg-tint-pink text-magenta",
      en: ["Community", "Everyone passing kindness forward with you, and the map of new pledges coming in."],
      es: ["Comunidad", "Todos los que pasan la bondad pa'lante contigo, y el mapa con los compromisos que van llegando."],
    },
    {
      anchor: ["me"],
      icon: UserRound,
      tint: "bg-tint-sky text-sky-deep",
      en: ["Your profile", "Your pledge, the acts you've logged, your badges and your certificate."],
      es: ["Tu perfil", "Tu compromiso, los actos que registras, tus insignias y tu certificado."],
    },
  ];
  const step = steps[Math.min(i, steps.length - 1)];
  const last = i >= steps.length - 1;

  // light up the part of the screen this card is about
  const anchorKey = step.anchor?.join(",") ?? "";
  useLayoutEffect(() => {
    if (!open || !anchorKey) return setRect(null);
    const find = () => {
      const visible = (e: HTMLElement) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      };
      const el = anchorKey
        .split(",")
        .map((a) => [...document.querySelectorAll<HTMLElement>(`[data-tour="${a}"]`)].find(visible))
        .find(Boolean);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    find();
    window.addEventListener("resize", find);
    window.addEventListener("scroll", find, true);
    return () => {
      window.removeEventListener("resize", find);
      window.removeEventListener("scroll", find, true);
    };
  }, [open, anchorKey]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight") setI((x) => Math.min(x + 1, steps.length - 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(x - 1, 0));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, finish, steps.length]);

  if (!open || !me) return null;
  const [title, body] = lang === "es" ? step.es : step.en;
  const pad = 6;
  // the card sits away from what it points at
  const lower = rect ? rect.top + rect.height / 2 < window.innerHeight / 2 : false;
  const wideScreen = window.innerWidth >= 1024;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={title}>
      {rect ? (
        <div
          className="pointer-events-none fixed"
          style={{
            left: rect.left - pad,
            top: rect.top - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            boxShadow: "0 0 0 9999px rgba(14,35,75,0.55)",
            outline: "3px solid #fdb813",
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-navy/55" />
      )}
      <div
        className={`fixed inset-x-4 mx-auto flex max-w-[400px] flex-col bg-white shadow-[0_24px_64px_rgba(14,35,75,0.35)] ${
          !rect ? "top-1/2 -translate-y-1/2" : lower ? "bottom-24" : "top-20"
        } ${rect && wideScreen ? "lg:start-[300px] lg:end-auto lg:w-[400px]" : ""}`}
        style={rect && wideScreen ? { top: Math.min(Math.max(rect.top - 40, 24), window.innerHeight - 320), bottom: "auto" } : undefined}
      >
        <div className="h-1.5 bg-bar" aria-hidden="true" />
        <div className="flex flex-col gap-3 px-6 pb-5 pt-6">
          <span className={`flex h-12 w-12 items-center justify-center ${step.tint}`}>
            <step.icon className="h-6 w-6" aria-hidden="true" />
          </span>
          <h2 className="m-0 text-[21px] font-extrabold leading-tight">{title}</h2>
          <p className="m-0 text-[15px] font-medium leading-relaxed text-ink2">{body}</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="flex gap-1.5" aria-hidden="true">
              {steps.map((_, n) => (
                <i key={n} className={`h-2 transition-all ${n === i ? "w-5 bg-orange" : "w-2 bg-hair"}`} />
              ))}
            </span>
            <span className="flex items-center gap-1">
              {i > 0 ? (
                <button type="button" onClick={() => setI(i - 1)} className="btn-quiet h-10 px-2" aria-label={h.tourBack}>
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : (
                <button type="button" onClick={finish} className="btn-quiet h-10 px-3 text-sm">
                  {h.tourSkip}
                </button>
              )}
              <button type="button" onClick={() => (last ? finish() : setI(i + 1))} className="btn-orange h-10 px-4 text-sm" autoFocus>
                {last ? h.tourDone : h.tourNext}
                {!last && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
