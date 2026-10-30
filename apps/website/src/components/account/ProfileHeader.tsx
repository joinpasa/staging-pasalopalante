import { useAuth } from "@shared/contexts/AuthContext";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { Button } from "@shared/components/ui/button";
import { Crown, LogOut, Settings } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useReachStats } from "@shared/hooks/useReachStats";
import { countWording } from "@shared/lib/reach";

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
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: reach } = useReachStats(user?.id);
  const reached = reach?.peopleReached ?? 0;

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
                <span className="text-terracotta/70 font-medium normal-case tracking-normal ms-1">
                  · {roleLabel.detail}
                </span>
              )}
            </span>
          )}
          {/* People reached sits right of "Member since" on wider screens and
              drops below it on phones. */}
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            {since && <p className="text-sm text-foreground/60">{t.account.memberSince} {since}</p>}
            {reach && (
              <p className="text-sm text-foreground/60">
                {since && <span className="hidden sm:inline me-3" aria-hidden="true">·</span>}
                <strong className="font-semibold text-foreground">{new Intl.NumberFormat(lang).format(reached)}</strong>{" "}
                {countWording(reached, t.account.personReached, t.account.peopleReached)}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-start gap-1">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/account/settings">
            <Settings size={16} className="me-2" />
            {t.navbar.myAccount}
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            await signOut();
            navigate("/");
          }}
        >
          <LogOut size={16} className="me-2" />
          {t.account.signOut}
        </Button>
      </div>
    </header>
  );
};

export default ProfileHeader;
