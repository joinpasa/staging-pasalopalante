import { Download } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { promptAppInstall } from "@shared/lib/installTrigger";

/** "Download App" — only ever shows the browser's install dialog. */
export default function DownloadAppButton({ className }: { className?: string }) {
  const { t } = useLanguage();

  const onClick = async () => {
    if ((await promptAppInstall()) === "unavailable") toast.error(t.howItWorks.installUnavailable);
  };

  return (
    <button type="button" onClick={onClick} className={className}>
      {t.howItWorks.appStripDownload}
      <Download size={17} />
    </button>
  );
}
