import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Share, X, Plus, Smartphone } from "lucide-react";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { useUI } from "@shared/contexts/UIContext";
import { getAppBaseUrl, isSatelliteDomain } from "@shared/lib/canonicalDomain";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "ppl-install-dismissed-at";
const DISMISS_DAYS = 14;

interface InstallPromptProps {
  /**
   * "app" is mounted on app.pasalopalante.com itself. "website" (the
   * default) is mounted on the marketing site. Historically only the app
   * had a PWA manifest, so only "app" could ever see beforeinstallprompt
   * fire — the website variant just always offered a "Get the app" link
   * to send people there instead.
   *
   * Once the two are merged onto one origin (see scripts/build-combined.mjs
   * — widens the app's manifest scope to "/" and gives every website page
   * a <link rel="manifest"> and access to the app's service worker),
   * beforeinstallprompt can fire on the website's own pages too. Both
   * variants now listen for it the same way; "website" just additionally
   * falls back to navigating to the app when it hasn't fired (still not
   * merged, iOS, or hasn't fired yet) — see handleInstallClick.
   */
  variant?: "website" | "app";
}

const InstallPrompt = ({ variant = "website" }: InstallPromptProps = {}) => {
  const { lang } = useLanguage();
  const { anyShareFlowOpen, joinPopupOpen } = useUI();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const isWebsite = variant === "website";
  const cardRef = useRef<HTMLDivElement>(null);
  // Website only: on phones the card becomes a slim ribbon pinned to the top
  // of the screen, so it never competes with the chat bubble down in the
  // bottom-right corner. Tracks the md breakpoint (768px) live.
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && !!window.matchMedia?.("(max-width: 767px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia?.("(max-width: 767px)");
    if (!mq) return;
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  const ribbon = isWebsite && isMobile;

  useEffect(() => {
    // Already running inside the installed app — nothing to do.
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (standalone) return;

    // An active service worker is part of how Chrome/Edge decide a page is
    // installable at all. The app registers its own; the website has none
    // of its own, so it registers the app's — scope "/" instead of the
    // app's usual /app/ works because of a Service-Worker-Allowed: /
    // response header (see build-combined.mjs) that widens what that
    // script is allowed to control. On the standalone (not yet merged)
    // deployment this is a cross-origin registration attempt, which
    // browsers reject — caught harmlessly below, same as before this
    // existed: no install signal there, same as always.
    //
    // Skipped entirely on a satellite domain (a co-brand marketing domain
    // sharing this combined build via a Cloudflare route, e.g.
    // passkindnessforward.com): registering it there would make those
    // marketing pages themselves installable, offering the browser's real
    // native "Install app" dialog for a separate, origin-scoped copy of
    // the app — exactly the second identity CanonicalAppDomainGate exists
    // to prevent. "Get the app" there falls back to a plain cross-origin
    // navigation instead (see openApp below).
    if ("serviceWorker" in navigator && !(isWebsite && isSatelliteDomain())) {
      if (variant === "app") {
        const base = import.meta.env.BASE_URL;
        navigator.serviceWorker.register(`${base}push-sw.js`, { scope: base }).catch(() => undefined);
      } else {
        navigator.serviceWorker.register(`${__APP_BASE_URL__}push-sw.js`, { scope: "/" }).catch(() => undefined);
      }
    }

    // Recently dismissed?
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 86400_000) return;

    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(ios);

    const onBIP = (e: Event) => {
      // beforeinstallprompt only fires when the app is NOT yet installed.
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setOpen(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    // App on iOS: never fires beforeinstallprompt, but this domain's own
    // manifest is what Add to Home Screen reads, so show the real
    // instructions directly.
    // Website: whether or not beforeinstallprompt ends up firing here,
    // still show a card after a short delay — handleInstallClick below
    // picks the right behavior (direct install vs. fall back to the app)
    // based on whatever's actually true by the time it's clicked, not
    // which of these two paths opened the card.
    if ((variant === "app" && ios) || isWebsite) {
      const t = window.setTimeout(() => setOpen(true), 2500);
      return () => {
        window.removeEventListener("beforeinstallprompt", onBIP);
        window.clearTimeout(t);
      };
    }

    // App, non-iOS: if beforeinstallprompt hasn't fired, we genuinely
    // don't know why (already installed, criteria not met yet, browser
    // doesn't support it) — no way to send them anywhere more useful than
    // where they already are, so just stay quiet rather than guess.
    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, [variant]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setOpen(false);
    setExpanded(false);
  };

  // Dismiss on any click outside the card — in particular, clicking the
  // third-party chat widget bubble closes this instead of the two sitting
  // on top of each other. There's no
  // way to hook into that widget opening directly (it's an external script
  // with no public API), so "click landed outside this card" is the
  // closest reliable proxy.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) dismiss();
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Full navigation so an installed PWA can take over on supported browsers.
  // getAppBaseUrl() is cross-origin (the app's own subdomain) by default,
  // or a same-origin "/app/" once the combined build embeds the app here on
  // the canonical domain — either way this only ever runs from the
  // "website" variant, as a fallback for whenever a direct install isn't
  // available right here. Forced cross-origin on a satellite domain (see
  // canonicalDomain.ts) so this never resolves to that domain's own /app/.
  const openApp = () => {
    window.location.assign(getAppBaseUrl());
  };

  // A real install is available right here the moment beforeinstallprompt
  // has fired, on either variant now that the website can see it too.
  const handleInstallClick = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      dismiss();
      return;
    }
    if (isIOS) {
      // No browser on iOS ever fires beforeinstallprompt — Safari and
      // Chrome-on-iOS both run on WebKit, and Apple doesn't expose that
      // API to either. Show the real "Add to Home Screen" steps right
      // here instead of routing them through the app first, on both
      // variants — there's nothing a trip to /app/ would gain them.
      setExpanded((v) => !v);
      return;
    }
    if (isWebsite) {
      // Not merged yet, or beforeinstallprompt just hasn't fired here
      // yet — send them to the app, where install always works.
      openApp();
      return;
    }
  };

  // True only when there's genuinely nothing to install right here and
  // the only useful thing left to do is send them to the app instead.
  // iOS is carved out even on the website variant — see handleInstallClick.
  const showFallback = isWebsite && !deferred && !isIOS;

  const copy = {
    en: {
      title: "Install Kindness Forward",
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
      iosOpenAppHint: "Prefer a simpler screen?",
    },
    es: {
      title: "Instala Kindness Forward",
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
      iosOpenAppHint: "¿Prefieres una pantalla más simple?",
    },
    fr: {
      title: "Installer Kindness Forward",
      subtitle: "Ajoute-la à ton écran d'accueil pour un accès rapide.",
      install: "Installer l'app",
      show: "Comment installer",
      dismiss: "Fermer",
      openApp: "Obtenir l'app",
      installedSubtitle: "Continue vers l'app, où tu pourras l'ajouter à ton écran d'accueil.",
      iosStep1: "Touche le",
      iosStep1b: "bouton Partager",
      iosStep2: "dans Safari.",
      iosStep3: "Choisis",
      iosStep3b: "Sur l'écran d'accueil",
      iosStep4: "puis Ajouter.",
      iosOpenAppHint: "Tu préfères un écran plus simple ?",
    },
    de: {
      title: "Kindness Forward installieren",
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
      iosOpenAppHint: "Lieber einen einfacheren Bildschirm?",
    },
    pt: {
      title: "Instale o Kindness Forward",
      subtitle: "Adicione à sua tela inicial para acesso rápido.",
      install: "Instalar app",
      show: "Como instalar",
      dismiss: "Fechar",
      openApp: "Baixar o app",
      installedSubtitle: "Continue para o app, onde você pode adicioná-lo à tela inicial.",
      iosStep1: "Toque no",
      iosStep1b: "botão Compartilhar",
      iosStep2: "na barra do Safari.",
      iosStep3: "Escolha",
      iosStep3b: "Adicionar à Tela de Início",
      iosStep4: "e depois toque em Adicionar.",
      iosOpenAppHint: "Prefere uma tela mais simples?",
    },
    ru: {
      title: "Установи Kindness Forward",
      subtitle: "Добавь на главный экран для быстрого доступа.",
      install: "Установить приложение",
      show: "Как установить",
      dismiss: "Закрыть",
      openApp: "Открыть приложение",
      installedSubtitle: "Перейди в приложение — там его можно добавить на главный экран.",
      iosStep1: "Нажми",
      iosStep1b: "кнопку «Поделиться»",
      iosStep2: "на панели Safari.",
      iosStep3: "Выбери",
      iosStep3b: "«На экран „Домой“»",
      iosStep4: "и нажми «Добавить».",
      iosOpenAppHint: "Нужен более простой экран?",
    },
    sl: {
      title: "Namesti Kindness Forward",
      subtitle: "Dodaj na začetni zaslon za hiter dostop.",
      install: "Namesti aplikacijo",
      show: "Kako namestiti",
      dismiss: "Zapri",
      openApp: "Pridobi aplikacijo",
      installedSubtitle: "Nadaljuj v aplikacijo, kjer jo lahko dodaš na začetni zaslon.",
      iosStep1: "Tapni",
      iosStep1b: "gumb Deli",
      iosStep2: "v orodni vrstici Safarija.",
      iosStep3: "Izberi",
      iosStep3b: "Dodaj na začetni zaslon",
      iosStep4: "in nato tapni Dodaj.",
      iosOpenAppHint: "Ti je ljubši preprostejši zaslon?",
    },
    zh: {
      title: "安装 Kindness Forward",
      subtitle: "添加到主屏幕，方便快速访问。",
      install: "安装应用",
      show: "如何安装",
      dismiss: "关闭",
      openApp: "获取应用",
      installedSubtitle: "前往应用，你可以在那里将其添加到主屏幕。",
      iosStep1: "点击 Safari 工具栏中的",
      iosStep1b: "分享按钮",
      iosStep2: "。",
      iosStep3: "选择",
      iosStep3b: "添加到主屏幕",
      iosStep4: "，然后点击添加。",
      iosOpenAppHint: "想要更简单的界面？",
    },
    hi: {
      title: "Kindness Forward इंस्टॉल करो",
      subtitle: "जल्दी पहुंच के लिए अपनी होम स्क्रीन पर जोड़ो।",
      install: "ऐप इंस्टॉल करो",
      show: "इंस्टॉल कैसे करें",
      dismiss: "बंद करो",
      openApp: "ऐप पाओ",
      installedSubtitle: "ऐप पर जाओ, जहां तुम इसे अपनी होम स्क्रीन पर जोड़ सकते हो।",
      iosStep1: "Safari टूलबार में",
      iosStep1b: "शेयर बटन",
      iosStep2: "पर टैप करो।",
      iosStep3: "चुनो",
      iosStep3b: "होम स्क्रीन में जोड़ें",
      iosStep4: "फिर जोड़ें पर टैप करो।",
      iosOpenAppHint: "सरल स्क्रीन चाहिए?",
    },
    bn: {
      title: "Kindness Forward ইনস্টল করো",
      subtitle: "দ্রুত ব্যবহারের জন্য তোমার হোম স্ক্রিনে যোগ করো।",
      install: "অ্যাপ ইনস্টল করো",
      show: "কীভাবে ইনস্টল করবে",
      dismiss: "বন্ধ করো",
      openApp: "অ্যাপটি নাও",
      installedSubtitle: "অ্যাপে যাও, সেখানে তুমি এটি হোম স্ক্রিনে যোগ করতে পারবে।",
      iosStep1: "Safari টুলবারে",
      iosStep1b: "শেয়ার বোতামে",
      iosStep2: "ট্যাপ করো।",
      iosStep3: "বেছে নাও",
      iosStep3b: "হোম স্ক্রিনে যোগ করুন",
      iosStep4: "তারপর যোগ করুন-এ ট্যাপ করো।",
      iosOpenAppHint: "আরও সহজ স্ক্রিন চাও?",
    },
    ar: {
      title: "ثبّت Kindness Forward",
      subtitle: "أضفه إلى شاشتك الرئيسية للوصول السريع.",
      install: "تثبيت التطبيق",
      show: "طريقة التثبيت",
      dismiss: "إغلاق",
      openApp: "احصل على التطبيق",
      installedSubtitle: "تابع إلى التطبيق، حيث يمكنك إضافته إلى شاشتك الرئيسية.",
      iosStep1: "اضغط على",
      iosStep1b: "زر المشاركة",
      iosStep2: "في شريط أدوات Safari.",
      iosStep3: "اختر",
      iosStep3b: "إضافة إلى الشاشة الرئيسية",
      iosStep4: "ثم اضغط إضافة.",
      iosOpenAppHint: "تفضّل شاشة أبسط؟",
    },
  } as const;
  const c = (copy as any)[lang] || copy.en;

  return (
    <AnimatePresence>
      {open && !anyShareFlowOpen && !joinPopupOpen && (
        <motion.div
          initial={{ y: ribbon ? -80 : 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: ribbon ? -80 : 80, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={
            variant === "app"
              ? "fixed inset-x-4 z-[60] bottom-[calc(4.75rem+env(safe-area-inset-bottom))]"
              : ribbon
                // Phones: full-width ribbon across the top of the screen.
                ? "fixed inset-x-0 top-0 pt-[env(safe-area-inset-top)] bg-warm-cream z-[2147483000]"
                // Desktop: bottom-left card, sitting above the scroll-to-top
                // button in that corner; the ScaleSmart chat bubble lives in
                // the bottom-right. z-[2147483000] (not z-[60]) keeps this
                // above that third-party widget even once its chat window is
                // open, since we don't control or know its z-index.
                : "fixed bottom-24 left-6 w-96 z-[2147483000]"
          }
          role="dialog"
          aria-label={showFallback ? c.openApp : c.title}
          ref={cardRef}
        >
          <div
            className={
              ribbon
                ? "bg-warm-cream border-b border-border shadow-md overflow-hidden"
                : "bg-warm-cream border border-border shadow-xl rounded-2xl overflow-hidden"
            }
          >
            {ribbon ? (
              <div className="flex items-center gap-3 px-4 py-2.5">
                <div className="shrink-0 w-8 h-8 rounded-lg bg-warm-blush flex items-center justify-center">
                  {showFallback ? (
                    <Smartphone size={16} className="text-warm-terracotta" />
                  ) : (
                    <Download size={16} className="text-warm-terracotta" />
                  )}
                </div>
                <p className="flex-1 min-w-0 font-semibold text-foreground text-sm leading-tight truncate">
                  {c.title}
                </p>
                <button
                  onClick={handleInstallClick}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-warm-terracotta text-warm-cream hover:opacity-90 transition"
                >
                  {showFallback ? c.openApp : isIOS && !deferred ? c.show : c.install}
                </button>
                <button
                  onClick={dismiss}
                  aria-label={c.dismiss}
                  className="shrink-0 -mr-1 p-1 text-foreground/40 hover:text-foreground/70"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
            <div className="flex items-start gap-3 p-4">
              <div className="shrink-0 w-11 h-11 rounded-xl bg-warm-blush flex items-center justify-center">
                {showFallback ? (
                  <Smartphone size={20} className="text-warm-terracotta" />
                ) : (
                  <Download size={20} className="text-warm-terracotta" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">
                  {showFallback ? c.openApp : c.title}
                </p>
                <p className="text-xs text-foreground/60 mt-0.5">
                  {showFallback ? c.installedSubtitle : c.subtitle}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={handleInstallClick}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-warm-terracotta text-warm-cream hover:opacity-90 transition"
                  >
                    {showFallback ? (
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
            )}

            <AnimatePresence>
              {!showFallback && isIOS && expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-border bg-warm-sand/40 overflow-hidden"
                >
                  {/* Big icon + number + short bold label first, so someone
                      who won't read the fine print can still just follow
                      the pictures; the muted caption underneath is there
                      for anyone who wants the detail. */}
                  <div className="p-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-warm-terracotta text-warm-cream text-xs font-bold flex items-center justify-center">
                        1
                      </span>
                      <motion.div
                        animate={{ scale: [1, 1.18, 1] }}
                        transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.6 }}
                        className="shrink-0 w-10 h-10 rounded-xl bg-warm-blush flex items-center justify-center"
                      >
                        <Share size={20} className="text-warm-terracotta" />
                      </motion.div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-tight">
                          {c.iosStep1} {c.iosStep1b}
                        </p>
                        <p className="text-xs text-foreground/60">{c.iosStep2}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-warm-terracotta text-warm-cream text-xs font-bold flex items-center justify-center">
                        2
                      </span>
                      <div className="shrink-0 w-10 h-10 rounded-xl bg-warm-blush flex items-center justify-center">
                        <Plus size={20} className="text-warm-terracotta" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-tight">
                          {c.iosStep3} {c.iosStep3b}
                        </p>
                        <p className="text-xs text-foreground/60">{c.iosStep4}</p>
                      </div>
                    </div>

                    {isWebsite && (
                      <div className="pt-3 border-t border-border/60">
                        <p className="text-xs text-foreground/60 mb-1.5">{c.iosOpenAppHint}</p>
                        <button
                          type="button"
                          onClick={openApp}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-warm-sky underline underline-offset-2"
                        >
                          {c.openApp} →
                        </button>
                      </div>
                    )}
                  </div>
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
