import { useEffect, useRef, useState, type RefObject } from "react";
import { Link } from "react-router-dom";
import { Check, Heart, Share2 } from "lucide-react";
import { useLanguage } from "@shared/contexts/LanguageContext";

// HighLevel's official embed helper. It resizes the iframe to fit the form
// and links submissions to the visitor's session.
const EMBED_SCRIPT_SRC = "https://link.msgsndr.com/js/form_embed.js";

// Two messages the HighLevel survey posts to this page (read from its own
// code, November 2026):
// - ["set-sticky-contacts", ...] each time it saves the contact. Our forms
//   save partial answers, so this fires on every "Next" as well as on submit.
// - "[iFrameSizer]<id>:<height>:<width>:size" is sent only by HighLevel's
//   end-of-form message (the thank-you) when it appears.
// Inside an iframe that thank-you message stretches to the full height of the
// long form and centres itself, which left a big empty gap above and below
// the text (reported by a nonprofit after signing up). So once the contact
// has been saved and the end message appears, we show our own thank-you card
// in its place and bring it into view.
const SAVED_MESSAGE = "set-sticky-contacts";
const SIZER_PREFIX = "[iFrameSizer]";

// The fixed navbar is 80px (h-20); a card top above this line is hidden.
const NAVBAR_HEIGHT = 80;

const BRAND_GRADIENT = "linear-gradient(90deg, #f37023 0%, #fdb813 34%, #00a3e0 68%, #d81b60 100%)";
const TRAY_GRADIENT = "linear-gradient(180deg, #fff5ec 0%, #f4f8fc 45%, #eef4fa 100%)";
const SHEET = "rounded-[20px] bg-white shadow-[0_2px_14px_rgba(14,35,75,0.10)]";

export type GHLFormAudience = "nonprofits" | "schools" | "companies" | "municipalities" | "partners" | "ambassadors";

type ThanksCopy = {
  label: string;
  title: string;
  body: string;
  next: string[];
  signOff: string;
};

type Copy = {
  loading: string;
  nextHeading: string;
  pledgeCta: string;
  shareCta: string;
  copied: string;
  who: Record<Exclude<GHLFormAudience, "ambassadors"> | "default", string>;
  pledge: ThanksCopy;
  ambassadors: ThanksCopy;
};

// Wording follows the thank-you messages the team set up in HighLevel,
// without exclamation marks and without the line meant only for JA offices.
const COPY: Record<"en" | "es", Copy> = {
  en: {
    loading: "Loading the form",
    nextHeading: "What's next",
    pledgeCta: "Make your own pledge",
    shareCta: "Share this page",
    copied: "Link copied",
    who: {
      default: "Your group",
      nonprofits: "Your community",
      schools: "Your school",
      companies: "Your company",
      municipalities: "Your city",
      partners: "Your organization",
    },
    pledge: {
      label: "Sign-up received",
      title: "Thank you for pledging kindness",
      body: "{who} is now part of the Kindness Forward movement, joining a global effort to inspire 1 billion acts of kindness during Global Kindness Season (Nov 1, 2026 – Jan 31, 2027).",
      next: [
        "Check your email for your welcome kit and next steps.",
        "Share this page with other schools, organizations and partners in your network.",
      ],
      signOff: "Together, we're building a kinder world, one act at a time.",
    },
    ambassadors: {
      label: "Responses received",
      title: "Thank you, your responses are in",
      body: "Thank you for taking the time to share your perspective with Pass Kindness Forward.",
      next: [
        "Our team will review your details and B.A.N.K. Codebreaker results to tailor our first conversation around your goals and communication style.",
        "We'll reach out by email or WhatsApp to schedule a quick call and explore where your strengths fit best within the movement.",
      ],
      signOff: "Don't just join kindness. Live it, share it and multiply it.",
    },
  },
  es: {
    loading: "Cargando el formulario",
    nextHeading: "Lo que sigue",
    pledgeCta: "Haz tu propia promesa",
    shareCta: "Comparte esta página",
    copied: "Enlace copiado",
    who: {
      default: "Tu grupo",
      nonprofits: "Tu comunidad",
      schools: "Tu escuela",
      companies: "Tu empresa",
      municipalities: "Tu municipio",
      partners: "Tu organización",
    },
    pledge: {
      label: "Registro recibido",
      title: "Gracias por comprometerte con la bondad",
      body: "{who} ya forma parte del movimiento Kindness Forward y se suma a un esfuerzo global para inspirar mil millones de actos de bondad durante la Global Kindness Season (1 de noviembre de 2026 – 31 de enero de 2027).",
      next: [
        "Revisa tu correo: ahí te llegarán tu kit de bienvenida y los próximos pasos.",
        "Comparte esta página con otras escuelas, organizaciones y aliados de tu red.",
      ],
      signOff: "Juntos estamos construyendo un mundo más bondadoso, un acto a la vez.",
    },
    ambassadors: {
      label: "Respuestas recibidas",
      title: "Gracias, recibimos tus respuestas",
      body: "Gracias por tomarte el tiempo de compartir tu perspectiva con Pass Kindness Forward.",
      next: [
        "Nuestro equipo revisará tus datos y tus resultados de B.A.N.K. Codebreaker para preparar nuestra primera conversación según tus metas y tu estilo de comunicación.",
        "Te escribiremos por correo o WhatsApp para agendar una llamada breve y ver dónde encajan mejor tus fortalezas dentro del movimiento.",
      ],
      signOff: "No te unas solo a la bondad. Vívela, compártela y multiplícala.",
    },
  },
};

