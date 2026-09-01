import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Flame, Heart, Menu, User, X } from "lucide-react";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { useAuth } from "@shared/contexts/AuthContext";
import { useUI } from "@shared/contexts/UIContext";
import { smoothScrollTo } from "@shared/lib/smoothScrollTo";
import SubNav from "@/components/SubNav";
import LanguageSwitcher from "@shared/components/LanguageSwitcher";
import { supabase } from "@shared/integrations/supabase/client";

const SCROLL_THRESHOLD = 80;

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const { t } = useLanguage();
  const { user } = useAuth();
  const { shareModalOpen, openShareModal, setNavbarMounted } = useUI();
  const [navStats, setNavStats] = useState<{ acts: number; streak: number }>({ acts: 0, streak: 0 });
  const location = useLocation();
  const navigate = useNavigate();
  const exploreRef = useRef<HTMLDivElement>(null);
  const isHome = location.pathname === "/";
  const hasSubNav = isHome || location.pathname === "/ideas";
  const isSolid = !isHome || scrolled;
  // Alternate-domain branding: passforwardkindness.com shows "Pass Kindness
  // Forward" beside the logo. Requires that domain to be routed to this same
  // site at the host level (Cloudflare custom domain) - a separate infra step.
  const hostname = typeof window !== "undefined" ? window.location.hostname.replace(/^www\./, "") : "";
  const isPassKindnessForward = hostname === "passforwardkindness.com";

  const exploreItems = [
    { label: t.navbar.ideas, href: "/ideas" },
    { label: t.mapPage.title, href: "/map" },
    { label: t.navbar.about, href: "/about" },
    { label: t.navbar.ourStory, anchor: "story" },
    { label: t.navbar.getInvolved, href: "/get-involved" },
    { label: t.navbar.donateNow, href: "/donate" },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setNavbarMounted(true);
    return () => setNavbarMounted(false);
  }, [setNavbarMounted]);

  useEffect(() => {
    if (!exploreOpen) return;
    const onClick = (e: MouseEvent) => {
      if (exploreRef.current && !exploreRef.current.contains(e.target as Node)) setExploreOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [exploreOpen]);

  useEffect(() => {
    if (!user) {
      setNavStats({ acts: 0, streak: 0 });
      return;
    }
    let cancelled = false;
    (async () => {
      const [{ count }, { data }] = await Promise.all([
        supabase.from("acts_of_kindness").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "published"),
        supabase.rpc("user_streak", { _user_id: user.id }),
      ]);
      if (!cancelled) setNavStats({ acts: count || 0, streak: data?.[0]?.current_streak ?? 0 });
    })();
    return () => { cancelled = true; };
  }, [user]);

  function goToAnchor(id: string) {
    if (isHome) {
      smoothScrollTo(id);
    } else {
      navigate(`/#${id}`);
    }
  }

  if (shareModalOpen) return null;

  const linkClass = isSolid ? "text-foreground/70 hover:text-foreground" : "text-white/80 hover:text-white";

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isSolid ? "bg-warm-cream/95 backdrop-blur-md border-b border-border shadow-sm" : "bg-transparent"
      }`}
    >
      <div className="section-padding flex items-center justify-between h-20 gap-4">
        <Link to="/" className="shrink-0 flex items-center gap-2.5">
          <img
            src="/logo-PPL.png"
            alt="Pásalo Pa'lante"
            className={`h-10 transition-all duration-300 ${isSolid ? "" : "brightness-0 invert"}`}
          />
          {isPassKindnessForward && (
            <span className={`text-base md:text-lg font-semibold tracking-tight transition-colors duration-300 ${isSolid ? "text-foreground" : "text-white"}`}>
              Pass Kindness Forward
            </span>
          )}
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <button
            type="button"
            onClick={() => goToAnchor("how-it-works")}
            className={`text-sm font-medium tracking-wide transition-colors duration-300 ${linkClass}`}
          >
            {t.navbar.howItWorks}
          </button>
          <Link to="/wall" className={`text-sm font-medium tracking-wide transition-colors duration-300 ${linkClass}`}>
            {t.navbar.wall}
          </Link>

          <div ref={exploreRef} className="relative">
            <button
              type="button"
              onClick={() => setExploreOpen((v) => !v)}
              aria-haspopup="true"
              aria-expanded={exploreOpen}
              className={`flex items-center gap-1.5 text-sm font-medium tracking-wide transition-colors duration-300 ${linkClass}`}
            >
              {t.navbar.explore}
              <ChevronDown size={14} className={`transition-transform duration-200 ${exploreOpen ? "rotate-180" : ""}`} />
            </button>
            <div
              className={`absolute right-0 top-[calc(100%+18px)] z-50 min-w-[210px] rounded-2xl border border-border bg-warm-cream p-2 shadow-2xl transition-all duration-200 ${
                exploreOpen
                  ? "opacity-100 visible translate-y-0"
                  : "opacity-0 invisible -translate-y-1.5 pointer-events-none"
              }`}
            >
              {exploreItems.map((item) => (
                item.anchor ? (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => { setExploreOpen(false); goToAnchor(item.anchor); }}
                    className="block w-full text-left rounded-lg px-4 py-2.5 text-sm text-foreground/80 hover:bg-warm-sand transition-colors"
                  >
                    {item.label}
                  </button>
                ) : (
                  <Link
                    key={item.label}
                    to={item.href!}
                    onClick={() => setExploreOpen(false)}
                    className="block rounded-lg px-4 py-2.5 text-sm text-foreground/80 hover:bg-warm-sand transition-colors"
                  >
                    {item.label}
                  </Link>
                )
              ))}
            </div>
          </div>

          <LanguageSwitcher variant="inline" triggerClassName={linkClass} />

          <span className={`h-5 w-px ${isSolid ? "bg-border" : "bg-white/25"}`} aria-hidden="true" />

          {user ? (
            <Link
              to="/account"
              aria-label={t.navbar.myAccount}
              className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                isSolid
                  ? "bg-foreground/5 text-foreground hover:bg-foreground/10"
                  : "bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              <User size={18} />
              <span className="inline-flex items-center gap-1"><Heart size={13} className="fill-current" />{navStats.acts}</span>
              {navStats.streak > 0 && <span className="inline-flex items-center gap-1"><Flame size={13} className="fill-current" />{navStats.streak}</span>}
            </Link>
          ) : (
            <Link to="/auth" className={`text-sm font-medium tracking-wide transition-colors duration-300 ${linkClass}`}>
              {t.navbar.signIn}
            </Link>
          )}

          <button
            type="button"
            onClick={() => openShareModal()}
            className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.04]"
          >
            {t.share.sectionCta}
          </button>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          className={`md:hidden p-2 transition-colors ${isSolid ? "text-foreground" : "text-white"}`}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {hasSubNav && isSolid && <SubNav />}

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            id="mobile-menu"
            className="md:hidden bg-warm-cream border-t border-border overflow-hidden"
          >
            <div className="section-padding py-6 flex flex-col gap-4">
              <button
                type="button"
                onClick={() => { setMobileOpen(false); goToAnchor("how-it-works"); }}
                className="text-lg font-medium text-foreground/80 text-left"
              >
                {t.navbar.howItWorks}
              </button>
              <Link to="/wall" onClick={() => setMobileOpen(false)} className="text-lg font-medium text-foreground/80">
                {t.navbar.wall}
              </Link>
              <LanguageSwitcher variant="inline" align="left" triggerClassName="text-lg font-medium text-foreground/80" />
              {exploreItems.map((item) => (
                item.anchor ? (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => { setMobileOpen(false); goToAnchor(item.anchor); }}
                    className="text-lg font-medium text-foreground/80 text-left"
                  >
                    {item.label}
                  </button>
                ) : (
                  <Link
                    key={item.label}
                    to={item.href!}
                    onClick={() => setMobileOpen(false)}
                    className="text-lg font-medium text-foreground/80"
                  >
                    {item.label}
                  </Link>
                )
              ))}
              <button
                type="button"
                onClick={() => { setMobileOpen(false); openShareModal(); }}
                className="btn-primary text-center mt-2"
              >
                {t.share.sectionCta}
              </button>
              {user ? (
                <Link to="/account" onClick={() => setMobileOpen(false)} className="text-center text-foreground/70 text-sm flex items-center justify-center gap-2">
                  <User size={16} /> {t.navbar.myAccount} · {navStats.acts} {t.account.acts}{navStats.streak > 0 ? ` · ${navStats.streak} ${t.account.dayStreak}` : ""}
                </Link>
              ) : (
                <Link to="/auth" onClick={() => setMobileOpen(false)} className="text-center text-foreground/70 text-sm">
                  {t.navbar.signIn}
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
