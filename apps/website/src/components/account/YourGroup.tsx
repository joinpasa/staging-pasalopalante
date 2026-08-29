import { useEffect, useState } from "react";
import { supabase } from "@shared/integrations/supabase/client";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { Skeleton } from "@shared/components/ui/skeleton";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { toast } from "sonner";

interface Org {
  id: string;
  name: string;
  logo_url: string | null;
  chapter: string | null;
}

interface Stats {
  member_count: number;
  total_acts: number;
  total_pledged: number;
}

interface GroupCommitment {
  id: string;
  pledge_count: number;
}

const StatGrid = ({ stats, t }: { stats: Stats; t: any }) => (
  <div className="grid grid-cols-3 gap-4 text-center">
    <div>
      <div className="font-serif text-2xl">{stats.member_count}</div>
      <div className="text-xs text-foreground/60 uppercase tracking-wide">{t.account.members}</div>
    </div>
    <div>
      <div className="font-serif text-2xl">{stats.total_acts}</div>
      <div className="text-xs text-foreground/60 uppercase tracking-wide">{t.account.acts}</div>
    </div>
    <div>
      <div className="font-serif text-2xl">{stats.total_pledged}</div>
      <div className="text-xs text-foreground/60 uppercase tracking-wide">{t.account.pledges}</div>
    </div>
  </div>
);

const YourGroup = ({ userId }: { userId: string }) => {
  const { t } = useLanguage();
  const [org, setOrg] = useState<Org | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [parentStats, setParentStats] = useState<Stats | null>(null);
  const [isLeader, setIsLeader] = useState(false);
  const [commitment, setCommitment] = useState<GroupCommitment | null>(null);
  const [editingPledge, setEditingPledge] = useState(false);
  const [draftPledge, setDraftPledge] = useState(100);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: m } = await supabase
        .from("org_members")
        .select("org_id, is_leader, organizations(id,name,logo_url,chapter)")
        .eq("user_id", userId)
        .maybeSingle();
      if (m && (m as any).organizations) {
        const o = (m as any).organizations as Org;
        setOrg(o);
        setIsLeader(!!(m as any).is_leader);
        const { data: s } = await supabase.rpc("org_stats", { _org_id: (m as any).org_id });
        if (s && s[0]) setStats(s[0] as Stats);

        const { data: gc } = await supabase
          .from("commitments")
          .select("id, pledge_count")
          .eq("type", "organization")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (gc) {
          setCommitment(gc as GroupCommitment);
          setDraftPledge((gc as GroupCommitment).pledge_count);
        }

        // If this is a chapter, also fetch parent (same name, no chapter)
        if (o.chapter) {
          const { data: parent } = await supabase
            .from("organizations")
            .select("id")
            .ilike("name", o.name)
            .is("chapter", null)
            .maybeSingle();
          if (parent?.id) {
            const { data: ps } = await supabase.rpc("org_stats", { _org_id: parent.id });
            if (ps && ps[0]) setParentStats(ps[0] as Stats);
          }
        }
      }
      setLoading(false);
    })();
  }, [userId]);

  const saveGroupPledge = async () => {
    if (!commitment || draftPledge < 100) return;
    setSaving(true);
    const { error } = await supabase
      .from("commitments")
      .update({ pledge_count: draftPledge })
      .eq("id", commitment.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t.account.saved);
    setCommitment({ ...commitment, pledge_count: draftPledge });
    setEditingPledge(false);
    if (org) {
      const { data: s } = await supabase.rpc("org_stats", { _org_id: org.id });
      if (s && s[0]) setStats(s[0] as Stats);
    }
  };

  if (loading) return <Skeleton className="h-32 rounded-2xl" />;
  if (!org) return null;

  return (
    <section className="bg-background border border-border rounded-2xl p-6 md:p-8">
      <h2 className="font-serif text-2xl mb-6">{t.account.groupHeading}</h2>
      <div className="flex items-center gap-4 mb-6">
        {org.logo_url && <img src={org.logo_url} alt="" className="w-14 h-14 rounded-lg object-cover" />}
        <div>
          <div className="font-serif text-xl">{org.name}</div>
          {org.chapter && <div className="text-sm text-foreground/60">{org.chapter}</div>}
          {isLeader && <div className="text-xs uppercase tracking-wide text-terracotta mt-1">{t.account.leaderRole}</div>}
        </div>
      </div>
      {stats && (
        <div className="space-y-5">
          <div>
            {parentStats && (
              <div className="text-xs uppercase tracking-wide text-foreground/50 mb-2">
                {t.account.yourChapter}
              </div>
            )}
            <StatGrid stats={stats} t={t} />
          </div>
          {parentStats && (
            <div className="pt-4 border-t border-border">
              <div className="text-xs uppercase tracking-wide text-foreground/50 mb-2">
                {t.account.wholeOrg}
              </div>
              <StatGrid stats={parentStats} t={t} />
            </div>
          )}
          {isLeader && commitment && (
            <div className="pt-4 border-t border-border space-y-3">
              <div className="text-xs uppercase tracking-wide text-foreground/50">
                {t.account.groupPledgeHeading}
              </div>
              {editingPledge ? (
                <div className="flex flex-wrap gap-2 items-center">
                  <Input
                    type="number"
                    min={100}
                    max={1000000000}
                    value={draftPledge}
                    onChange={(e) => setDraftPledge(Math.max(100, parseInt(e.target.value || "100", 10)))}
                    className="w-36"
                  />
                  <Button size="sm" onClick={saveGroupPledge} disabled={saving}>{t.account.save}</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditingPledge(false); setDraftPledge(commitment.pledge_count); }}>{t.account.cancel}</Button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="font-serif text-2xl">{commitment.pledge_count}</div>
                  <Button size="sm" variant="outline" onClick={() => setEditingPledge(true)}>{t.account.modify}</Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default YourGroup;
