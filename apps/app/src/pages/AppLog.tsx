import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import ShareActFlow from "@shared/components/share/ShareActFlow";
import { useLanguage } from "@shared/contexts/LanguageContext";

/**
 * In-app "log an act of kindness" screen. Keeps the user inside the standalone
 * app (no jump to the marketing site) and returns them to /app when done.
 *
 * Coming from a pass hand-off (/wave) carries a `with` param naming who was
 * just scanned (prefilled into the description) and a `toUserId` param with
 * their actual user id, so the act can be linked to them for the "thanks"
 * feature — only acts logged this way ever get a to_user_id.
 */
export default function AppLog() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const withName = searchParams.get("with")?.trim();
  const toUserId = searchParams.get("toUserId")?.trim();

  return (
    <div className="px-5 pt-5 pb-8">
      <header className="mb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/")}
          aria-label="Back"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-app-surface"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="font-sans text-lg font-bold text-foreground">
          {t.share.sectionHeading}
        </h1>
      </header>

      <ShareActFlow
        redirectTo="/"
        initialMode={withName ? "performed" : undefined}
        initialDescription={withName ? `Passed it forward to ${withName}: ` : undefined}
        toUserId={toUserId || undefined}
      />
    </div>
  );
}
