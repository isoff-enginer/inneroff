import { Link } from "@tanstack/react-router";
import { Bell, LogOut, Menu, Search, User } from "lucide-react";
import { useState } from "react";

import { SidebarNav } from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useSession } from "@/features/auth/session";
import { ROLE_LABELS } from "@/types/domain";

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AppHeader({ unreadCount = 0 }: { unreadCount?: number }) {
  const { user, role, signOut } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6">
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0">
          <SheetTitle className="px-5 pt-5 text-sm font-semibold text-sidebar-primary">
            Reserva Operaciones
          </SheetTitle>
          <div className="overflow-y-auto">
            <SidebarNav onNavigate={() => setMenuOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <Link to="/dashboard" className="flex items-center gap-2 lg:hidden" aria-label="Ir al inicio">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
          R
        </span>
      </Link>

      <div className="hidden flex-1 items-center lg:flex">
        <button
          type="button"
          className="flex h-9 w-full max-w-sm items-center gap-2 rounded-md border border-border bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-border-strong"
          aria-label="Buscar en la aplicación"
        >
          <Search className="size-4" aria-hidden="true" />
          Buscar productos, despachos, tiendas…
        </button>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="icon" asChild aria-label="Notificaciones">
          <Link to="/notifications" className="relative">
            <Bell className="size-5" />
            {unreadCount > 0 ? (
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive" />
            ) : null}
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2" aria-label="Cuenta">
              <Avatar className="size-7">
                <AvatarFallback className="text-xs">{initials(user?.fullName || "")}</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline">{user?.displayName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="text-sm font-medium">{user?.fullName}</p>
              <p className="text-xs font-normal text-muted-foreground">{role ? ROLE_LABELS[role] : ""}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile">
                <User className="size-4" aria-hidden="true" />
                Perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <button className="w-full cursor-pointer" onClick={() => signOut()}>
                <LogOut className="size-4 mr-2" aria-hidden="true" />
                Cerrar sesión
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
