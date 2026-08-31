/**
 * DATOS MOCK — SOLO UI.
 * No mezclar con servicios reales. Reemplazar por consultas a Supabase
 * (server functions) cuando se implemente la lógica funcional.
 */
import type { DispatchSummary, NotificationItemData } from "@/types/domain";

export const MOCK_STATS = [
  { label: "Ventas del día", value: "$4.820.000", trend: { value: "12,4%", direction: "up" as const }, hint: "vs. ayer" },
  { label: "Inventario total", value: "$18.240.000", trend: { value: "3,1%", direction: "down" as const }, hint: "valorizado" },
  { label: "Despachos activos", value: "7", hint: "3 en tránsito" },
  { label: "Alertas", value: "2", hint: "requieren revisión" },
];

export const MOCK_RECENT_DISPATCHES: DispatchSummary[] = [
  {
    id: "d-003",
    number: 3,
    status: "dispatched",
    fromName: "Fábrica Prueba",
    fromType: "factory",
    toName: "Bodega Principal",
    toType: "warehouse",
    totalValue: 1000000,
    date: "31 ago 2026, 09:12",
  },
  {
    id: "d-002",
    number: 2,
    status: "received",
    fromName: "Bodega Principal",
    fromType: "warehouse",
    toName: "Tienda Centro",
    toType: "store",
    totalValue: 640000,
    date: "30 ago 2026, 16:40",
  },
  {
    id: "d-001",
    number: 1,
    status: "pending",
    fromName: "Bodega Principal",
    fromType: "warehouse",
    toName: "Tienda Norte",
    toType: "store",
    totalValue: 320000,
    date: "30 ago 2026, 11:05",
  },
];

export const MOCK_ACTIVITY = [
  { id: "a1", text: "Fábrica Prueba registró producción de 240 unidades", at: "Hace 5 minutos" },
  { id: "a2", text: "Bodega Principal recibió el despacho #2", at: "Hace 22 minutos" },
  { id: "a3", text: "Tienda Centro registró un recaudo de $860.000", at: "Hace 1 hora" },
  { id: "a4", text: "Se creó el producto “Caja 500g” en Categoría A", at: "Hace 3 horas" },
];

export const MOCK_NOTIFICATIONS: NotificationItemData[] = [
  {
    id: "n1",
    kind: "dispatch",
    title: "Fábrica despachó a Bodega Principal",
    body: "Despacho #3 · $1.000.000",
    createdAt: "Hace 2 minutos",
    read: false,
    reference: "dispatch:3",
  },
  {
    id: "n2",
    kind: "receipt",
    title: "Bodega recibió despacho #2",
    body: "Tienda Centro · 18 unidades",
    createdAt: "Hace 10 minutos",
    read: false,
    reference: "dispatch:2",
  },
  {
    id: "n3",
    kind: "payment",
    title: "Nuevo recaudo registrado",
    body: "Tienda Centro · $860.000",
    createdAt: "Hace 20 minutos",
    read: false,
    reference: "payment:118",
  },
  {
    id: "n4",
    kind: "message",
    title: "Nuevo mensaje",
    body: "Coordinación Bodega: “Confirmo recepción”",
    createdAt: "Hace 30 minutos",
    read: true,
    reference: "conversation:4",
  },
  {
    id: "n5",
    kind: "system",
    title: "Ajuste de inventario aprobado",
    body: "Bodega Principal · -6 unidades",
    createdAt: "Ayer",
    read: true,
  },
];
