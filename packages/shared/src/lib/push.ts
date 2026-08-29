import { supabase } from "@shared/integrations/supabase/client";

/**
 * Web Push helpers for streak-milestone and badge-unlock notifications.
 * Uses a dedicated messaging service worker (`/push-sw.js`) that does no
 * app-shell caching, so it never interferes with page loads or previews.
 */

// VAPID application server public key — safe to ship to the browser.
export const VAPID_PUBLIC_KEY =
  "BGEUHYqubap5DNOYjywXmIU3ZE9AnG2BW9_P7Qi3L8DTMpEHqlVHJHXYrCD-948fkZphZzeJaeN__nIiYaPyvKg";

export const pushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

const urlBase64ToUint8Array = (base64: string) => {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

const registerWorker = () =>
  navigator.serviceWorker.register("/push-sw.js", { scope: "/" });

/** Is this device already subscribed (and still permitted)? */
export const getPushSubscription = async (): Promise<PushSubscription | null> => {
  if (!pushSupported() || Notification.permission !== "granted") return null;
  const reg = await navigator.serviceWorker.getRegistration("/push-sw.js");
  return (await reg?.pushManager.getSubscription()) ?? null;
};

/** Ask for permission, subscribe, and store the device against the user. */
export const enablePush = async (): Promise<{ error: string | null }> => {
  if (!pushSupported()) return { error: "unsupported" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { error: "denied" };

  const reg = await registerWorker();
  await navigator.serviceWorker.ready;

  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "signed-out" };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return { error: "invalid" };

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: auth.user.id,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent.slice(0, 300),
    },
    { onConflict: "endpoint" },
  );

  return { error: error?.message ?? null };
};

/** Unsubscribe this device and forget it server-side. */
export const disablePush = async () => {
  const sub = await getPushSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe().catch(() => undefined);
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
};
