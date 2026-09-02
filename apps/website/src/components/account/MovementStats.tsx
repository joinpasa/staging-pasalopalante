import { useMovementTotals } from "@shared/hooks/useMovementTotals";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { Skeleton } from "@shared/components/ui/skeleton";

const nf = new Intl.NumberFormat();

export default function MovementStats() {
  const { t } = useLanguage();
  const { data: totals, isLoading } = useMovementTotals();

  const stats = [
    { value: totals?.pledged ?? 0, label: t.account.movementStatsPledged },
    { value: totals?.actsToday ?? 0, label: t.account.movementStatsToday },
    { value: totals?.actsAllTime ?? 0, label: t.account.movementStatsAllTime },
  ];

  return (
    <section className="bg-background border border-border rounded-2xl p-6 md:p-8">
      <h2 className="font-serif text-2xl mb-6">{t.account.movementStatsHeading}</h2>
      {isLoading ? (
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-warm-cream rounded-xl p-4">
              <p className="font-serif text-2xl text-foreground leading-none">{nf.format(stat.value)}</p>
              <p className="mt-2 text-xs leading-snug text-foreground/60">{stat.label}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
