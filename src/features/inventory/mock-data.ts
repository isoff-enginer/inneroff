/** DATOS MOCK — SOLO UI. Reemplazar por consultas a Supabase. */
import type { InventoryRow } from "@/types/domain";

export const MOCK_INVENTORY: InventoryRow[] = [
  { id: "i1", product: "Caja 500g", category: "Categoría A", locationType: "warehouse", locationName: "Bodega Principal", quantity: 420, unitValue: 12000 },
  { id: "i2", product: "Caja 1kg", category: "Categoría A", locationType: "warehouse", locationName: "Bodega Principal", quantity: 180, unitValue: 21000 },
  { id: "i3", product: "Bolsa 250g", category: "Categoría B", locationType: "store", locationName: "Tienda Centro", quantity: 64, unitValue: 7500 },
  { id: "i4", product: "Bolsa 250g", category: "Categoría B", locationType: "store", locationName: "Tienda Norte", quantity: 38, unitValue: 7500 },
  { id: "i5", product: "Caja 500g", category: "Categoría A", locationType: "factory", locationName: "Fábrica Prueba", quantity: 940, unitValue: 12000 },
  { id: "i6", product: "Display 12u", category: "Categoría C", locationType: "warehouse", locationName: "Bodega Principal", quantity: 22, unitValue: 96000 },
];

export const MOCK_CATEGORIES = ["Categoría A", "Categoría B", "Categoría C"];
export const MOCK_LOCATIONS = [
  "Fábrica Prueba",
  "Bodega Principal",
  "Tienda Centro",
  "Tienda Norte",
];
