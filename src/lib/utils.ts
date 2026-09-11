import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getRoleLabel(role: string | undefined): string {
  if (!role) return "Usuario";
  switch (role) {
    case "boss": return "Jefe";
    case "boss_admin": return "Jefe administrativo";
    case "operations_admin": return "Operaciones";
    case "factory": return "Fábrica";
    case "warehouse": return "Bodega";
    case "store": return "Tienda";
    default: return role;
  }
}
