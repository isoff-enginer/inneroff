import type { ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";

interface AppShellProps {
  children: ReactNode;
  unreadCount?: number;
}

export function AppShell({ children, unreadCount = 0 }: AppShellProps) {
  const location = useLocation();
  const isDashboard = location.pathname === "/" || location.pathname === "/dashboard";

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {!isDashboard && <AppHeader unreadCount={unreadCount} />}
        <main id="contenido" className={`flex-1 ${!isDashboard ? 'px-4 py-6 sm:px-6 lg:px-8 lg:py-8' : ''}`}>
          <div className="mx-auto w-full max-w-7xl h-full">{children}</div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
