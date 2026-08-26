import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import ShareActFlow from "@/components/share/ShareActFlow";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * In-app "log an act of kindness" screen. Keeps the user inside the standalone
 * app (no jump to the marketing site) and returns them to /app when done.
 */
export default function AppLog() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="px-5 pt-5 pb-8">
      <header className="mb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/app")}
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
        redirectTo="/app"
      />
    </div>
  );
}
