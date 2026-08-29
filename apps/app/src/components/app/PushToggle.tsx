import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { disablePush, enablePush, getPushSubscription, pushSupported } from "@shared/lib/push";

/**
 * Opt-in control for streak-milestone and badge-unlock push notifications.
 * Hidden entirely on browsers without Web Push (e.g. non-installed iOS Safari).
 */
export default function PushToggle() {
  const [supported, setSupported] = useState(false);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pushSupported()) return;
    setSupported(true);
    getPushSubscription().then((sub) => setOn(!!sub));
  }, []);

  if (!supported) return null;

  const toggle = async () => {
    setBusy(true);
    try {
      if (on) {
        await disablePush();
        setOn(false);
        toast.success("Milestone alerts turned off");
      } else {
        const { error } = await enablePush();
        if (error === "denied") {
          toast.error("Notifications are blocked in your browser settings");
        } else if (error) {
          toast.error("Could not turn on alerts", { description: error });
        } else {
          setOn(true);
          toast.success("You'll get a nudge for streaks and new badges");
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
          {on ? "Milestone alerts are on" : "Get milestone alerts"}
        </span>
        <span className="block text-xs text-muted-foreground">
          A gentle ping when you hit a streak or unlock a badge.
        </span>
      </span>
      <span className="shrink-0 text-xs font-bold text-app-coral">{on ? "Turn off" : "Turn on"}</span>
    </button>
  );
}
