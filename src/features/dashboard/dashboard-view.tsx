import { Link } from "@tanstack/react-router";
import { 
  Bell,
  ChevronDown, 
  ChevronUp,
  Store,
  Package,
  Truck,
  ArrowRight,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight
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

import { useBossDashboardData } from "@/features/dashboard/use-dashboard-data";
import { formatCurrency } from "@/lib/format";

// Colores para el Donut Chart
const CHART_COLORS = ['#111827', '#4b5563', '#9ca3af', '#d1d5db'];

function MiniStatCard({ title, value, trend, isCurrency = false }: { title: string; value: number | string; trend: number | null; isCurrency?: boolean }) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{title}</span>
      <span className="text-[16px] font-black tracking-tight text-gray-900">
        {isCurrency && typeof value === 'number' ? formatCurrency(value) : value}
      </span>
      {trend !== null && (
        <span className={`flex items-center text-[11px] font-bold ${trend >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
          {trend >= 0 ? <ArrowUpRight className="mr-0.5 size-3" /> : <ArrowDownRight className="mr-0.5 size-3" />}
          {Math.abs(trend).toFixed(1)}%
        </span>
      )}
    </div>
  );
}

export function BossDashboard() {
  const { 
    salesToday, 
    salesTrend,
    dispatchesToday,
    dispatchesTrend,
    paymentsToday,
    paymentsTrend,
    salesChartData,
    categoryChartData,
    storeSales,
    dispatchStats,
    isLoading 
  } = useBossDashboardData();

  const [isDispatchesOpen, setIsDispatchesOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-[#f8f9fa]">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <div className="size-6 animate-spin rounded-full border-2 border-black border-t-transparent" />
        </div>
      </div>
    );
  }

  // Filtrar chart data a 7 días para el mini gráfico
  const filteredSalesData = salesChartData.slice(-7);

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-black selection:bg-black/10">
      <div className="mx-auto max-w-md px-5 pt-8 pb-16 space-y-6">
        
        {/* Header simple con notificaciones */}
        <header className="flex items-center justify-between mb-2">
          <div className="flex flex-col">
            <span className="text-[13px] font-medium text-gray-500">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
          <button className="flex size-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200/50 transition-transform active:scale-95">
            <Bell className="size-5 text-black" />
            <span className="absolute top-0 right-0 flex size-3 items-center justify-center rounded-full bg-emerald-500 text-[8px] font-bold text-white border-2 border-white">
              2
            </span>
          </button>
        </header>

        {/* Hero Card (Ventas del día) */}
        <section className="flex flex-col items-center rounded-[24px] bg-[#ecebe5] p-10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
          
          <span className="text-[14px] font-semibold text-gray-600 mb-2 relative z-10">Ventas del día</span>
          <h1 className="text-[44px] font-black tracking-tighter mb-10 relative z-10 text-gray-900">
            {formatCurrency(salesToday)}
          </h1>
          
          <div className="flex w-full gap-4 relative z-10">
            <Link 
              to="/dispatches" 
              className="flex flex-1 items-center justify-center rounded-full bg-gray-900 py-4 text-[14px] font-bold tracking-wide text-white transition-transform active:scale-95 shadow-md"
            >
              DESPACHOS
            </Link>
            <Link 
              to="/inventory" 
              className="flex flex-1 items-center justify-center rounded-full border border-gray-300/80 bg-white/50 backdrop-blur-sm py-4 text-[14px] font-bold tracking-wide text-black transition-transform active:scale-95"
            >
              INVENTARIO
            </Link>
          </div>
        </section>

        {/* Grid de KPIs secundarios */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStatCard title="Ventas" value={salesToday} trend={salesTrend} isCurrency />
          <MiniStatCard title="Pedidos" value={dispatchesToday} trend={dispatchesTrend} />
          <MiniStatCard title="Recaudo" value={paymentsToday} trend={paymentsTrend} isCurrency />
          <MiniStatCard title="Salud Stock" value="98%" trend={null} />
        </section>

        {/* Gráficos Minimalistas */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Gráfico de Ventas (Area) */}
          <div className="flex flex-col rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[13px] font-bold uppercase tracking-wider text-gray-400">Ventas (7d)</span>
              <TrendingUp className="size-4 text-gray-300" />
            </div>
            <div className="h-[100px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredSalesData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSalesMini" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#111827" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#111827" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                    formatter={(value: number) => [formatCurrency(value), ""]}
                    labelStyle={{ display: 'none' }}
                  />
                  <Area type="step" dataKey="ventas" stroke="#111827" strokeWidth={2} fillOpacity={1} fill="url(#colorSalesMini)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico de Distribución (Donut) */}
          <div className="flex flex-col rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <span className="text-[13px] font-bold uppercase tracking-wider text-gray-400 mb-2">Distribución</span>
            <div className="flex items-center gap-4 h-[100px]">
              <div className="h-full aspect-square relative">
                {categoryChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        innerRadius={25}
                        outerRadius={40}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full rounded-full border-[4px] border-gray-100" />
                )}
              </div>
              <div className="flex flex-col justify-center gap-1.5 flex-1">
                {categoryChartData.slice(0, 3).map((cat, idx) => (
                  <div key={cat.name} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <div className="size-1.5 rounded-full" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                      <span className="font-bold text-gray-600 truncate max-w-[60px]">{cat.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Collapsible Section (Despachos de la tienda) */}
        <section>
          <button 
            onClick={() => setIsDispatchesOpen(!isDispatchesOpen)}
            className={`flex w-full flex-col overflow-hidden bg-white shadow-sm transition-all active:scale-[0.99] ${isDispatchesOpen ? 'rounded-[24px]' : 'rounded-full'}`}
          >
            <div className="flex w-full items-center justify-between px-6 py-5">
              <div className="flex items-center gap-4">
                {/* Loader icon style from reference */}
                <div className="relative flex size-10 shrink-0 items-center justify-center rounded-full border-[3px] border-gray-100">
                  <svg className="absolute -left-[3px] -top-[3px] size-10 -rotate-90 text-emerald-400" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray="25, 100"
                    />
                  </svg>
                  <span className="text-[11px] font-bold">1/4</span>
                </div>
                <div className="flex flex-col items-start gap-0.5">
                  <span className="text-[16px] font-bold leading-none">Despachos de la tienda</span>
                  <span className="text-[13px] text-gray-500 font-medium">Resumen de envíos y stock</span>
                </div>
              </div>
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-600 bg-gray-50">
                {isDispatchesOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </div>
            </div>
            
            {/* Expanded Content */}
            {isDispatchesOpen && (
              <div className="w-full border-t border-gray-100 bg-white px-6 pb-6 pt-4 text-left transition-all">
                {/* Resumen Global */}
                <div className="flex items-center justify-between mb-6 px-2">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Envíos</span>
                    <span className="text-xl font-black">{dispatchStats.count}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Prods</span>
                    <span className="text-xl font-black">{dispatchStats.products}</span>
                  </div>
                </div>

                {/* Lista de tiendas con despachos/inventario */}
                <div className="space-y-3">
                  {storeSales.length === 0 ? (
                     <p className="text-center text-sm text-gray-400 py-4">No hay tiendas registradas aún.</p>
                  ) : (
                    storeSales.map((store) => (
                      <div key={store.id} className="flex flex-col gap-2 rounded-xl bg-gray-50 p-4 border border-gray-100">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[14px]">{store.name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-[13px] font-medium text-gray-600">
                           <div className="flex items-center gap-1.5">
                             <Package className="size-4 text-gray-400" />
                             <span>{store.inventory} en stock</span>
                           </div>
                           <div className="flex items-center gap-1.5">
                             <Truck className="size-4 text-gray-400" />
                             <span>{store.dispatchedItems} en camino</span>
                           </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </button>
        </section>

        {/* List Section (Ventas por Tiendas) */}
        <section className="flex flex-col overflow-hidden rounded-[24px] bg-white shadow-sm mt-8">
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-50">
            <h2 className="text-[13px] font-black uppercase tracking-widest text-gray-900">Ventas por tiendas</h2>
            <Link to="/stores" className="text-[13px] font-bold text-gray-400 flex items-center gap-1 hover:text-black transition-colors">
              View all <ArrowRight className="size-3.5" />
            </Link>
          </div>
          
          <div className="flex flex-col p-4">
            {storeSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-gray-500">
                <Store className="size-8 mb-2 opacity-20" />
                <span className="text-sm font-medium">Aún no hay ventas registradas hoy.</span>
              </div>
            ) : (
              storeSales.map((store, index) => (
                <div 
                  key={store.id} 
                  className={`flex items-center justify-between p-4 rounded-2xl transition-colors hover:bg-gray-50 ${index !== storeSales.length - 1 ? 'border-b border-gray-50 rounded-none' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-[#003087] text-white shadow-sm">
                      <span className="font-bold text-xl">{store.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[15px] font-bold text-gray-900 leading-tight">{store.name}</span>
                      <span className="text-[13px] font-medium text-gray-400">{store.id.slice(0, 8)}...</span>
                    </div>
                  </div>
                  <span className="text-[15px] font-semibold text-gray-700">
                    +{formatCurrency(store.sales)}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
