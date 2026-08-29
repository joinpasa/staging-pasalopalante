import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { cn } from "@shared/lib/utils";

interface SubNavItem {
  id: string;
  label: string;
}

const SubNav = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const [activeId, setActiveId] = useState<string>("");

  let items: SubNavItem[] = [];
  if (location.pathname === "/") {
    items = [
      { id: "how-it-works", label: t.navbar.howItWorks },
      { id: "anthem", label: t.navbar.anthem },
      { id: "proof", label: t.navbar.proof },
      { id: "story", label: t.navbar.ourStory },
      { id: "join", label: t.navbar.joinMovement },
    ];
  } else if (location.pathname === "/ideas") {
    items = [
      { id: "ideas", label: t.inspiration.anchorIdeas },
      { id: "volunteer", label: t.inspiration.anchorVolunteer },
    ];
  }

  useEffect(() => {
    if (items.length === 0) return;
    const onScroll = () => {
      const offset = 180; // navbar + subnav height buffer
      let current = items[0].id;
      for (const item of items) {
        const el = document.getElementById(item.id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top - offset <= 0) current = item.id;
      }
      setActiveId(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  if (items.length === 0) return null;

  const handleClick = (e: React.MouseEvent, id: string) => {
    const el = document.getElementById(id);
    if (el) {
      e.preventDefault();
      const y = el.getBoundingClientRect().top + window.scrollY - 110;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <div className="bg-warm-cream/95 backdrop-blur-md border-t border-foreground/5">
      <div className="section-padding">
        <nav className="flex items-center gap-5 md:gap-7 overflow-x-auto h-11 -mx-1 px-1">
          {items.map((item) => {
            const active = activeId === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => handleClick(e, item.id)}
                className={cn(
                  "whitespace-nowrap text-xs uppercase tracking-[0.15em] transition-colors",
                  active
                    ? "text-foreground font-semibold"
                    : "text-foreground/45 hover:text-foreground/80 font-medium",
                )}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default SubNav;
