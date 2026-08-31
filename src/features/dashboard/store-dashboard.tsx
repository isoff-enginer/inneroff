import { Boxes, Receipt, Truck } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { useSession } from "@/features/auth/session";
import { useStoreDashboardData } from "@/features/dashboard/use-dashboard-data";
import { formatCurrency, greeting } from "@/lib/format";

export function StoreDashboard() {
  const { user } = useSession();
  const { sales, inventory, isLoading } = useStoreDashboardData(user?.storeId);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Cargando métricas de tienda...</div>;
  }

  const stats = [
    { label: "Ventas del día", value: formatCurrency(sales), hint: "recaudado" },
    { label: "Inventario Local", value: formatCurrency(inventory), hint: "valorizado" },
    { label: "En tránsito", value: "0", hint: "despachos hacia tienda" },
  ];

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user?.displayName ?? user?.fullName ?? ""}`}
        description="Panel de operación de tienda."
      />

      <section aria-label="Resumen de operación" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard {...stats[0]} icon={Receipt} />
        <StatCard {...stats[1]} icon={Boxes} />
        <StatCard {...stats[2]} icon={Truck} />
      </section>

      <div className="mt-8 surface p-8 text-center text-muted-foreground border-t border-border">
        <h2 className="text-lg font-semibold text-foreground">Más funcionalidades próximamente</h2>
        <p className="mt-2 text-sm">El historial detallado de caja y recepción de despachos se habilitarán pronto.</p>
      </div>
    </>
  );
}
