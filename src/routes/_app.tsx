import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { useSession } from "@/features/auth/session";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";
import { registerServiceWorker } from "@/lib/push-notifications";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

const PRODUCT_IMAGES_CACHE = [
  "/fotos de productos/mamita.png",
  "/fotos de productos/tornillos.png",
  "/fotos de productos/gordos.png",
  "/fotos de productos/largos.png",
  "/fotos de productos/minis.png",
  "/fotos de productos/rojas.png",
  "/fotos de productos/flores.png",
  "/fotos de productos/baldes.png",
  "/fotos de productos/pre rolls.png",
];

function AppLayout() {
  const { isAuthenticated, isLoading } = useSession();
  const { unreadCount } = useRealtimeNotifications();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.navigate({ to: "/login" });
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      registerServiceWorker();

      // Precarga diferida en segundo plano para no competir con las consultas iniciales de datos
      const timer = window.setTimeout(() => {
        PRODUCT_IMAGES_CACHE.forEach((src) => {
          const img = new Image();
          img.decoding = "async";
          img.src = src;
        });
      }, 1500);

      return () => window.clearTimeout(timer);
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0E14]">
        <Loader2 className="size-8 animate-spin text-[#CCFF00]" />
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
