import {
  Home,
  Package,
  Send,
  Wallet,
  Bell,
  MessageCircle,
  Settings,
  Factory,
  Archive,
  Store,
  Shield,
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
      { to: "/dashboard", label: "Dashboard", icon: Home },
      { to: "/inventory", label: "Inventario", icon: Package },
      { to: "/dispatches", label: "Despachos", icon: Send },
      { to: "/sales", label: "Ventas / Recaudos", icon: Wallet },
    ],
  },
  {
    title: "Ubicaciones",
    items: [
      { to: "/factory", label: "Fábrica", icon: Factory, placeholder: true },
      { to: "/warehouse", label: "Bodega", icon: Archive, placeholder: true },
      { to: "/store", label: "Tiendas", icon: Store, placeholder: true },
    ],
  },
  {
    title: "Comunicación",
    items: [
      { to: "/notifications", label: "Notificaciones", icon: Bell },
      { to: "/messages", label: "Mensajes", icon: MessageCircle },
    ],
  },
  {
    title: "Sistema",
    items: [
      {
        to: "/admin",
        label: "Administración",
        icon: Shield,
        roles: ["boss", "boss_admin", "operations_admin"],
        placeholder: true,
      },
      { to: "/settings", label: "Configuración", icon: Settings },
    ],
  },
];

/** Navegación inferior en móvil: solo los accesos primarios. */
export const MOBILE_NAV: NavItem[] = [
  { to: "/dashboard", label: "Inicio", icon: Home },
  { to: "/inventory", label: "Inventario", icon: Package },
  { to: "/dispatches", label: "Despachos", icon: Send },
  { to: "/sales", label: "Ventas", icon: Wallet },
  { to: "/messages", label: "Mensajes", icon: MessageCircle },
];

export function isVisibleForRole(item: NavItem, role: AppRole): boolean {
  return !item.roles || item.roles.includes(role);
}
