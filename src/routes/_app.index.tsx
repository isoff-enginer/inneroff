import { createFileRoute } from "@tanstack/react-router";
import { useSession } from "@/features/auth/session";

import { BossDashboard } from "@/features/dashboard/dashboard-view";
import { FactoryDashboard } from "@/features/dashboard/factory-dashboard";
import { WarehouseDashboard } from "@/features/dashboard/warehouse-dashboard";
import { StoreDashboard } from "@/features/dashboard/store-dashboard";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Panel de operación · Reserva" },
      {
        name: "description",
        content:
          "Panel interno para administrar la operación entre fábrica, bodegas y tiendas: inventario, despachos y recaudos.",
      },
    ],
  }),
  component: DashboardRouter,
});

function DashboardRouter() {
  const { role, user } = useSession();

  // Si tiene asignada una tienda
  if (user?.storeId) {
    return <StoreDashboard />;
  }

  // Si tiene asignada una bodega
  if (user?.warehouseId) {
    return <WarehouseDashboard />;
  }

  // Si tiene asignada una fábrica o rol directo de fábrica
  if (user?.factoryId || role === "factory") {
    return <FactoryDashboard />;
  }

  // Si es un operations admin sin lugar específico
  if (role === "operations_admin") {
    return <OperationsAdminDashboard />;
  }

  // Boss / Boss Admin o por defecto
  return <BossDashboard />;
}

function OperationsAdminDashboard() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Dashboard Operativo Global</h1>
        <p className="mt-2 text-muted-foreground">No tienes asignada ninguna tienda ni bodega específica.</p>
      </div>
    </div>
  );
}
