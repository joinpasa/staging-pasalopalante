import { useLanguage } from "@shared/contexts/LanguageContext";
import { usePartnerDirectory } from "@/hooks/usePartnerDirectory";

const PartnersMarquee = () => {
  const { t } = useLanguage();
  const { data: partners } = usePartnerDirectory();

  // Dark-flagged logos are made for a dark background (see PartnersPage) —
  // this strip only has a light one, so they'd render invisible here.
  const logos = (partners ?? []).filter((p) => p.logoUrl && !p.dark);

  if (logos.length === 0) return null;

  return (
    <section className="bg-background border-y border-border py-7">
      <div className="max-w-6xl mx-auto section-padding">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-5">
          {t.partnersMarquee.heading}
        </p>
        <div className="overflow-hidden">
          <div className="flex w-max items-center gap-14 animate-marquee">
            {[...logos, ...logos].map((partner, i) => (
              <img
                key={`${partner.id}-${i}`}
                src={partner.logoUrl!}
                alt={partner.name}
                loading="lazy"
                className="h-9 w-auto max-w-[120px] shrink-0 object-contain opacity-80 grayscale transition-all hover:opacity-100 hover:grayscale-0"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PartnersMarquee;
