import { useEffect, useState } from "react";
import { supabase } from "@shared/integrations/supabase/client";
import { useLanguage } from "@shared/contexts/LanguageContext";

interface Props {
  className?: string;
  refreshKey?: number;
}

function formatNumber(n: number, locale: string) {
  try {
    return new Intl.NumberFormat(locale).format(n);
  } catch {
    return n.toLocaleString();
  }
}

export default function PledgeCounter({ className = "", refreshKey = 0 }: Props) {
  const { lang, t } = useLanguage();
  const [acts, setActs] = useState<number | null>(null);
  // A pledger headcount (previously shown here as "Global pledges") reads as
  // a small number next to a six-figure acts-pledged count and undersells
  // how much is actually happening — this is the count of acts people have
  // actually logged instead, another big "acts" number alongside the
  // pledged one rather than a much smaller people-count.
  const [actsLogged, setActsLogged] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: pledgeData }, { count: loggedCount }] = await Promise.all([
        supabase.from("pledge_totals").select("total_pledged_acts").maybeSingle(),
        supabase
          .from("acts_of_kindness")
          .select("*", { count: "exact", head: true })
          .eq("status", "published"),
      ]);
      setActs(Number(pledgeData?.total_pledged_acts ?? 0));
      setActsLogged(Number(loggedCount ?? 0));
    })();
  }, [refreshKey]);

  const locale = lang === "es" ? "es-PR" : "en-US";

  return (
    <div className={`flex items-center justify-center gap-8 text-center ${className}`}>
      <div>
        <div className="font-display text-3xl md:text-4xl text-primary">
          {acts === null ? "—" : formatNumber(acts, locale)}
        </div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
          {t.commit.statActs}
        </div>
      </div>
      <div className="h-10 w-px bg-border" />
      <div>
        <div className="font-display text-3xl md:text-4xl text-primary">
          {actsLogged === null ? "—" : formatNumber(actsLogged, locale)}
        </div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
          {t.commit.statActsLogged}
        </div>
      </div>
    </div>
  );
}
