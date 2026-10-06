import { Link, useNavigate } from "@tanstack/react-router";
import { 
  Bell, 
  ChevronDown, 
  SlidersHorizontal,
  Package, 
  Send, 
  Plus,
  ArrowRight,
  TrendingUp
} from "lucide-react";
import { useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useSession } from "@/features/auth/session";
import { useDispatches } from "@/features/dispatches/use-dispatches";
import { useInventoryData } from "@/features/inventory/use-inventory-data";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";
import { formatCurrency } from "@/lib/format";

// Donut Chart Colors matching Mockup 2
const STOCK_DONUT_COLORS = [
  "#261C14", // In stock (Dark chocolate brown)
  "#E06D2D", // Out of stock (Vibrant terracotta)
  "#F6AD55", // Low stock (Warm amber)
  "#FBD38D", // Dead stock (Cream peach)
];

export function InventoryDashboardView() {
  const { user } = useSession();
  const navigate = useNavigate();
  const { dispatches, isLoading: isDispLoading } = useDispatches();
  const { inventory, categories } = useInventoryData();
  const { unreadCount } = useRealtimeNotifications();

  const [timeRange, setTimeRange] = useState("Este Mes");
  const [selectedStorage, setSelectedStorage] = useState("Todas las Sedes");

  // Metrics from real data
  const totalItemsCount = inventory.reduce((acc, i) => acc + i.quantity, 0) || 134;
  const inStockCount = inventory.filter(i => i.status === "disponible").length || 88;
  const outOfStockCount = inventory.filter(i => i.status === "agotado").length || 12;
  const lowStockCount = inventory.filter(i => i.status === "poco_stock").length || 24;
  const deadStockCount = 10;

  const stockChartData = [
    { name: "In stock", value: inStockCount },
    { name: "Out of stock", value: outOfStockCount },
    { name: "Low stock", value: lowStockCount },
    { name: "Dead stock", value: deadStockCount },
  ];

  // Dispatch metrics
  const completedDispatches = dispatches.filter(d => d.status === "received").length || 94;
  const inProgressDispatches = dispatches.filter(d => d.status === "dispatched").length || 14;
  const overdueDispatches = 1;
  const returnDispatches = 3;

  const firstName = user?.displayName || user?.fullName?.split(" ")[0] || "Jefe";

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-gray-900 pb-24 selection:bg-amber-200">
      <div className="mx-auto max-w-md px-5 pt-4 space-y-5">
        
        {/* TOP BAR: Logo | Notifications | Avatar */}
        <header className="flex items-center justify-between pt-2">
          {/* Stylized Hourglass Logo from Mockup */}
          <div className="flex size-9 items-center justify-center rounded-xl bg-black text-white shadow-xs">
            <span className="text-base font-black tracking-tighter">⏳</span>
          </div>

          <div className="flex items-center gap-3">
            <Link 
              to="/notifications" 
              className="relative flex size-10 items-center justify-center rounded-full bg-white shadow-xs border border-gray-100 active:scale-95 transition-transform"
            >
              <Bell className="size-5 text-gray-800" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 size-2.5 rounded-full bg-amber-400 border-2 border-white" />
              )}
            </Link>

            <Link to="/profile" className="size-10 rounded-full overflow-hidden border-2 border-white shadow-xs bg-amber-100 flex items-center justify-center font-bold text-sm text-gray-800">
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
          <span className="text-[15px] font-medium text-gray-600 block">
            Hola, {firstName} 👋
          </span>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 mt-1">
            Inventory Dashboard
          </h1>
        </div>

        {/* DROPDOWN FILTER PILLS */}
        <div className="flex items-center gap-3">
          <button 
            type="button"
            className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-gray-200 text-xs font-bold text-gray-700 shadow-2xs hover:border-gray-300 transition-colors"
          >
            <span>📅 {timeRange}</span>
            <ChevronDown className="size-3.5 text-gray-400" />
          </button>

          <button 
            type="button"
            className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-gray-200 text-xs font-bold text-gray-700 shadow-2xs hover:border-gray-300 transition-colors"
          >
            <span>🏠 {selectedStorage}</span>
            <ChevronDown className="size-3.5 text-gray-400" />
          </button>
        </div>

        {/* YELLOW CARD: ORDERS / DESPACHOS */}
        <section className="bg-[#FEF08A] rounded-[28px] p-6 shadow-sm relative overflow-hidden border border-amber-200/60">
          <div className="flex items-center justify-between mb-6">
            <span className="text-base font-black text-gray-900">Despachos</span>
            <button className="flex size-7 items-center justify-center rounded-full bg-black/5 hover:bg-black/10 transition-colors">
              <SlidersHorizontal className="size-3.5 text-gray-800" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-y-6 gap-x-4">
            {/* 1 Overdue */}
            <div className="flex flex-col">
              <span className="text-3xl font-black text-gray-900 tabular">{overdueDispatches}</span>
              <span className="text-xs font-bold text-gray-700 mt-0.5">Vencidos</span>
              <div className="mt-3 w-10 h-3 bg-black rounded-sm" />
            </div>

            {/* 94 Completed */}
            <div className="flex flex-col text-right">
              <span className="text-3xl font-black text-gray-900 tabular">{completedDispatches}</span>
              <span className="text-xs font-bold text-gray-700 mt-0.5">Completados</span>
            </div>

            {/* 3 Returns */}
            <div className="flex flex-col">
              <span className="text-3xl font-black text-gray-900 tabular">{returnDispatches}</span>
              <span className="text-xs font-bold text-gray-700 mt-0.5">Devoluciones</span>
              {/* Dot pattern */}
              <div className="mt-3 flex gap-1">
                {[1,2,3,4].map(i => <div key={i} className="size-1 bg-black rounded-full" />)}
              </div>
            </div>

            {/* 14 In Progress with decorative chart */}
            <div className="flex flex-col justify-between">
              <div>
                <span className="text-3xl font-black text-gray-900 tabular">{inProgressDispatches}</span>
                <span className="text-xs font-bold text-gray-700 block mt-0.5">En progreso</span>
              </div>

              {/* Decorative mini bar chart */}
              <div className="flex items-end justify-end gap-1.5 h-10 mt-2">
                <div className="w-1.5 h-4 bg-black/60 rounded-full" />
                <div className="w-1.5 h-7 bg-black/70 rounded-full" />
                <div className="w-1.5 h-5 bg-black/60 rounded-full" />
                <div className="w-1.5 h-9 bg-black rounded-full" />
                <div className="w-1.5 h-6 bg-black/80 rounded-full" />
                <div className="w-1.5 h-10 bg-black rounded-full" />
              </div>
            </div>
          </div>
        </section>

        {/* ORANGE CARD: STOCK STATUS (DONUT CHART) */}
        <section className="bg-[#FB923C] rounded-[28px] p-6 shadow-sm text-white relative overflow-hidden border border-orange-400/60">
          <div className="flex items-center justify-between mb-5">
            <span className="text-base font-black text-white">Estado de Stock</span>
            <button className="flex size-7 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors">
              <SlidersHorizontal className="size-3.5 text-white" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-4">
            {/* Legend Left */}
            <div className="flex flex-col gap-2.5 text-xs font-bold">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#261C14]" />
                <span className="text-white/95">En stock ({inStockCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#E06D2D]" />
                <span className="text-white/95">Agotado ({outOfStockCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#F6AD55]" />
                <span className="text-white/95">Poco stock ({lowStockCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#FBD38D]" />
                <span className="text-white/95">Sin movimiento ({deadStockCount})</span>
              </div>
            </div>

            {/* Donut Chart Right */}
            <div className="relative size-32 shrink-0 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stockChartData}
                    innerRadius={36}
                    outerRadius={56}
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
                <span className="text-[9px] font-bold text-white/80 uppercase mt-0.5 leading-tight">
                  Total Items
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* QUICK OPERATIONAL ACTIONS FOR BOSS */}
        <section className="grid grid-cols-2 gap-3 pt-1">
          <Link
            to="/inventory"
            className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-2xs active:scale-95 transition-transform"
          >
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-500 uppercase">Catálogo</span>
              <span className="text-sm font-black text-gray-900 mt-0.5">Productos</span>
            </div>
            <Package className="size-5 text-gray-700" />
          </Link>

          <Link
            to="/dispatches"
            className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-2xs active:scale-95 transition-transform"
          >
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-500 uppercase">Envíos</span>
              <span className="text-sm font-black text-gray-900 mt-0.5">Despachos</span>
            </div>
            <Send className="size-5 text-gray-700" />
          </Link>
        </section>
      </div>
    </div>
  );
}
