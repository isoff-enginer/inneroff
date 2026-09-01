import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { useSession } from "@/features/auth/session";
import { MOCK_NOTIFICATIONS } from "@/features/dashboard/mock-data";
import { DeviceProtectionOverlay } from "@/features/devices/components/DeviceProtectionOverlay";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { isAuthenticated, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.navigate({ to: "/login" });
    }
  }, [isLoading, isAuthenticated, router]);

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

  const unread = MOCK_NOTIFICATIONS.filter((n) => !n.read).length;

  return (
    <DeviceProtectionOverlay>
      <AppShell unreadCount={unread}>
        <Outlet />
      </AppShell>
    </DeviceProtectionOverlay>
  );
}
