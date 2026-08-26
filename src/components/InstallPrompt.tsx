import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Share, X, Plus, Smartphone } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "ppl-install-dismissed-at";
const DISMISS_DAYS = 14;

const InstallPrompt = () => {
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [installed, setInstalled] = useState(false);
  const bipFiredRef = useRef(false);

  useEffect(() => {
    // Already running inside the installed app — nothing to do.
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (standalone) return;

    // Recently dismissed?
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 86400_000) return;

    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(ios);

    const onBIP = (e: Event) => {
      // beforeinstallprompt only fires when the app is NOT yet installed.
      e.preventDefault();
      bipFiredRef.current = true;
      setInstalled(false);
      setDeferred(e as BIPEvent);
      setOpen(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    if (ios) {
      // iOS never fires beforeinstallprompt — show the install hint.
      const t = window.setTimeout(() => setOpen(true), 2500);
      return () => {
        window.removeEventListener("beforeinstallprompt", onBIP);
        window.clearTimeout(t);
      };
    }

    // Non-iOS: if beforeinstallprompt hasn't fired after a short delay, the
    // app is likely already installed (or the browser can't install it) —
    // surface an "Open app" shortcut instead of install instructions.
    const installedTimer = window.setTimeout(() => {
      if (!bipFiredRef.current) {
        setInstalled(true);
        setOpen(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.clearTimeout(installedTimer);
    };
  }, []);

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

  // Full navigation so an installed PWA can take over on supported browsers;
  // otherwise it lands on the in-site app shell at /app.
  const openApp = () => {
    window.location.assign("/app");
  };

  const copy = {
    en: {
      title: "Install Pásalo Pa'lante",
      subtitle: "Add to your home screen for quick access.",
      install: "Install app",
      show: "How to install",
      dismiss: "Dismiss",
      openApp: "Open app",
      installedSubtitle: "You're all set — jump straight into the app.",
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
      openApp: "Abrir app",
      installedSubtitle: "Ya está todo listo — entra directo a la app.",
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
      openApp: "Ouvrir l'app",
      installedSubtitle: "Tout est prêt — lancez directement l'application.",
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
      openApp: "App öffnen",
      installedSubtitle: "Alles bereit — öffne die App direkt.",
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
      {open && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-96 z-[60]"
          role="dialog"
          aria-label={installed ? c.openApp : c.title}
        >
          <div className="bg-warm-cream border border-border shadow-xl rounded-2xl overflow-hidden">
            <div className="flex items-start gap-3 p-4">
              <div className="shrink-0 w-11 h-11 rounded-xl bg-warm-blush flex items-center justify-center">
                {installed ? (
                  <Smartphone size={20} className="text-warm-terracotta" />
                ) : (
                  <Download size={20} className="text-warm-terracotta" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">
                  {installed ? c.openApp : c.title}
                </p>
                <p className="text-xs text-foreground/60 mt-0.5">
                  {installed ? c.installedSubtitle : c.subtitle}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={installed ? openApp : install}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-warm-terracotta text-warm-cream hover:opacity-90 transition"
                  >
                    {installed ? (
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
              {!installed && isIOS && expanded && (
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