function ensureEmbedScript() {
  if (document.querySelector(`script[src="${EMBED_SCRIPT_SRC}"]`)) return;
  const script = document.createElement("script");
  script.src = EMBED_SCRIPT_SRC;
  document.body.appendChild(script);
}

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

interface GHLFormEmbedProps {
  formId: string;
  title: string;
  /** Who the form is for; picks the wording of the thank-you card. */
  audience?: GHLFormAudience;
}

export default function GHLFormEmbed({ formId, title, audience }: GHLFormEmbedProps) {
  const { lang } = useLanguage();
  const c = COPY[lang as keyof typeof COPY] ?? COPY.en;
  const cardRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [ready, setReady] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    ensureEmbedScript();
  }, []);

  useEffect(() => {
    let saved = false;
    let timer: number | undefined;

    // After "Next" the new step starts at the top of the frame. If the reader
    // pressed it at the bottom of a long step, bring the top back into view
    // so they don't land on an empty stretch of page.
    const bringTopIntoView = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const card = cardRef.current;
        if (card && card.getBoundingClientRect().top < NAVBAR_HEIGHT) {
          card.scrollIntoView?.({ behavior: scrollBehavior(), block: "start" });
        }
      }, 150);
    };

    const onMessage = (event: MessageEvent) => {
      const frame = frameRef.current;
      if (!frame || event.source !== frame.contentWindow) return;
      const { data } = event;
      if (Array.isArray(data) && data[0] === SAVED_MESSAGE) {
        saved = true;
        bringTopIntoView();
        return;
      }
      if (typeof data === "string" && data.startsWith(SIZER_PREFIX)) {
        const [, height, , type] = data.slice(SIZER_PREFIX.length).split(":");
        if (Number(height) > 300) setReady(true);
        if (type === "size" && saved) setFinished(true);
      }
    };

    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!finished) return;
    cardRef.current?.scrollIntoView?.({ behavior: scrollBehavior(), block: "start" });
    headingRef.current?.focus({ preventScroll: true });
  }, [finished]);

  const thanks = audience === "ambassadors" ? c.ambassadors : c.pledge;
  const who = c.who[audience && audience !== "ambassadors" ? audience : "default"];

  return (
    <div className="relative">
      {/* soft brand glow behind the card */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-3 -inset-y-6 md:-inset-x-8 md:-inset-y-10 blur-2xl"
        style={{
          background:
            "radial-gradient(42% 38% at 12% 8%, rgba(243,112,35,0.20), transparent 70%)," +
            "radial-gradient(40% 40% at 92% 30%, rgba(0,163,224,0.18), transparent 70%)," +
            "radial-gradient(45% 35% at 55% 100%, rgba(216,27,96,0.12), transparent 70%)",
        }}
      />

      {/* A soft tinted tray; HighLevel draws the form as a white sheet on it,
          and the thank-you card uses the same sheet look. */}
      <div
        ref={cardRef}
        className="relative scroll-mt-24 md:scroll-mt-28 overflow-hidden rounded-[28px] ring-1 ring-[#0e234b]/[0.07] shadow-[0_28px_70px_-30px_rgba(14,35,75,0.40)]"
        style={{ background: TRAY_GRADIENT }}
      >
        <div aria-hidden="true" className="h-1.5 w-full" style={{ background: BRAND_GRADIENT }} />

        {finished && (
          <ThankYou
            copy={{ ...thanks, body: thanks.body.replace("{who}", who) }}
            nextHeading={c.nextHeading}
            pledgeCta={c.pledgeCta}
            shareCta={c.shareCta}
            copied={c.copied}
            headingRef={headingRef}
          />
        )}

        <div className={finished ? "hidden" : "relative"} style={{ minHeight: ready ? undefined : 560 }}>
          {!ready && <LoadingState label={c.loading} />}
          <iframe
            ref={frameRef}
            src={`https://api.leadconnectorhq.com/widget/survey/${formId}`}
            style={{ border: "none", width: "100%" }}
            className={`block transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}
            scrolling="no"
            id={formId}
            title={title}
            data-cookie-consent="true"
            data-cookie-consent-provider="auto"
            onLoad={() => window.setTimeout(() => setReady(true), 1500)}
          />
        </div>
      </div>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div
      className={`absolute inset-x-4 top-6 z-10 mx-auto flex max-w-[548px] flex-col gap-6 p-6 md:inset-x-6 md:p-8 ${SHEET}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 text-sm font-medium text-foreground/60">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f37023]/10">
          <Heart className="h-4 w-4 text-[#f37023] motion-safe:animate-pulse" fill="currentColor" aria-hidden="true" />
        </span>
        {label}
      </div>
      {[0.42, 0.3, 0.36].map((w, i) => (
        <div key={i} className="space-y-2.5">
          <div className="h-3 rounded-full bg-warm-sand motion-safe:animate-pulse" style={{ width: `${w * 100}%` }} />
          <div className="h-12 w-full rounded-xl bg-warm-sand motion-safe:animate-pulse" />
        </div>
      ))}
      <div className="mt-1 h-12 w-40 rounded-full bg-[#f37023]/15 motion-safe:animate-pulse" />
    </div>
  );
}

interface ThankYouProps {
  copy: ThanksCopy;
  nextHeading: string;
  pledgeCta: string;
  shareCta: string;
  copied: string;
  headingRef: RefObject<HTMLHeadingElement>;
}

function ThankYou({ copy, nextHeading, pledgeCta, shareCta, copied, headingRef }: ThankYouProps) {
  const [shown, setShown] = useState(false);
  const [didCopy, setDidCopy] = useState(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setShown(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  async function share() {
    const url = window.location.href.split("#")[0];
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setDidCopy(true);
      window.setTimeout(() => setDidCopy(false), 2500);
    } catch {
      // The visitor closed the share sheet; nothing to do.
    }
  }

  const stepColors = ["bg-[#00a3e0] text-white", "bg-[#fdb813] text-[#0e234b]", "bg-[#d81b60] text-white"];

  return (
    <div className="p-3 sm:p-5">
    <div
      className={`relative overflow-hidden px-6 pb-9 pt-8 sm:px-10 sm:pb-11 sm:pt-10 transition-all duration-700 ease-out motion-reduce:transition-none ${SHEET} ${
        shown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      }`}
    >
      {/* a ribbon flourish in the corner, in the brand colours */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute -right-6 -top-4 h-24 w-32 opacity-90 sm:-right-10 sm:-top-6 sm:h-44 sm:w-56"
        viewBox="0 0 224 176"
        fill="none"
      >
        <defs>
          <linearGradient id="ty-ribbon" x1="0" y1="0" x2="224" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fdb813" />
            <stop offset="1" stopColor="#f37023" />
          </linearGradient>
        </defs>
        <path
          d="M8 150 C 60 150, 70 70, 118 70 C 160 70, 150 128, 120 120 C 92 112, 120 40, 216 24"
          stroke="url(#ty-ribbon)"
          strokeWidth="14"
          strokeLinecap="round"
        />
      </svg>

      <div className="relative mb-6 h-16 w-16">
        <span className="absolute inset-0 rounded-full bg-[#f37023]/25 motion-safe:animate-ping [animation-iteration-count:2]" />
        <span
          className="relative flex h-16 w-16 items-center justify-center rounded-full shadow-[0_12px_28px_-10px_rgba(216,27,96,0.65)]"
          style={{ background: "linear-gradient(135deg, #f37023 0%, #d81b60 100%)" }}
        >
          <Heart className="h-7 w-7 text-white" fill="currentColor" aria-hidden="true" />
        </span>
      </div>

      <p className="relative flex items-center gap-1.5 text-sm font-semibold text-[#f37023]">
        <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
        {copy.label}
      </p>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="relative mt-2 max-w-md text-3xl leading-[1.15] text-foreground outline-none md:text-[2.35rem]"
      >
        {copy.title}
      </h2>
      <p className="mt-4 text-base leading-relaxed text-foreground/75 md:text-lg">{copy.body}</p>

      <div className="mt-7 rounded-2xl bg-warm-sand p-5 md:p-6">
        <p className="text-sm font-semibold text-foreground">{nextHeading}</p>
        <ol className="mt-4 space-y-4">
          {copy.next.map((step, i) => (
            <li key={step} className="flex gap-3.5">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${stepColors[i % stepColors.length]}`}
              >
                {i + 1}
              </span>
              <span className="pt-0.5 text-[15px] leading-relaxed text-foreground/80">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <p className="mt-7 text-lg italic text-foreground/80" style={{ fontFamily: "'DM Serif Display', serif" }}>
        {copy.signOff}
      </p>

      <div className="mt-7 flex flex-wrap gap-3">
        <Link
          to="/#get-involved-inline"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.04]"
        >
          <Heart className="h-4 w-4" fill="currentColor" aria-hidden="true" />
          {pledgeCta}
        </Link>
        <button
          type="button"
          onClick={share}
          className="inline-flex items-center gap-2 rounded-full border-2 border-[#0e234b]/15 px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:border-[#00a3e0] hover:text-[#0e234b]"
        >
          {didCopy ? <Check className="h-4 w-4 text-[#00a3e0]" aria-hidden="true" /> : <Share2 className="h-4 w-4" aria-hidden="true" />}
          <span aria-live="polite">{didCopy ? copied : shareCta}</span>
        </button>
      </div>
    </div>
    </div>
  );
}
