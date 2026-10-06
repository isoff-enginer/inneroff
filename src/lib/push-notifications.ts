import { supabase } from "@/integrations/supabase/client";

export interface PushStatus {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
}

/**
 * Register Service Worker for background push notifications
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    return registration;
  } catch (err) {
    console.warn("[Push] Service worker registration failed:", err);
    return null;
  }
}

/**
 * Request notification permission and save subscription to Supabase
 */
export async function requestAndSubscribePush(userId: string): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return false;
    }

    const registration = await registerServiceWorker();
    if (!registration) {
      return false;
    }

    let subscription = await registration.pushManager.getSubscription();

    // If no existing push subscription and browser supports PushManager
    if (!subscription) {
      try {
        // Try subscribing without applicationServerKey or with VAPID if present
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: undefined,
        });
      } catch (subErr) {
        console.warn("[Push] PushManager subscription fallback:", subErr);
      }
    }

    if (subscription && userId) {
      const p256dh = subscription.toJSON().keys?.p256dh || "";
      const auth = subscription.toJSON().keys?.auth || "";

      await supabase.from("push_subscriptions").upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: p256dh,
        auth: auth,
        user_agent: navigator.userAgent,
        is_active: true,
      }, { onConflict: "endpoint" });
    }

    return true;
  } catch (err) {
    console.error("[Push] Error subscribing to push notifications:", err);
    return false;
  }
}

/**
 * Trigger immediate browser notification if permitted
 */
export function showLocalNotification(title: string, options?: NotificationOptions & { url?: string }) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    const notification = new Notification(title, {
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      ...options,
    });

    if (options?.url) {
      notification.onclick = () => {
        window.focus();
        window.location.href = options.url!;
      };
    }
  } catch (e) {
    // Fallback via Service Worker
    navigator.serviceWorker?.ready.then((reg) => {
      reg.showNotification(title, options);
    });
  }
}
