import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut, Smartphone } from "lucide-react";
import { useAuth } from "@shared/contexts/AuthContext";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { supabase } from "@shared/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProfileSettingsCard from "@/components/account/ProfileSettingsCard";
import SetPasswordCard from "@/components/account/SetPasswordCard";
import RemindersCard from "@/components/account/RemindersCard";
import { Button } from "@shared/components/ui/button";
import { Skeleton } from "@shared/components/ui/skeleton";

/**
 * Account settings: profile, password, notifications, and sign out — split
 * out from the activity dashboard at /account so that page stays focused on
 * acts/badges/commitment, and this one on managing the account itself.
 */
interface Profile {
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  country?: string | null;
  public_name_mode?: string | null;
  custom_display_name?: string | null;
  display_name?: string | null;
}

const AccountSettingsPage = () => {
  const { t } = useLanguage();
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileRefresh, setProfileRefresh] = useState(0);

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
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
      <div className="max-w-3xl mx-auto px-6 pt-28 md:pt-32 space-y-8">
        <button
          type="button"
          onClick={() => navigate("/account")}
          className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-foreground"
        >
          <ArrowLeft size={16} />
          {t.account.backToDashboard}
        </button>

        <h1 className="font-serif text-3xl">{t.navbar.myAccount}</h1>

        {profileLoading ? (
          <Skeleton className="h-40 w-full rounded-2xl" />
        ) : (
          <ProfileSettingsCard
            userId={user.id}
            profile={profile}
            onSaved={() => setProfileRefresh((n) => n + 1)}
          />
        )}

        <SetPasswordCard />

        <RemindersCard userId={user.id} email={profile?.email || user.email || ""} />

        <div className="bg-card border border-border rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Smartphone className="text-primary" size={20} />
            <div>
              <h3 className="font-serif text-lg text-foreground">{t.account.downloadApp}</h3>
              <p className="text-sm text-foreground/60">app.pasalopalante.com</p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <a href="https://app.pasalopalante.com" target="_blank" rel="noopener noreferrer">
              {t.account.downloadApp}
            </a>
          </Button>
        </div>

        <Button
          variant="ghost"
          onClick={async () => {
            await signOut();
            navigate("/");
          }}
        >
          <LogOut size={16} className="mr-2" />
          {t.account.signOut}
        </Button>
      </div>
      <Footer />
    </div>
  );
};

export default AccountSettingsPage;
