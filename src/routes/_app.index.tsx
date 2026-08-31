import { createFileRoute } from "@tanstack/react-router";

import { DashboardView } from "@/features/dashboard/dashboard-view";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Panel de operación · Reserva" },
      {
        name: "description",
        content:
          "Panel interno para administrar la operación entre fábrica, bodegas y tiendas: inventario, despachos y recaudos.",
      },
      { property: "og:title", content: "Panel de operación · Reserva" },
      {
        property: "og:description",
        content: "Operación fábrica → bodega → tiendas en un solo panel empresarial.",
      },
    ],
  }),
  component: DashboardView,
});
