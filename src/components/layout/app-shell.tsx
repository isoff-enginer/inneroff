import type { ReactNode } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";

interface AppShellProps {
  children: ReactNode;
  unreadCount?: number;
}

export function AppShell({ children, unreadCount = 0 }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader unreadCount={unreadCount} />
        <main id="contenido" className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-7xl space-y-6">{children}</div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
