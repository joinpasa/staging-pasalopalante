import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { disablePush, enablePush, getPushSubscription, pushSupported } from "@shared/lib/push";
import { useLanguage } from "@shared/contexts/LanguageContext";

/**
 * Opt-in control for streak-milestone and badge-unlock push notifications.
 * Hidden entirely on browsers without Web Push (e.g. non-installed iOS Safari).
 */
export default function PushToggle() {
  const { t } = useLanguage();
  const [supported, setSupported] = useState(false);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pushSupported()) return;
    setSupported(true);
    getPushSubscription()
      .then((sub) => setOn(!!sub))
      .catch((err) => console.error("getPushSubscription failed", err));
  }, []);

  if (!supported) return null;

  const toggle = async () => {
    setBusy(true);
    try {
      if (on) {
        await disablePush();
        setOn(false);
        toast.success(t.appWidgets.milestoneAlertsOff);
      } else {
        const { error } = await enablePush();
        if (error === "denied") {
          toast.error(t.appWidgets.notificationsBlocked);
        } else if (error) {
          toast.error(t.appWidgets.couldNotEnableAlerts, { description: error });
        } else {
          setOn(true);
          toast.success(t.appWidgets.alertsEnabledToast);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={on}
      className="mt-4 flex w-full items-center gap-3 rounded-2xl bg-app-surface p-4 text-start transition-opacity disabled:opacity-60"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-app-coral-tint text-app-coral">
        {on ? <Bell size={18} /> : <BellOff size={18} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-foreground">
          {on ? t.appWidgets.alertsOn : t.appWidgets.getAlerts}
        </span>
        <span className="block text-xs text-muted-foreground">
          {t.appWidgets.alertDescription}
        </span>
      </span>
      <span className="shrink-0 text-xs font-bold text-app-coral">
        {on ? t.appWidgets.turnOff : t.appWidgets.turnOn}
      </span>
    </button>
  );
}
