import { Download } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { getInstallPlatform, promptAppInstall, type InstallPlatform } from "@shared/lib/installTrigger";

/**
 * "Download App" — shows the browser's one-tap install dialog. When the
 * browser doesn't offer one (iPhone, Safari, Firefox, in-app browsers, or
 * right after the app was uninstalled), it explains the manual way for this
 * device and browser instead.
 */
export default function DownloadAppButton({ className }: { className?: string }) {
  const { t } = useLanguage();

  const onClick = async () => {
    if ((await promptAppInstall()) !== "unavailable") return;
    const steps: Record<InstallPlatform, string> = {
      "in-app": t.howItWorks.installInAppBrowser,
      ios: t.howItWorks.installIos,
      android: t.howItWorks.installAndroid,
      "mac-safari": t.howItWorks.installMacSafari,
      desktop: t.howItWorks.installDesktop,
      unsupported: t.howItWorks.installUnsupported,
    };
    toast(steps[getInstallPlatform()], { duration: 10000 });
  };

  return (
    <button type="button" onClick={onClick} className={className}>
      {t.howItWorks.appStripDownload}
      <Download size={17} />
    </button>
  );
}
