import { createFileRoute } from "@tanstack/react-router";

import { BossDashboard as DashboardView } from "@/features/dashboard/dashboard-view";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · Reserva Operaciones" },
      {
        name: "description",
        content: "Resumen diario de ventas, inventario, despachos y alertas de la operación.",
      },
      { property: "og:title", content: "Dashboard · Reserva Operaciones" },
      {
        property: "og:description",
        content: "Resumen diario de ventas, inventario, despachos y alertas de la operación.",
      },
    ],
  }),
  component: DashboardView,
});
