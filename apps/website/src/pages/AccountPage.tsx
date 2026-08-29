import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@shared/contexts/AuthContext";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { supabase } from "@shared/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProfileHeader from "@/components/account/ProfileHeader";
import YourActs from "@/components/account/YourActs";
import InspirationCard from "@/components/account/InspirationCard";
import YourCommitment from "@/components/account/YourCommitment";
import StreaksBadges from "@/components/account/StreaksBadges";
import RemindersCard from "@/components/account/RemindersCard";
import YourGroup from "@/components/account/YourGroup";
import YourInvitations from "@/components/account/YourInvitations";
import ProfileSettingsCard from "@/components/account/ProfileSettingsCard";
import SetPasswordCard from "@/components/account/SetPasswordCard";
import { Skeleton } from "@shared/components/ui/skeleton";

const AccountPage = () => {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileRefresh, setProfileRefresh] = useState(0);

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (searchParams.get("committed") === "1") {
      toast.success(t.commit.thanks, { description: t.commit.thanksBody });
      searchParams.delete("committed");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, t]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      // Safety net: heal any acts/commitments that came in unlinked
      // (e.g. submitted before sign-up). The DB also has a trigger that
      // auto-links on insert; this covers anything legacy.
      try { await supabase.rpc("claim_my_acts"); } catch { /* non-fatal */ }
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) {
        setProfile(data);
        setProfileLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, profileRefresh]);


  // Flush any signup consent stashed in sessionStorage during /auth → magic link → /account.
  useEffect(() => {
    if (!user) return;
    const raw = sessionStorage.getItem("ppl_pending_signup_consent");
    if (!raw) return;
    let parsed: {
      email?: string;
      terms_version?: string;
      privacy_version?: string;
      terms_major?: number;
      privacy_major?: number;
      reminders?: boolean;
    } | null = null;
    try { parsed = JSON.parse(raw); } catch { /* ignore */ }
    if (!parsed) { sessionStorage.removeItem("ppl_pending_signup_consent"); return; }
    (async () => {
      try {
        await supabase.from("profiles").update({
          terms_version_accepted: parsed.terms_version ?? null,
          terms_major_accepted: parsed.terms_major ?? null,
          privacy_version_accepted: parsed.privacy_version ?? null,
          privacy_major_accepted: parsed.privacy_major ?? null,
        }).eq("user_id", user.id);
        if (parsed.reminders) {
          // Default daily reminder at 09:00 in their stored timezone.
          await supabase.from("reminders").insert({
            user_id: user.id,
            channel: "email",
            frequency: "daily",
            send_time: "09:00:00",
            enabled: true,
          });
        }
      } catch (e) {
        console.error("flush signup consent failed", e);
      } finally {
        sessionStorage.removeItem("ppl_pending_signup_consent");
      }
    })();
  }, [user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-warm-cream flex items-center justify-center">
        <div className="text-foreground/60">…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-cream pb-32">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 pt-28 md:pt-32 space-y-8">
        {profileLoading ? (
          <Skeleton className="h-24 w-full rounded-2xl" />
        ) : (
          <ProfileHeader profile={profile} />
        )}

        <StreaksBadges userId={user.id} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <InspirationCard />
            <YourActs userId={user.id} />
            <YourCommitment userId={user.id} email={profile?.email || user.email || ""} />
            {!profileLoading && (
              <ProfileSettingsCard
                userId={user.id}
                profile={profile}
                onSaved={() => setProfileRefresh((n) => n + 1)}
              />
            )}
          </div>
          <div className="space-y-8">
            <YourGroup userId={user.id} />
            <YourInvitations userId={user.id} />
            <RemindersCard userId={user.id} email={profile?.email || user.email || ""} />
            <SetPasswordCard />
          </div>
        </div>

        <p className="text-center text-xs text-foreground/50 pt-8">{t.account.footerNote}</p>
      </div>
      <Footer />
    </div>
  );
};

export default AccountPage;
