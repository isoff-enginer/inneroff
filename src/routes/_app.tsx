import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { useSession } from "@/features/auth/session";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";
import { registerServiceWorker, requestAndSubscribePush } from "@/lib/push-notifications";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, isAuthenticated, isLoading } = useSession();
  const { unreadCount } = useRealtimeNotifications();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.navigate({ to: "/login" });
    }
  }, [isLoading, isAuthenticated, router]);

  // Request browser notification permission once upon entering
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      registerServiceWorker();

      // Only prompt if not decided yet
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
        requestAndSubscribePush(user.id);
      }
    }
  }, [isAuthenticated, user?.id]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return (
    <AppShell unreadCount={unreadCount}>
      <Outlet />
    </AppShell>
  );
}
