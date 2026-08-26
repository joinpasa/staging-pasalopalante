import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const [people, setPeople] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("pledge_totals")
        .select("total_pledged_acts, total_commitments")
        .maybeSingle();
      setActs(Number(data?.total_pledged_acts ?? 0));
      setPeople(Number(data?.total_commitments ?? 0));
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
          {people === null ? "—" : formatNumber(people, locale)}
        </div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
          {t.commit.statPeople}
        </div>
      </div>
    </div>
  );
}
