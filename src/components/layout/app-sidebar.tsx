import { Link } from "@tanstack/react-router";

import { NAV_SECTIONS, isVisibleForRole } from "@/config/navigation";
import { useSession } from "@/features/auth/session";
import { cn } from "@/lib/utils";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { role } = useSession();

  return (
    <nav aria-label="Navegación principal" className="flex flex-col gap-6 px-3 py-4">
      {NAV_SECTIONS.map((section) => {
        const items = section.items.filter((item) => isVisibleForRole(item, role));
        if (items.length === 0) return null;

        return (
          <div key={section.title}>
            <p className="px-3 pb-2 text-[11px] font-medium tracking-wider text-sidebar-foreground/50 uppercase">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {items.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    activeProps={{
                      className: cn("bg-sidebar-accent text-sidebar-accent-foreground"),
                      "aria-current": "page",
                    }}
                  >
                    <item.icon className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                    {item.placeholder ? (
                      <span className="ml-auto rounded border border-sidebar-border px-1.5 py-0.5 text-[10px] text-sidebar-foreground/50">
                        Pronto
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

export function AppSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
        <span className="flex size-7 items-center justify-center rounded-md bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
          R
        </span>
        <span className="text-sm font-semibold text-sidebar-primary">Reserva Operaciones</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <SidebarNav />
      </div>
      <div className="border-t border-sidebar-border px-5 py-4 text-[11px] text-sidebar-foreground/50">
        Fábrica → Bodega → Tiendas
      </div>
    </aside>
  );
}
