import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Heart, Menu, User, X } from "lucide-react";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { useAuth } from "@shared/contexts/AuthContext";
import { useUI } from "@shared/contexts/UIContext";
import SubNav from "@/components/SubNav";
import { supabase } from "@shared/integrations/supabase/client";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useLanguage();
  const { user } = useAuth();
  const { shareModalOpen } = useUI();
  const [navStats, setNavStats] = useState<{ acts: number; streak: number }>({ acts: 0, streak: 0 });
  const location = useLocation();
  const isHome = location.pathname === "/";
  const hasSubNav = isHome || location.pathname === "/ideas";
  const isSolid = !isHome || scrolled;

  const navLinks = [
    { label: t.navbar.home, href: "/" },
    { label: t.navbar.ideas, href: "/ideas" },
    { label: t.navbar.wall, href: "/wall" },
    { label: t.mapPage.title, href: "/map" },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
      if (!cancelled) setNavStats({ acts: count || 0, streak: data && (data as any)[0] ? (data as any)[0].current_streak : 0 });
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (shareModalOpen) return null;

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isSolid ? "bg-warm-cream/95 backdrop-blur-md shadow-sm" : "bg-transparent"
      }`}
    >
      <div className="section-padding flex items-center justify-between h-20">
        <div className="flex items-center gap-8">
          <Link to="/">
            <img
              src="/logo-PPL.png"
              alt="Pásalo Pa'lante"
              className={`h-10 transition-all duration-500 ${isSolid ? "" : "brightness-0 invert"}`}
            />
          </Link>

          <div className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              to={l.href}
              className={`text-sm font-medium tracking-wide transition-colors ${
                isSolid ? "text-foreground/70 hover:text-foreground" : "text-white/80 hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            to="/donate"
            className={`text-sm font-medium tracking-wide transition-colors ${
              isSolid ? "text-foreground/70 hover:text-foreground" : "text-white/80 hover:text-white"
            }`}
          >
            {t.navbar.donateNow}
          </Link>
          <Link
            to="/share"
            className={`text-sm font-medium tracking-wide transition-colors ${
              isSolid ? "text-foreground/70 hover:text-foreground" : "text-white/80 hover:text-white"
            }`}
          >
            {t.share.sectionCta}
          </Link>
          <Link to="/get-involved" className="btn-primary !py-3 !px-6 !text-sm">
            {t.navbar.getInvolved}
          </Link>
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
            <Link
              to="/auth"
              className={`text-sm font-medium tracking-wide transition-colors ${
                isSolid ? "text-foreground/70 hover:text-foreground" : "text-white/80 hover:text-white"
              }`}
            >
              {t.navbar.signIn}
            </Link>
          )}
          </div>
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
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  to={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-lg font-medium text-foreground/80"
                >
                  {l.label}
                </Link>
              ))}
              <Link to="/share" onClick={() => setMobileOpen(false)} className="text-lg font-medium text-foreground/80">
                {t.share.sectionCta}
              </Link>
              <Link to="/get-involved" onClick={() => setMobileOpen(false)} className="btn-primary text-center mt-2">
                {t.navbar.getInvolved}
              </Link>
              <Link to="/donate" onClick={() => setMobileOpen(false)} className="text-center text-foreground/70 text-sm">
                {t.navbar.donateNow}
              </Link>
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
