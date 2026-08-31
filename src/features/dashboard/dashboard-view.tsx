import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, Boxes, Receipt, Truck } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { StatusBadge } from "@/components/common/status-badge";
import { NotificationItem } from "@/components/common/notification-item";
import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/session";
import { useBossDashboardData } from "@/features/dashboard/use-dashboard-data";
import { MOCK_ACTIVITY, MOCK_NOTIFICATIONS } from "@/features/dashboard/mock-data";
import { DISPATCH_STATUS_LABELS, DISPATCH_STATUS_TONES } from "@/features/dispatches/mock-data";
import { formatCurrency, greeting } from "@/lib/format";

const STAT_ICONS = [Receipt, Boxes, Truck, AlertTriangle];

export function BossDashboard() {
  const { user } = useSession();
  const { sales, inventory, activeDispatches, recentDispatches, isLoading } = useBossDashboardData();

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Cargando métricas...</div>;
  }

  const stats = [
    { label: "Ventas del día", value: formatCurrency(sales), hint: "hoy" },
    { label: "Inventario total", value: formatCurrency(inventory), hint: "valorizado" },
    { label: "Despachos activos", value: String(activeDispatches), hint: "en curso" },
    { label: "Alertas", value: "0", hint: "requieren revisión" }, // To be implemented later with real data
  ];

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user?.displayName ?? user?.fullName ?? ""}`}
        description="Resumen de operación entre fábrica, bodegas y tiendas."
        actions={
          <Button asChild>
            <Link to="/dispatches">
              Ver despachos
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      <section aria-label="Resumen de operación" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => (
          <StatCard key={stat.label} {...stat} icon={STAT_ICONS[index] ?? Receipt} />
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-labelledby="recent-dispatches" className="surface lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 id="recent-dispatches" className="text-sm font-semibold">
              Despachos recientes
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dispatches">Ver todos</Link>
            </Button>
          </div>
          <ul className="divide-y divide-border">
            {recentDispatches.length === 0 ? (
              <li className="p-5 text-sm text-muted-foreground text-center">No hay despachos recientes.</li>
            ) : (
              recentDispatches.map((dispatch: any) => (
                <li
                  key={dispatch.id}
                  className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      #{String(dispatch.number).padStart(3, "0")} · {dispatch.fromName} →{" "}
                      {dispatch.toName}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{dispatch.date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="tabular text-sm">{formatCurrency(dispatch.totalValue || 0)}</span>
                    <StatusBadge tone={DISPATCH_STATUS_TONES[dispatch.status]}>
                      {DISPATCH_STATUS_LABELS[dispatch.status] || dispatch.status}
                    </StatusBadge>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        <section aria-labelledby="activity" className="surface">
          <div className="border-b border-border px-5 py-4">
            <h2 id="activity" className="text-sm font-semibold">
              Actividad reciente
            </h2>
          </div>
          <ul className="divide-y divide-border">
            {MOCK_ACTIVITY.map((item) => (
              <li key={item.id} className="px-5 py-3.5">
                <p className="text-sm">{item.text}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.at}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="notifications" className="surface">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id="notifications" className="text-sm font-semibold">
            Notificaciones
          </h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/notifications">Centro de notificaciones</Link>
          </Button>
        </div>
        <div className="p-2">
          {MOCK_NOTIFICATIONS.slice(0, 4).map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}
        </div>
      </section>
    </>
  );
}
