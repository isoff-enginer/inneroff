import {
  LayoutDashboard,
  Boxes,
  Truck,
  Receipt,
  Bell,
  MessageSquare,
  Settings,
  Factory,
  Warehouse,
  Store,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import type { AppRole } from "@/types/domain";

export interface NavItem {
  /** Ruta tipada de TanStack Router. */
  to: string;
  label: string;
  icon: LucideIcon;
  /** Roles con acceso visual. La seguridad real vive en Supabase (RLS). */
  roles?: AppRole[];
  /** Módulo aún sin lógica funcional. */
  placeholder?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Operación",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/inventory", label: "Inventario", icon: Boxes },
      { to: "/dispatches", label: "Despachos", icon: Truck },
      { to: "/sales", label: "Ventas / Recaudos", icon: Receipt },
    ],
  },
  {
    title: "Ubicaciones",
    items: [
      { to: "/factory", label: "Fábrica", icon: Factory, placeholder: true },
      { to: "/warehouse", label: "Bodega", icon: Warehouse, placeholder: true },
      { to: "/store", label: "Tiendas", icon: Store, placeholder: true },
    ],
  },
  {
    title: "Comunicación",
    items: [
      { to: "/notifications", label: "Notificaciones", icon: Bell },
      { to: "/messages", label: "Mensajes", icon: MessageSquare },
    ],
  },
  {
    title: "Sistema",
    items: [
      {
        to: "/admin",
        label: "Administración",
        icon: ShieldCheck,
        roles: ["boss", "boss_admin", "operations_admin"],
        placeholder: true,
      },
      { to: "/settings", label: "Configuración", icon: Settings },
    ],
  },
];

/** Navegación inferior en móvil: solo los accesos primarios. */
export const MOBILE_NAV: NavItem[] = [
  { to: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { to: "/inventory", label: "Inventario", icon: Boxes },
  { to: "/dispatches", label: "Despachos", icon: Truck },
  { to: "/sales", label: "Ventas", icon: Receipt },
  { to: "/messages", label: "Mensajes", icon: MessageSquare },
];

export function isVisibleForRole(item: NavItem, role: AppRole): boolean {
  return !item.roles || item.roles.includes(role);
}
