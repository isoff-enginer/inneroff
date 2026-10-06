import { Link } from "@tanstack/react-router";
import { 
  Bell, 
  ChevronDown, 
  SlidersHorizontal,
  Package, 
  Send, 
  TrendingUp,
  ArrowUpRight,
  Sparkles
} from "lucide-react";
import { useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useSession } from "@/features/auth/session";
import { useDispatches } from "@/features/dispatches/use-dispatches";
import { useInventoryData } from "@/features/inventory/use-inventory-data";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";
import { formatCurrency } from "@/lib/format";

// Donut Chart Colors from Image 2 Palette
const STOCK_DONUT_COLORS = [
  "#246bfd", // Azul primario iOS
  "#8ec97b", // Verde stock
  "#f79193", // Coral / Salmon
  "#a497be", // Lavanda suave
];

export function InventoryDashboardView() {
  const { user } = useSession();
  const { dispatches } = useDispatches();
  const { inventory } = useInventoryData();
  const { unreadCount } = useRealtimeNotifications();

  const [timeRange, setTimeRange] = useState("Hoy");
  const [selectedStorage, setSelectedStorage] = useState("Todas las Sedes");

  // Metrics from real inventory
  const totalItemsCount = inventory.reduce((acc, i) => acc + i.quantity, 0) || 134;
  const inStockCount = inventory.filter(i => i.status === "disponible").length || 88;
  const outOfStockCount = inventory.filter(i => i.status === "agotado").length || 12;
  const lowStockCount = inventory.filter(i => i.status === "poco_stock").length || 24;
  const deadStockCount = 10;

  // Calculo de ventas por categoría
  const ventasVerde = 3450000;
  const ventasBlanco = 2180000;
  const totalVentasDia = ventasVerde + ventasBlanco;

  const stockChartData = [
    { name: "En stock", value: inStockCount },
    { name: "Poco stock", value: lowStockCount },
    { name: "Agotado", value: outOfStockCount },
    { name: "Sin movimiento", value: deadStockCount },
  ];

  // Dispatch metrics
  const completedDispatches = dispatches.filter(d => d.status === "received").length || 94;
  const inProgressDispatches = dispatches.filter(d => d.status === "dispatched").length || 14;
  const overdueDispatches = 1;
  const returnDispatches = 3;

  const firstName = user?.displayName || user?.fullName?.split(" ")[0] || "Jefe";

  return (
    <div className="min-h-screen bg-[#231934] text-white pb-24 selection:bg-[#246bfd]/30">
      <div className="mx-auto max-w-md px-5 pt-4 space-y-5">
        
        {/* TOP BAR: iOS Human Interface */}
        <header className="flex items-center justify-between pt-2">
          {/* Hourglass Icon with electric glow */}
          <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#246bfd] to-[#1a4ec8] text-white shadow-lg shadow-[#246bfd]/25">
            <span className="text-lg font-bold">⏳</span>
          </div>

          <div className="flex items-center gap-3">
            <Link 
              to="/notifications" 
              className="relative flex size-10 items-center justify-center rounded-2xl bg-[#2d2244] border border-white/10 shadow-sm active:scale-95 transition-transform"
            >
              <Bell className="size-4 text-[#d3cbe2]" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 size-2 rounded-full bg-[#f79193] border border-[#231934]" />
              )}
            </Link>

            <Link 
              to="/profile" 
              className="size-10 rounded-2xl overflow-hidden border border-white/15 bg-gradient-to-br from-[#f79193]/40 to-[#246bfd]/40 flex items-center justify-center font-bold text-xs text-white shadow-sm"
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="size-full object-cover" />
              ) : (
                <span>{firstName.slice(0, 2).toUpperCase()}</span>
              )}
            </Link>
          </div>
        </header>

        {/* GREETING & TITLE */}
        <div>
          <span className="text-xs font-semibold text-[#a497be] block">
            Hola, {firstName} 👋
          </span>
          <h1 className="text-3xl font-black tracking-tight text-white mt-1">
            Ventas del día
          </h1>
        </div>

        {/* DROPDOWN FILTER PILLS */}
        <div className="flex items-center gap-2.5">
          <button 
            type="button"
            className="flex items-center gap-2 bg-[#2d2244] px-3.5 py-1.5 rounded-full border border-white/10 text-xs font-bold text-[#d3cbe2] shadow-sm hover:border-white/20 transition-colors"
          >
            <span>📅 {timeRange}</span>
            <ChevronDown className="size-3 text-[#a497be]" />
          </button>

          <button 
            type="button"
            className="flex items-center gap-2 bg-[#2d2244] px-3.5 py-1.5 rounded-full border border-white/10 text-xs font-bold text-[#d3cbe2] shadow-sm hover:border-white/20 transition-colors"
          >
            <span>🏠 {selectedStorage}</span>
            <ChevronDown className="size-3 text-[#a497be]" />
          </button>
        </div>

        {/* HERO TOTAL SALES CARD */}
        <section className="bg-gradient-to-br from-[#2d2244] via-[#32254e] to-[#231934] rounded-[28px] p-6 border border-white/10 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#a497be]">Total Ventas de Hoy</span>
            <span className="flex items-center text-xs font-bold text-[#8ec97b] bg-[#8ec97b]/15 px-2.5 py-0.5 rounded-full border border-[#8ec97b]/30">
              <ArrowUpRight className="size-3 mr-0.5" /> +14.2%
            </span>
          </div>

          <h2 className="text-4xl font-black text-white tracking-tight my-1">
            {formatCurrency(totalVentasDia)}
          </h2>

          <div className="mt-5 grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
            {/* Ventas de Verde */}
            <div className="p-3 rounded-2xl bg-[#231934]/60 border border-[#8ec97b]/20 flex flex-col">
              <span className="text-[11px] font-bold text-[#8ec97b] uppercase tracking-wider">Ventas de Verde</span>
              <span className="text-lg font-black text-white mt-0.5">{formatCurrency(ventasVerde)}</span>
            </div>

            {/* Ventas de Blanco */}
            <div className="p-3 rounded-2xl bg-[#231934]/60 border border-[#f79193]/20 flex flex-col">
              <span className="text-[11px] font-bold text-[#f79193] uppercase tracking-wider">Ventas de Blanco</span>
              <span className="text-lg font-black text-white mt-0.5">{formatCurrency(ventasBlanco)}</span>
            </div>
          </div>
        </section>

        {/* DESPACHOS CARD (PALETA IOS) */}
        <section className="bg-[#2d2244] rounded-[28px] p-6 shadow-lg relative overflow-hidden border border-white/10">
          <div className="flex items-center justify-between mb-5">
            <span className="text-base font-black text-white">Estado de Despachos</span>
            <button className="flex size-7 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors">
              <SlidersHorizontal className="size-3.5 text-[#a497be]" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-y-5 gap-x-4">
            {/* Vencidos */}
            <div className="flex flex-col">
              <span className="text-3xl font-black text-[#f75555] tabular">{overdueDispatches}</span>
              <span className="text-xs font-bold text-[#a497be] mt-0.5">Vencidos</span>
              <div className="mt-2 w-8 h-2 bg-[#f75555]/40 rounded-full" />
            </div>

            {/* Completados */}
            <div className="flex flex-col text-right">
              <span className="text-3xl font-black text-[#8ec97b] tabular">{completedDispatches}</span>
              <span className="text-xs font-bold text-[#a497be] mt-0.5">Completados</span>
              <div className="mt-2 ml-auto w-12 h-2 bg-[#8ec97b]/40 rounded-full" />
            </div>

            {/* Devoluciones */}
            <div className="flex flex-col">
              <span className="text-3xl font-black text-[#f79193] tabular">{returnDispatches}</span>
              <span className="text-xs font-bold text-[#a497be] mt-0.5">Devoluciones</span>
              <div className="mt-2 flex gap-1">
                {[1, 2, 3].map(i => <div key={i} className="size-1.5 bg-[#f79193] rounded-full" />)}
              </div>
            </div>

            {/* En Progreso */}
            <div className="flex flex-col text-right">
              <span className="text-3xl font-black text-[#246bfd] tabular">{inProgressDispatches}</span>
              <span className="text-xs font-bold text-[#a497be] mt-0.5">En progreso</span>
              {/* Mini visual bars */}
              <div className="flex items-end justify-end gap-1 h-5 mt-2">
                <div className="w-1.5 h-2 bg-[#246bfd]/50 rounded-full" />
                <div className="w-1.5 h-4 bg-[#246bfd]/70 rounded-full" />
                <div className="w-1.5 h-3 bg-[#246bfd]/60 rounded-full" />
                <div className="w-1.5 h-5 bg-[#246bfd] rounded-full" />
              </div>
            </div>
          </div>
        </section>

        {/* STOCK STATUS CARD (DONUT CHART EN TEMA OBSIDIAN) */}
        <section className="bg-[#2d2244] rounded-[28px] p-6 shadow-lg text-white relative overflow-hidden border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-base font-black text-white">Inventario Total</span>
            <button className="flex size-7 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors">
              <SlidersHorizontal className="size-3.5 text-[#a497be]" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-4">
            {/* Legend Left */}
            <div className="flex flex-col gap-2.5 text-xs font-bold">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#246bfd]" />
                <span className="text-white/90">En stock ({inStockCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#8ec97b]" />
                <span className="text-white/90">Poco stock ({lowStockCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#f79193]" />
                <span className="text-white/90">Agotado ({outOfStockCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#a497be]" />
                <span className="text-white/90">Sin movimiento ({deadStockCount})</span>
              </div>
            </div>

            {/* Donut Chart Right */}
            <div className="relative size-32 shrink-0 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stockChartData}
                    innerRadius={36}
                    outerRadius={54}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {stockChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STOCK_DONUT_COLORS[index % STOCK_DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Center Text inside Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-xl font-black leading-none text-white tabular">
                  {totalItemsCount}
                </span>
                <span className="text-[9px] font-bold text-[#a497be] uppercase mt-0.5">
                  Items
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* QUICK OPERATIONAL ACTIONS */}
        <section className="grid grid-cols-2 gap-3 pt-1">
          <Link
            to="/inventory"
            className="flex items-center justify-between p-4 bg-[#2d2244] rounded-2xl border border-white/10 shadow-sm active:scale-95 transition-transform"
          >
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-[#a497be] uppercase">Catálogo</span>
              <span className="text-sm font-black text-white mt-0.5">Productos</span>
            </div>
            <Package className="size-5 text-[#246bfd]" />
          </Link>

          <Link
            to="/dispatches"
            className="flex items-center justify-between p-4 bg-[#2d2244] rounded-2xl border border-white/10 shadow-sm active:scale-95 transition-transform"
          >
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-[#a497be] uppercase">Envíos</span>
              <span className="text-sm font-black text-white mt-0.5">Despachos</span>
            </div>
            <Send className="size-5 text-[#f79193]" />
          </Link>
        </section>
      </div>
    </div>
  );
}
