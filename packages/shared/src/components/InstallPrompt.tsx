import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Share, X, Plus, Smartphone } from "lucide-react";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { useUI } from "@shared/contexts/UIContext";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "ppl-install-dismissed-at";
const DISMISS_DAYS = 14;

interface InstallPromptProps {
  /**
   * "app" is mounted on app.pasalopalante.com itself, which has a real PWA
   * manifest — beforeinstallprompt can genuinely fire there, so this variant
   * listens for it and shows the real native "Install" dialog (or, on iOS,
   * Safari's manual Add-to-Home-Screen steps).
   *
   * "website" (the default) is mounted on the marketing site, which has no
   * manifest of its own — beforeinstallprompt can NEVER fire there, for
   * anyone, installed or not (a page can't trigger a different origin's
   * install prompt either). So this variant doesn't wait for it at all: it
   * always just offers to send someone to the app, where the real install
   * flow lives.
   */
  variant?: "website" | "app";
}

const InstallPrompt = ({ variant = "website" }: InstallPromptProps = {}) => {
  const { lang } = useLanguage();
  const { anyShareFlowOpen } = useUI();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const isWebsite = variant === "website";
  const bipFiredRef = useRef(false);

  useEffect(() => {
    // Already running inside the installed app — nothing to do.
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (standalone) return;

    // Website: no manifest of its own, so there's no real install flow to
    // wait for or fake — just offer to send them to the app after a short
    // delay, where the real thing lives.
    if (variant === "website") {
      const t = window.setTimeout(() => setOpen(true), 2500);
      return () => window.clearTimeout(t);
    }

    // An active service worker is part of how Chrome/Edge decide a site is
    // installable at all — previously this only registered once someone
    // opted into push notifications, so beforeinstallprompt could go the
    // entire first visit without ever firing. Register eagerly (independent
    // of whether the install card below is dismissed) so "Install app" is
    // reliably available from the first visit, not just after push opt-in.
    if ("serviceWorker" in navigator) {
      // Base-relative so this works whether this bundle is served from its
      // own domain root (today) or embedded under /app on the combined
      // deployment (import.meta.env.BASE_URL reflects whatever --base the
      // build used).
      const base = import.meta.env.BASE_URL;
      navigator.serviceWorker.register(`${base}push-sw.js`, { scope: base }).catch(() => undefined);
    }

    // Recently dismissed?
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 86400_000) return;

    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(ios);

    const onBIP = (e: Event) => {
      // beforeinstallprompt only fires when the app is NOT yet installed.
      // Calling .prompt() here (or from any code not itself running inside
      // a fresh click/tap on THIS page) throws NotAllowedError — Chrome
      // requires a live user gesture at call time, and that doesn't survive
      // a navigation. Confirmed live: this used to try auto-calling
      // .prompt() right after arriving from the website's "Get the app"
      // link, and always failed with exactly that error. There's no way
      // around it — the soonest this can fire is a real tap on our own
      // card below.
      e.preventDefault();
      bipFiredRef.current = true;
      setDeferred(e as BIPEvent);
      setOpen(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    if (ios) {
      // iOS never fires beforeinstallprompt — show the install hint. Real
      // here (unlike on the website): this domain's manifest is what Add to
      // Home Screen actually reads, so the resulting icon is a proper PWA.
      const t = window.setTimeout(() => setOpen(true), 2500);
      return () => {
        window.removeEventListener("beforeinstallprompt", onBIP);
        window.clearTimeout(t);
      };
    }

    // Non-iOS, in the app itself: if beforeinstallprompt hasn't fired, we
    // genuinely don't know why (already installed, criteria not met yet,
    // browser doesn't support it) — no way to send them anywhere more
    // useful than where they already are, so just stay quiet rather than
    // guess.
    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, [variant]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setOpen(false);
    setExpanded(false);
  };

  const install = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      dismiss();
    } else {
      setExpanded((v) => !v);
    }
  };

  // Full navigation so an installed PWA can take over on supported browsers.
  // __APP_BASE_URL__ is cross-origin (the app's own subdomain) by default,
  // or a same-origin "/app/" once the combined build embeds the app here —
  // either way this only ever runs from the "website" variant.
  const openApp = () => {
    window.location.assign(__APP_BASE_URL__);
  };

  const copy = {
    en: {
      title: "Install Pásalo Pa'lante",
      subtitle: "Add to your home screen for quick access.",
      install: "Install app",
      show: "How to install",
      dismiss: "Dismiss",
      openApp: "Get the app",
      installedSubtitle: "Continue to the app, where you can add it to your home screen.",
      iosStep1: "Tap the",
      iosStep1b: "Share button",
      iosStep2: "in Safari's toolbar.",
      iosStep3: "Choose",
      iosStep3b: "Add to Home Screen",
      iosStep4: "then tap Add.",
    },
    es: {
      title: "Instala Pásalo Pa'lante",
      subtitle: "Añádela a tu pantalla de inicio para acceso rápido.",
      install: "Instalar app",
      show: "Cómo instalar",
      dismiss: "Cerrar",
      openApp: "Obtener la app",
      installedSubtitle: "Continúa a la app, donde podrás añadirla a tu pantalla de inicio.",
      iosStep1: "Toca el",
      iosStep1b: "botón Compartir",
      iosStep2: "en la barra de Safari.",
      iosStep3: "Elige",
      iosStep3b: "Añadir a pantalla de inicio",
      iosStep4: "y luego toca Añadir.",
    },
    fr: {
      title: "Installer Pásalo Pa'lante",
      subtitle: "Ajoutez à votre écran d'accueil pour un accès rapide.",
      install: "Installer l'app",
      show: "Comment installer",
      dismiss: "Fermer",
      openApp: "Obtenir l'app",
      installedSubtitle: "Continuez vers l'app, où vous pourrez l'ajouter à votre écran d'accueil.",
      iosStep1: "Touchez le",
      iosStep1b: "bouton Partager",
      iosStep2: "dans Safari.",
      iosStep3: "Choisissez",
      iosStep3b: "Sur l'écran d'accueil",
      iosStep4: "puis Ajouter.",
    },
    de: {
      title: "Pásalo Pa'lante installieren",
      subtitle: "Zum Startbildschirm hinzufügen für schnellen Zugriff.",
      install: "App installieren",
      show: "So installieren",
      dismiss: "Schließen",
      openApp: "App holen",
      installedSubtitle: "Weiter zur App, wo du sie zum Startbildschirm hinzufügen kannst.",
      iosStep1: "Tippe auf den",
      iosStep1b: "Teilen-Button",
      iosStep2: "in Safari.",
      iosStep3: "Wähle",
      iosStep3b: "Zum Home-Bildschirm",
      iosStep4: "und dann Hinzufügen.",
    },
  } as const;
  const c = (copy as any)[lang] || copy.en;

  return (
    <AnimatePresence>
      {open && !anyShareFlowOpen && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={
            variant === "app"
              ? "fixed inset-x-4 z-[60] bottom-[calc(4.75rem+env(safe-area-inset-bottom))]"
              : "fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-96 z-[60]"
          }
          role="dialog"
          aria-label={isWebsite ? c.openApp : c.title}
        >
          <div className="bg-warm-cream border border-border shadow-xl rounded-2xl overflow-hidden">
            <div className="flex items-start gap-3 p-4">
              <div className="shrink-0 w-11 h-11 rounded-xl bg-warm-blush flex items-center justify-center">
                {isWebsite ? (
                  <Smartphone size={20} className="text-warm-terracotta" />
                ) : (
                  <Download size={20} className="text-warm-terracotta" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">
                  {isWebsite ? c.openApp : c.title}
                </p>
                <p className="text-xs text-foreground/60 mt-0.5">
                  {isWebsite ? c.installedSubtitle : c.subtitle}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={isWebsite ? openApp : install}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-warm-terracotta text-warm-cream hover:opacity-90 transition"
                  >
                    {isWebsite ? (
                      <>
                        <Smartphone size={13} />
                        {c.openApp}
                      </>
                    ) : (
                      <>
                        <Download size={13} />
                        {isIOS && !deferred ? c.show : c.install}
                      </>
                    )}
                  </button>
                  <button
                    onClick={dismiss}
                    className="px-3 py-2 rounded-full text-xs font-medium text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition"
                  >
                    {c.dismiss}
                  </button>
                </div>
              </div>
              <button
                onClick={dismiss}
                aria-label={c.dismiss}
                className="shrink-0 -mr-1 -mt-1 p-1 text-foreground/40 hover:text-foreground/70"
              >
                <X size={16} />
              </button>
            </div>

            <AnimatePresence>
              {!isWebsite && isIOS && expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-border bg-warm-sand/40 overflow-hidden"
                >
                  <ol className="p-4 space-y-2 text-xs text-foreground/80 list-decimal list-inside">
                    <li className="flex items-center gap-1.5 flex-wrap">
                      {c.iosStep1}
                      <Share size={13} className="inline text-warm-terracotta" />
                      <span className="font-medium">{c.iosStep1b}</span>
                      {c.iosStep2}
                    </li>
                    <li className="flex items-center gap-1.5 flex-wrap">
                      {c.iosStep3}
                      <Plus size={13} className="inline text-warm-terracotta" />
                      <span className="font-medium">{c.iosStep3b}</span>
                      — {c.iosStep4}
                    </li>
                  </ol>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InstallPrompt;
