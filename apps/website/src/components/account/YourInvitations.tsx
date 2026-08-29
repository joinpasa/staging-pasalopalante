import { useEffect, useState } from "react";
import { Copy, Check, Users } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@shared/integrations/supabase/client";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { useReferralCode } from "@/hooks/useReferralCode";
import { siteOrigin } from "@shared/lib/referral";
import { Skeleton } from "@shared/components/ui/skeleton";

interface Stats {
  joined_count: number;
  pledge_total: number;
  acts_count: number;
}

const YourInvitations = ({ userId }: { userId: string }) => {
  const { t } = useLanguage();
  const code = useReferralCode(userId);
  const [stats, setStats] = useState<Stats | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc("my_referral_stats");
      if (cancelled) return;
      const row = Array.isArray(data) ? data[0] : null;
      setStats(
        row
          ? {
              joined_count: Number(row.joined_count) || 0,
              pledge_total: Number(row.pledge_total) || 0,
              acts_count: Number(row.acts_count) || 0,
            }
          : { joined_count: 0, pledge_total: 0, acts_count: 0 },
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const inviteLink = code ? `${siteOrigin()}/wave?r=${code}` : "";

  async function copyLink() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success(t.account.invitesCopied);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t.share.shareDialog.shareFailed);
    }
  }

  const rows: { label: string; value: number }[] = [
    { label: t.account.invitesJoined, value: stats?.joined_count ?? 0 },
    { label: t.account.invitesPledges, value: stats?.pledge_total ?? 0 },
    { label: t.account.invitesActs, value: stats?.acts_count ?? 0 },
  ];

  return (
    <section className="bg-background border border-border rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users size={18} className="text-terracotta" />
        <h2 className="font-serif text-xl">{t.account.invitesHeading}</h2>
      </div>

      {stats === null ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : (
        <>
          <div className="space-y-2">
            {rows.map((r) => (
              <div
                key={r.label}
                className="flex items-baseline justify-between gap-4 border-b border-border/60 last:border-0 py-2"
              >
                <span className="text-sm text-foreground/70">{r.label}</span>
                <span className="font-serif text-2xl leading-none">{r.value}</span>
              </div>
            ))}
          </div>

          {stats.joined_count === 0 && (
            <p className="text-xs text-foreground/60 mt-4 leading-relaxed">
              {t.account.invitesEmpty}
            </p>
          )}
        </>
      )}

      {inviteLink && (
        <div className="mt-5">
          <p className="text-xs text-foreground/60 mb-2">{t.account.invitesLinkHint}</p>
          <button
            type="button"
            onClick={copyLink}
            className="w-full flex items-center justify-between gap-3 rounded-xl border border-border bg-warm-cream px-3 py-2 text-left hover:border-primary transition-colors"
          >
            <span className="text-xs text-foreground/80 truncate">{inviteLink}</span>
            {copied ? (
              <Check size={16} className="text-primary shrink-0" />
            ) : (
              <Copy size={16} className="text-foreground/60 shrink-0" />
            )}
          </button>
        </div>
      )}
    </section>
  );
};

export default YourInvitations;
