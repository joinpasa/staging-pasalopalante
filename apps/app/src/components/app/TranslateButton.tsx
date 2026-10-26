import { Languages, Loader2 } from "lucide-react";
import { cn } from "@shared/lib/utils";
import { useLanguage } from "@shared/contexts/LanguageContext";

/** Small icon that flips an act's text between original and translated. */
export default function TranslateButton({
  translated,
  loading,
  onClick,
}: {
  translated: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  const { t } = useLanguage();
  const label = translated ? t.appCommon.showOriginal : t.appCommon.translate;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded-full transition-colors",
        translated ? "bg-app-coral-tint text-app-coral" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Languages size={14} />}
    </button>
  );
}
