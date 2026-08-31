import { Boxes, Truck } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { useSession } from "@/features/auth/session";
import { useWarehouseDashboardData } from "@/features/dashboard/use-dashboard-data";
import { formatCurrency, greeting } from "@/lib/format";

export function WarehouseDashboard() {
  const { user } = useSession();
  const { inventory, isLoading } = useWarehouseDashboardData(user?.warehouseId);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Cargando métricas de bodega...</div>;
  }

  const stats = [
    { label: "Inventario Local", value: formatCurrency(inventory), hint: "valorizado" },
    { label: "Despachos", value: "0", hint: "en curso" },
  ];

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user?.displayName ?? user?.fullName ?? ""}`}
        description="Panel de operación de bodega principal."
      />

      <section aria-label="Resumen de operación" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard {...stats[0]} icon={Boxes} />
        <StatCard {...stats[1]} icon={Truck} />
      </section>

      <div className="mt-8 surface p-8 text-center text-muted-foreground border-t border-border">
        <h2 className="text-lg font-semibold text-foreground">Más funcionalidades próximamente</h2>
        <p className="mt-2 text-sm">Los despachos recibidos y actividad detallada de la bodega estarán disponibles pronto.</p>
      </div>
    </>
  );
}
