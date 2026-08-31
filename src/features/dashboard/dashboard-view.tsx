import { Link } from "@tanstack/react-router";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Receipt, 
  Truck, 
  Wallet, 
  AlertCircle,
  ArrowRight,
  TrendingUp,
  PackageOpen,
  Clock,
  DollarSign
} from "lucide-react";
import { useState } from "react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/session";
import { useBossDashboardData } from "@/features/dashboard/use-dashboard-data";
import { formatCurrency, greeting } from "@/lib/format";

// Colores premium para los gráficos (estilo Linear/Stripe)
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// Componente para KPI Cards
function PremiumStatCard({ 
  title, 
  value, 
  trend, 
  icon: Icon, 
  isCurrency = false 
}: { 
  title: string; 
  value: number; 
  trend: number; 
  icon: any; 
  isCurrency?: boolean; 
}) {
  const isPositive = trend >= 0;
  
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border/50 transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <h3 className="text-2xl font-bold tracking-tight text-foreground">
          {isCurrency ? formatCurrency(value) : value.toLocaleString('es-ES')}
        </h3>
      </div>
      <div className="flex items-center gap-1.5 text-xs font-medium">
        <span className={`flex items-center ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
          {isPositive ? <ArrowUpRight className="mr-0.5 size-3.5" /> : <ArrowDownRight className="mr-0.5 size-3.5" />}
          {Math.abs(trend).toFixed(1)}%
        </span>
        <span className="text-muted-foreground font-normal">vs ayer</span>
      </div>
    </div>
  );
}

export function BossDashboard() {
  const { user } = useSession();
  const { 
    salesToday, 
    salesTrend, 
    paymentsToday, 
    paymentsTrend, 
    dispatchesToday, 
    dispatchesTrend, 
    criticalInventoryItems, 
    salesChartData, 
    categoryChartData, 
    recentActivity, 
    isLoading 
  } = useBossDashboardData();

  const [timeRange, setTimeRange] = useState<7 | 30>(7);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm">Cargando métricas...</span>
        </div>
      </div>
    );
  }

  // Filtrar chart data basado en timeRange
  const filteredSalesData = salesChartData.slice(-timeRange);

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-8">
      <PageHeader
        title={`${greeting()}, ${user?.displayName ?? user?.fullName ?? "Jefe"}`}
        description="Aquí está el resumen general de tu operación al día de hoy."
        actions={
          <Button asChild className="rounded-full px-6 shadow-sm">
            <Link to="/dispatches">
              Despachos activos
              <ArrowRight className="ml-2 size-4" aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      {/* KPI Section */}
      <section aria-label="Métricas principales" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PremiumStatCard 
          title="Ventas Hoy" 
          value={salesToday} 
          trend={salesTrend} 
          icon={TrendingUp} 
          isCurrency 
        />
        <PremiumStatCard 
          title="Recaudo Hoy" 
          value={paymentsToday} 
          trend={paymentsTrend} 
          icon={Wallet} 
          isCurrency 
        />
        <PremiumStatCard 
          title="Nuevos Pedidos" 
          value={dispatchesToday} 
          trend={dispatchesTrend} 
          icon={PackageOpen} 
        />
        <div className="flex flex-col gap-3 rounded-2xl bg-rose-50/50 dark:bg-rose-950/10 p-5 shadow-sm ring-1 ring-rose-200/50 dark:ring-rose-900/50 transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-rose-600 dark:text-rose-400">Inventario Crítico</span>
            <div className="flex size-8 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400">
              <AlertCircle className="size-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold tracking-tight text-foreground">
              {criticalInventoryItems.length}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-rose-600/80 dark:text-rose-400/80">
            <span>Productos con stock &lt; 10</span>
          </div>
        </div>
      </section>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Gráfico de Ventas (Area Chart) */}
        <div className="col-span-1 flex flex-col rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border/50 lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Evolución de Ventas</h2>
              <p className="text-sm text-muted-foreground">Ingresos confirmados a lo largo del tiempo</p>
            </div>
            <div className="flex rounded-lg bg-muted/50 p-1">
              <button 
                onClick={() => setTimeRange(7)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${timeRange === 7 ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                7 Días
              </button>
              <button 
                onClick={() => setTimeRange(30)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${timeRange === 30 ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                30 Días
              </button>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredSalesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/40" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12 }} 
                  dy={10}
                  className="text-muted-foreground"
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12 }} 
                  tickFormatter={(value) => `$${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                  className="text-muted-foreground"
                />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  formatter={(value: number) => [formatCurrency(value), "Ventas"]}
                  labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="ventas" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorVentas)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Business Overview (Donut Chart) */}
        <div className="col-span-1 flex flex-col rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border/50">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Ventas por Categoría</h2>
            <p className="text-sm text-muted-foreground">Distribución de los últimos 30 días</p>
          </div>
          <div className="mt-6 flex flex-1 items-center justify-center h-[250px]">
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', padding: '8px 12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">No hay datos suficientes</p>
            )}
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {categoryChartData.slice(0, 3).map((cat, idx) => (
              <div key={cat.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="size-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                  <span className="font-medium">{cat.name}</span>
                </div>
                <span className="text-muted-foreground">{formatCurrency(cat.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity & Inventory Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Actividad Reciente */}
        <div className="flex flex-col rounded-2xl bg-card shadow-sm ring-1 ring-border/50">
          <div className="border-b border-border/50 p-6">
            <h2 className="text-lg font-semibold tracking-tight">Actividad en Vivo</h2>
            <p className="text-sm text-muted-foreground">Últimos movimientos de la operación</p>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              {recentActivity.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">No hay actividad reciente.</p>
              ) : (
                recentActivity.map((activity: any) => (
                  <div key={activity.id} className="flex items-start gap-4">
                    <div className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${activity.type === 'sale' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                      {activity.type === 'sale' ? <DollarSign className="size-4" /> : <Truck className="size-4" />}
                    </div>
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">
                          {activity.type === 'sale' ? 'Nueva Venta' : `Despacho #${String(activity.number).padStart(3, "0")}`}
                        </p>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="size-3" />
                          {activity.date.split(',')[1]?.trim() || activity.date}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {activity.type === 'sale' 
                            ? `Categoría: ${activity.category}` 
                            : `${activity.fromName} → ${activity.toName}`}
                        </p>
                        <span className="text-sm font-medium">
                          {formatCurrency(activity.type === 'sale' ? activity.amount : activity.totalValue)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Salud de Inventario (Crítico) */}
        <div className="flex flex-col rounded-2xl bg-card shadow-sm ring-1 ring-border/50">
          <div className="border-b border-border/50 p-6 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-rose-600 dark:text-rose-400">Atención Requerida</h2>
              <p className="text-sm text-muted-foreground">Productos con stock bajo crítico (&lt; 10)</p>
            </div>
            <Button variant="outline" size="sm" asChild className="rounded-full">
              <Link to="/inventory">Ver inventario</Link>
            </Button>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {criticalInventoryItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30">
                    <Boxes className="size-6" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-foreground">Inventario Saludable</p>
                  <p className="text-xs text-muted-foreground mt-1">No hay productos con stock crítico.</p>
                </div>
              ) : (
                criticalInventoryItems.map((item, idx) => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl border border-border/50 p-4 transition-colors hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center font-bold text-muted-foreground bg-muted rounded-md text-xs">
                        {idx + 1}
                      </div>
                      <span className="text-sm font-medium">{item.name}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                        {item.quantity} und.
                      </span>
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-rose-100 dark:bg-rose-900/30">
                        <div 
                          className="h-full bg-rose-500 rounded-full" 
                          style={{ width: `${(item.quantity / 10) * 100}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
