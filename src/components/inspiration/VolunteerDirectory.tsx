import { ExternalLink } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { volunteerDirectories } from "@/data/volunteerDirectories";

export default function VolunteerDirectory() {
  const { t, lang } = useLanguage();

  return (
    <section className="section-padding section-spacing bg-warm-cream">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.3em] text-primary font-semibold mb-4">
            {t.inspiration.volunteerEyebrow}
          </p>
          <h2 className="headline-xl text-foreground mb-4">
            {t.inspiration.volunteerHeading}
          </h2>
          <p className="body-lg text-muted-foreground max-w-2xl mx-auto">
            {t.inspiration.volunteerBody}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {volunteerDirectories.map((s) => {
            const host = new URL(s.url).hostname;
            const favicon = `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
            return (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-4 p-5 rounded-2xl bg-card border border-border hover:border-primary hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-warm-cream flex items-center justify-center overflow-hidden shrink-0 border border-border">
                  <img
                    src={favicon}
                    alt=""
                    className="w-7 h-7"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                      const sibling = e.currentTarget.nextElementSibling as HTMLElement | null;
                      if (sibling) sibling.style.display = "flex";
                    }}
                  />
                  <span
                    className="hidden w-full h-full items-center justify-center text-primary font-semibold"
                    style={{ fontFamily: "'DM Serif Display', serif" }}
                  >
                    {s.name.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3
                      className="text-lg text-foreground group-hover:text-primary transition-colors truncate"
                      style={{ fontFamily: "'DM Serif Display', serif" }}
                    >
                      {s.name}
                    </h3>
                    <ExternalLink
                      size={14}
                      className="text-muted-foreground group-hover:text-primary shrink-0"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {lang === "es" ? s.blurb_es : s.blurb_en}
                  </p>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
