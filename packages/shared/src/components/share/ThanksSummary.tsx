import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Flame } from "lucide-react";
import { supabase } from "@shared/integrations/supabase/client";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { Skeleton } from "@shared/components/ui/skeleton";
import { Button } from "@shared/components/ui/button";

interface Commitment {
  id: string;
  pledge_count: number;
}

interface Org {
  id: string;
  name: string;
  logo_url: string | null;
}

const ThanksSummary = ({ userId, email }: { userId: string; email: string }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [commitment, setCommitment] = useState<Commitment | null>(null);
  const [actsCount, setActsCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [org, setOrg] = useState<Org | null>(null);
  const [orgStats, setOrgStats] = useState<{ total_acts: number; total_pledged: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: c }, { count }, { data: s }, { data: m }] = await Promise.all([
        supabase
          .from("commitments")
          .select("id, pledge_count")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("acts_of_kindness")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "published"),
        supabase.rpc("user_streak", { _user_id: userId }),
        supabase
          .from("org_members")
          .select("org_id, organizations(id,name,logo_url)")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      if (cancelled) return;
      setCommitment((c as Commitment) || null);
      setActsCount(count || 0);
      setStreak(s && (s as any)[0] ? (s as any)[0].current_streak : 0);
      if (m && (m as any).organizations) {
        setOrg((m as any).organizations);
        const { data: os } = await supabase.rpc("org_stats", { _org_id: (m as any).org_id });
        if (!cancelled && os && (os as any)[0]) {
          setOrgStats({
            total_acts: (os as any)[0].total_acts,
            total_pledged: (os as any)[0].total_pledged,
          });
        }
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, email]);

  if (loading) return <Skeleton className="h-64 rounded-2xl" />;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-6 text-left">
      {commitment && (
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
            {t.share.yourPledgeLabel}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-4xl text-foreground">{commitment.pledge_count}</span>
            <span className="text-sm text-muted-foreground">acts</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
            {t.share.actsSharedLabel}
          </p>
          <div className="font-display text-3xl text-foreground">{actsCount}</div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
            {t.share.currentStreakLabel}
          </p>
          <div className="font-display text-3xl text-foreground flex items-center gap-1.5">
            <Flame size={22} className="text-terracotta" />
            {streak}
          </div>
        </div>
      </div>

      {org && (
        <div className="pt-4 border-t border-border">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
            {t.share.yourOrgLabel}
          </p>
          <div className="flex items-center gap-3">
            {org.logo_url && (
              <img src={org.logo_url} alt="" className="w-9 h-9 rounded-md object-cover" />
            )}
            <div className="flex-1">
              <div className="font-medium text-foreground">{org.name}</div>
              {orgStats && (
                <div className="text-xs text-muted-foreground">
                  {orgStats.total_acts} acts · {orgStats.total_pledged} pledged
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        <Button asChild size="sm" variant="outline">
          <Link to="/account">{t.share.viewDashboard}</Link>
        </Button>
      </div>
    </div>
  );
};

export default ThanksSummary;
