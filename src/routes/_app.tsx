import { createFileRoute, Outlet } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/app-shell";
import { SessionProvider } from "@/features/auth/session";
import { MOCK_NOTIFICATIONS } from "@/features/dashboard/mock-data";

/**
 * Layout de aplicación (App Shell). Cuando se conecte Supabase Auth, el gate
 * de sesión debe vivir en `src/routes/_authenticated/route.tsx` (gestionado por
 * la integración) y este layout mantendrá únicamente la estructura visual.
 */
export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const unread = MOCK_NOTIFICATIONS.filter((n) => !n.read).length;

  return (
    <SessionProvider>
      <AppShell unreadCount={unread}>
        <Outlet />
      </AppShell>
    </SessionProvider>
  );
}
