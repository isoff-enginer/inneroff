import { Link } from "@tanstack/react-router";
import { 
  Bell,
  SlidersHorizontal,
  ChevronDown,
  Calendar,
  Building2,
  Package,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Clock
} from "lucide-react";
import { useState, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

import { useBossDashboardData } from "@/features/dashboard/use-dashboard-data";
import { useInventoryData } from "@/features/inventory/use-inventory-data";
import { useSession } from "@/features/auth/session";

export function BossDashboard() {
  const { user } = useSession();
  const { 
    salesToday, 
    dispatchesStats,
    isLoading: isDashboardLoading 
  } = useBossDashboardData();

  const { inventory, isLoading: isInventoryLoading } = useInventoryData();

  const [timeFilter, setTimeFilter] = useState("Este Mes");
  const [storageFilter, setStorageFilter] = useState("Todas las sedes");

  const displayName = user?.fullName?.split(" ")[0] || "Director";

  // Calcular métricas de stock para el Stock Status Card
  const stockStats = useMemo(() => {
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;
    let deadStock = 0;

    inventory.forEach((item) => {
      if (item.quantity > 10) inStock++;
      else if (item.quantity > 0) lowStock++;
      else outOfStock++;
    });

    const totalItems = inventory.length;

    const chartData = [
      { name: "In stock", value: inStock || 1, color: "#1E1E1E" },
      { name: "Out of stock", value: outOfStock || 0, color: "#B85D35" },
      { name: "Low stock", value: lowStock || 0, color: "#F7C38A" },
      { name: "Dead stock", value: deadStock || 0, color: "#4A3328" },
    ];

    return {
      inStock,
      lowStock,
      outOfStock,
      deadStock,
      totalItems,
      chartData
    };
  }, [inventory]);

  if (isDashboardLoading || isInventoryLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF7F2]">
        <div className="size-8 animate-spin rounded-full border-3 border-stone-900 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-stone-900 pb-24 font-sans">
      <div className="mx-auto max-w-md px-5 pt-4 space-y-5">
        
        {/* TOP BAR */}
        <header className="flex items-center justify-between pt-2">
          {/* Logo Minimalista (Reloj de Arena / Símbolo) */}
          <div className="flex items-center justify-center size-10 rounded-2xl bg-stone-900 text-white shadow-xs">
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-5">
              <path d="M6 2v6h.01L6 8.01 10 12l-4 4 .01.01H6V22h12v-5.99h-.01L18 16l-4-4 4-3.99-.01-.01H18V2H6zm10 14.5V20H8v-3.5l4-4 4 4zm-4-5l-4-4V4h8v3.5l-4 4z"/>
            </svg>
          </div>

          {/* Notificaciones y Avatar */}
          <div className="flex items-center gap-3">
            <Link 
              to="/notifications" 
              className="relative flex size-10 items-center justify-center rounded-full bg-white border border-stone-200/80 shadow-xs transition-transform active:scale-95 text-stone-700"
            >
              <Bell className="size-5" />
              <span className="absolute top-2 right-2 size-2 rounded-full bg-[#FEE867] ring-2 ring-white" />
            </Link>

            <Link 
              to="/profile" 
              className="size-10 rounded-full overflow-hidden border-2 border-white shadow-xs bg-stone-200"
            >
              <img 
                src={user?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"} 
                alt="Usuario" 
                className="size-full object-cover"
              />
            </Link>
          </div>
        </header>

        {/* TITULOS */}
        <div>
          <p className="text-[15px] text-stone-600 font-medium">
            Hola, {displayName} 👋
          </p>
          <h1 className="text-[32px] font-black tracking-tight text-stone-950 leading-tight">
            Inventory Dashboard
          </h1>
        </div>

        {/* FILTROS / SELECTORES */}
        <div className="flex items-center gap-2.5">
          <button className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-stone-200/80 text-[13px] font-bold text-stone-800 shadow-2xs hover:bg-stone-50 transition-colors">
            <Calendar className="size-4 text-stone-500" />
            <span>{timeFilter}</span>
            <ChevronDown className="size-3.5 text-stone-400 ml-1" />
          </button>

          <button className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-stone-200/80 text-[13px] font-bold text-stone-800 shadow-2xs hover:bg-stone-50 transition-colors">
            <Building2 className="size-4 text-stone-500" />
            <span>{storageFilter}</span>
            <ChevronDown className="size-3.5 text-stone-400 ml-1" />
          </button>
        </div>

        {/* CARD 1: ORDERS / DESPACHOS (AMARILLO VIBRANTE) */}
        <div className="rounded-[32px] bg-[#FEE867] p-6 text-stone-950 shadow-sm relative overflow-hidden transition-all">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[17px] font-black tracking-tight">Orders</h2>
            <Link to="/dispatches" className="size-8 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10 transition-colors">
              <SlidersHorizontal className="size-4 text-stone-900" />
            </Link>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-1 pb-4">
            {/* 1. Overdue */}
            <div className="flex flex-col">
              <span className="text-2xl font-black">1</span>
              <span className="text-[11px] font-bold text-stone-700">Overdue</span>
              <div className="h-6 w-full bg-stone-900 rounded-md mt-6" />
            </div>

            {/* 2. Returns */}
            <div className="flex flex-col">
              <span className="text-2xl font-black">3</span>
              <span className="text-[11px] font-bold text-stone-700">Returns</span>
              <div className="mt-4 flex flex-wrap gap-1 w-full justify-center opacity-70">
                <span className="size-1.5 rounded-full bg-stone-900" />
                <span className="size-1.5 rounded-full bg-stone-900" />
                <span className="size-1.5 rounded-full bg-stone-900" />
                <span className="size-1.5 rounded-full bg-stone-900" />
                <span className="size-1.5 rounded-full bg-stone-900" />
                <span className="size-1.5 rounded-full bg-stone-900" />
              </div>
            </div>

            {/* 3. In progress */}
            <div className="flex flex-col">
              <span className="text-2xl font-black">14</span>
              <span className="text-[11px] font-bold text-stone-700">In progress</span>
              <div className="h-10 w-full mt-2 rounded-md bg-[repeating-linear-gradient(45deg,#1c1917,#1c1917_2px,transparent_2px,transparent_6px)] opacity-80" />
            </div>

            {/* 4. Completed */}
            <div className="flex flex-col">
              <span className="text-2xl font-black">94</span>
              <span className="text-[11px] font-bold text-stone-700">Completed</span>
              {/* Mini bar chart */}
              <div className="flex items-end gap-1 h-10 mt-2 justify-end">
                <div className="w-1.5 bg-stone-900 h-6 rounded-t-sm" />
                <div className="w-1.5 bg-stone-900 h-8 rounded-t-sm" />
                <div className="w-1.5 bg-stone-900 h-10 rounded-t-sm" />
                <div className="w-1.5 bg-stone-900 h-7 rounded-t-sm" />
                <div className="w-1.5 bg-stone-900 h-9 rounded-t-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: STOCK STATUS (NARANJA TERRACOTA) */}
        <div className="rounded-[32px] bg-[#F28C57] p-6 text-white shadow-sm relative overflow-hidden transition-all">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[17px] font-black tracking-tight text-white">Stock Status</h2>
            <Link to="/inventory" className="size-8 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors">
              <SlidersHorizontal className="size-4 text-white" />
            </Link>
          </div>

          <div className="flex items-center justify-between gap-2">
            {/* Leyenda a la izquierda */}
            <div className="flex flex-col gap-2 text-[13px] font-semibold text-white/95">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-stone-900 ring-2 ring-white/20" />
                <span>In stock</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#B85D35] ring-2 ring-white/20" />
                <span>Out of stock</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#F7C38A] ring-2 ring-white/20" />
                <span>Low stock</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#4A3328] ring-2 ring-white/20" />
                <span>Dead stock</span>
              </div>
            </div>

            {/* Donut Chart Moderno con Total en el centro */}
            <div className="relative size-36 shrink-0 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stockStats.chartData}
                    innerRadius={44}
                    outerRadius={62}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {stockStats.chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black tracking-tight text-stone-950 leading-none">
                  {stockStats.totalItems || 24}
                </span>
                <span className="text-[9px] font-bold text-stone-900 uppercase tracking-wider mt-0.5">
                  Total Items
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ACCESOS RÁPIDOS */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Link 
            to="/inventory" 
            className="flex items-center justify-between p-4 rounded-3xl bg-white border border-stone-200/80 shadow-2xs hover:border-stone-400 transition-all"
          >
            <div className="flex flex-col">
              <span className="text-[12px] font-bold text-stone-400 uppercase tracking-wider">Catálogo</span>
              <span className="text-[15px] font-black text-stone-900">Ver Productos</span>
            </div>
            <div className="size-9 rounded-full bg-[#FEE867] flex items-center justify-center">
              <Package className="size-4 text-stone-950" />
            </div>
          </Link>

          <Link 
            to="/dispatches" 
            className="flex items-center justify-between p-4 rounded-3xl bg-white border border-stone-200/80 shadow-2xs hover:border-stone-400 transition-all"
          >
            <div className="flex flex-col">
              <span className="text-[12px] font-bold text-stone-400 uppercase tracking-wider">Operación</span>
              <span className="text-[15px] font-black text-stone-900">Despachar</span>
            </div>
            <div className="size-9 rounded-full bg-stone-900 flex items-center justify-center">
              <ArrowRight className="size-4 text-white" />
            </div>
          </Link>
        </div>

      </div>
    </div>
  );
}
