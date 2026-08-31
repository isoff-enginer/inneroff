/** DATOS MOCK — SOLO UI. Reemplazar por consultas a Supabase. */
import type { DispatchStatus, DispatchSummary } from "@/types/domain";
import type { StatusTone } from "@/components/common/status-badge";

export const DISPATCH_STATUS_LABELS: Record<DispatchStatus, string> = {
  draft: "Borrador",
  pending: "Pendiente",
  dispatched: "Despachado",
  received: "Recibido",
  cancelled: "Cancelado",
};

export const DISPATCH_STATUS_TONES: Record<DispatchStatus, StatusTone> = {
  draft: "neutral",
  pending: "warning",
  dispatched: "info",
  received: "success",
  cancelled: "danger",
};

export const MOCK_DISPATCHES: DispatchSummary[] = [
  { id: "d-003", number: 3, status: "dispatched", fromName: "Fábrica Prueba", fromType: "factory", toName: "Bodega Principal", toType: "warehouse", totalValue: 1000000, date: "31 ago 2026" },
  { id: "d-002", number: 2, status: "received", fromName: "Bodega Principal", fromType: "warehouse", toName: "Tienda Centro", toType: "store", totalValue: 640000, date: "30 ago 2026" },
  { id: "d-001", number: 1, status: "pending", fromName: "Bodega Principal", fromType: "warehouse", toName: "Tienda Norte", toType: "store", totalValue: 320000, date: "30 ago 2026" },
  { id: "d-000", number: 0, status: "cancelled", fromName: "Fábrica Prueba", fromType: "factory", toName: "Bodega Principal", toType: "warehouse", totalValue: 150000, date: "28 ago 2026" },
];
