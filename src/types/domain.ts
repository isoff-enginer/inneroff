/**
 * Tipos de dominio del frontend.
 *
 * Estos tipos describen la forma que la UI espera. Los tipos reales de la base
 * de datos viven en `src/integrations/supabase/types.ts` (fuente de verdad) y
 * se mapearán a estos tipos en la capa de servicios cuando se conecte la lógica.
 */

/** Roles de aplicación. La autorización real se aplica en Supabase (RLS). */
export type AppRole =
  | "boss"
  | "boss_admin"
  | "operations_admin"
  | "operator"
  | "factory"
  | "warehouse"
  | "store";

export const ROLE_LABELS: Record<AppRole, string> = {
  boss: "Dirección",
  boss_admin: "Administración general",
  operations_admin: "Operador administrativo",
  operator: "Operador",
  factory: "Fábrica",
  warehouse: "Bodega",
  store: "Tienda",
};

export type LocationType = "factory" | "warehouse" | "store";

export interface SessionUser {
  id: string;
  fullName: string;
  displayName?: string;
  email?: string;
  role: AppRole;
  avatarUrl?: string;
}

export type DispatchStatus = "draft" | "pending" | "dispatched" | "received" | "cancelled";

export interface DispatchSummary {
  id: string;
  number: number;
  status: DispatchStatus;
  fromName: string;
  fromType: LocationType;
  toName: string;
  toType: LocationType;
  totalValue: number;
  date: string;
}

export interface InventoryRow {
  id: string;
  product: string;
  category: string;
  locationType: LocationType;
  locationName: string;
  quantity: number;
  unitValue: number;
}

export type PaymentStatus = "confirmed" | "voided";

export interface SaleRow {
  id: string;
  date: string;
  store: string;
  operator: string;
  category: string;
  amount: number;
  status: PaymentStatus;
}

export type NotificationKind = "dispatch" | "receipt" | "payment" | "message" | "system";

export interface NotificationItemData {
  id: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  createdAt: string;
  read: boolean;
  reference?: string;
}

export interface ConversationSummary {
  id: string;
  name: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  author: string;
  outgoing: boolean;
  body: string;
  sentAt: string;
}
