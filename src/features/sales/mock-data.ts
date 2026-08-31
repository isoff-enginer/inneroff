/** DATOS MOCK — SOLO UI. Reemplazar por consultas a Supabase (payments/sales). */
import type { SaleRow } from "@/types/domain";

export const MOCK_SALES: SaleRow[] = [
  { id: "s1", date: "31 ago 2026", store: "Tienda Centro", operator: "Laura Gómez", category: "Categoría A", amount: 860000, status: "confirmed" },
  { id: "s2", date: "31 ago 2026", store: "Tienda Norte", operator: "Andrés Ruiz", category: "Categoría B", amount: 420000, status: "confirmed" },
  { id: "s3", date: "30 ago 2026", store: "Tienda Centro", operator: "Laura Gómez", category: "Categoría C", amount: 1240000, status: "confirmed" },
  { id: "s4", date: "30 ago 2026", store: "Tienda Norte", operator: "Andrés Ruiz", category: "Categoría A", amount: 180000, status: "voided" },
  { id: "s5", date: "29 ago 2026", store: "Tienda Centro", operator: "Laura Gómez", category: "Categoría A", amount: 2120000, status: "confirmed" },
];
