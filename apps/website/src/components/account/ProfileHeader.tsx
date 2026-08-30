import { useAuth } from "@shared/contexts/AuthContext";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { Button } from "@shared/components/ui/button";
import { Crown, Settings } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  profile: {
    display_name?: string;
    email?: string;
    created_at?: string;
    help_role?: string | null;
    org_name?: string | null;
  } | null;
}

const ProfileHeader = ({ profile }: Props) => {
  const { t, lang } = useLanguage();
  const { user } = useAuth();

  const name = profile?.display_name || user?.email?.split("@")[0] || "";
  const since = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(lang === "es" ? "es" : "en", { month: "long", year: "numeric" })
    : "";

  const roleLabel = (() => {
    if (profile?.org_name) {
      return { label: t.account.roleGroupLeader, detail: profile.org_name };
    }
    switch (profile?.help_role) {
      case "champion":   return { label: t.account.roleChampion,   detail: null };
      case "ambassador": return { label: t.account.roleAmbassador, detail: null };
      case "civic":      return { label: t.account.roleCivic,      detail: null };
      case "volunteer":  return { label: t.account.roleVolunteer,  detail: null };
      default: return null;
    }
  })();

  return (
    <header className="bg-background border border-border rounded-2xl p-6 md:p-8 flex flex-wrap items-center justify-between gap-6">
      <div className="space-y-2">
        <h1 className="font-serif text-2xl md:text-3xl">{t.account.greeting.replace("{name}", name)}</h1>
        <div className="flex flex-wrap items-center gap-3">
          {roleLabel && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-terracotta/10 text-terracotta text-xs font-semibold uppercase tracking-wider">
              <Crown size={12} className="fill-current" />
              {roleLabel.label}
              {roleLabel.detail && (
                <span className="text-terracotta/70 font-medium normal-case tracking-normal ml-1">
                  · {roleLabel.detail}
                </span>
              )}
            </span>
          )}
          {since && <p className="text-sm text-foreground/60">{t.account.memberSince} {since}</p>}
        </div>
      </div>
      <Button variant="ghost" size="sm" asChild>
        <Link to="/account/settings">
          <Settings size={16} className="mr-2" />
          {t.navbar.myAccount}
        </Link>
      </Button>
    </header>
  );
};

export default ProfileHeader;
