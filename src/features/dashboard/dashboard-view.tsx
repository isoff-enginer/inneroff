import { Link, useNavigate } from "@tanstack/react-router";
import { 
  Bell,
  SlidersHorizontal,
  ChevronDown,
  Calendar,
  Building2,
  Package,
  ArrowRight,
  Send,
  CircleDollarSign,
  Factory,
  Archive,
  Crown,
  Layers,
  ChevronRight
} from "lucide-react";
import { useState, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

import { useBossDashboardData } from "@/features/dashboard/use-dashboard-data";
import { useInventoryData } from "@/features/inventory/use-inventory-data";
import { useDispatches } from "@/features/dispatches/use-dispatches";
import { useSession } from "@/features/auth/session";
import { formatCurrency } from "@/lib/format";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

type ViewPerspective = "boss" | "warehouse" | "factory";

export function BossDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { 
    salesToday, 
    paymentsToday,
    liquidationData,
    categoryChartData,
    isLoading: isDashboardLoading 
  } = useBossDashboardData();

  const { inventory, allProducts, categories, isLoading: isInventoryLoading } = useInventoryData();
  const { dispatches, createDispatch, isCreatingDispatch, locations } = useDispatches();

  const stores = useMemo(() => {
    const list = Array.isArray(locations) ? locations.filter(l => l.type === "store") : [];
    if (list.length > 0) return list;
    return [
      { id: "store-centro", name: "Centro", type: "store" },
      { id: "store-la-usa", name: "La Usa", type: "store" },
    ];
  }, [locations]);
  const warehouses = useMemo(() => Array.isArray(locations) ? locations.filter(l => l.type === "warehouse") : [], [locations]);
  const factories = useMemo(() => Array.isArray(locations) ? locations.filter(l => l.type === "factory") : [], [locations]);

  const [perspective, setPerspective] = useState<ViewPerspective>("boss");
  const [timeFilter, setTimeFilter] = useState("Hoy");
  const [storageFilter, setStorageFilter] = useState("Todas las sedes");

  // Quick Dispatch Modal State
  const [isQuickDispatchOpen, setIsQuickDispatchOpen] = useState(false);
  const [dispatchFromType, setDispatchFromType] = useState<"warehouse" | "factory">("warehouse");
  const [dispatchToType, setDispatchToType] = useState<"store" | "warehouse">("store");
  const [selectedTargetStore, setSelectedTargetStore] = useState("");
  const [dispatchItems, setDispatchItems] = useState<{ productId: string; name: string; quantity: number; unitValue: number }[]>([]);

  // Quick Recaudo Modal State
  const [isRecaudoModalOpen, setIsRecaudoModalOpen] = useState(false);
  const [recaudoStore, setRecaudoStore] = useState("");
  const [recaudoAmount, setRecaudoAmount] = useState("");
  const [recaudoCategory, setRecaudoCategory] = useState("Verde");
  const [isSubmittingRecaudo, setIsSubmittingRecaudo] = useState(false);

  const displayName = user?.fullName?.split(" ")[0] || "Director";

  // Liquidación de ventas agrupada estrictamente en 3 grupos:
  // 1. Blanco (Mamitas, Tornillo)
  // 2. Verde (Lisos, Largos, Minis)
  // 3. Productos adicionales (Rojas, Flores, Baldes, Pre-roll)
  const salesBreakdown = useMemo(() => {
    const blanco = liquidationData?.blanco || 0;
    const verde = liquidationData?.verde || 0;
    const adicionales = liquidationData?.adicionales || 0;
    const computedTotal = blanco + verde + adicionales;
    const totalVentas = computedTotal > 0 ? computedTotal : salesToday;
    const recaudado = paymentsToday;
    const faltante = Math.max(0, totalVentas - recaudado);

    return {
      totalVentas,
      recaudado,
      faltante,
      blanco,
      verde,
      adicionales,
      adicionalesBreakdown: liquidationData?.adicionalesBreakdown || {
        rojas: 0,
        flores: 0,
        baldes: 0,
        preroll: 0,
      }
    };
  }, [liquidationData, salesToday, paymentsToday]);

  // Métricas de Despachos
  const dispatchMetrics = useMemo(() => {
    let overdue = 0;
    let returns = 0;
    let inProgress = 0;
    let completed = 0;

    dispatches.forEach((d) => {
      if (d.status === "dispatched") inProgress++;
      else if (d.status === "received") completed++;
      else if (d.status === "cancelled") returns++;
      else if (d.status === "pending") overdue++;
    });

    return {
      overdue,
      returns,
      inProgress,
      completed,
      total: overdue + returns + inProgress + completed
    };
  }, [dispatches]);

  // Métricas de Stock para el Donut
  const stockStats = useMemo(() => {
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;
    let totalItems = 0;

    inventory.forEach((item) => {
      totalItems += item.quantity;
      if (item.quantity > 10) inStock++;
      else if (item.quantity > 0) lowStock++;
      else outOfStock++;
    });

    const chartData = [
      { name: "In stock", value: inStock, color: "#0F172A" },
      { name: "Out of stock", value: outOfStock, color: "#E11D48" },
      { name: "Low stock", value: lowStock, color: "#F59E0B" },
    ];

    const hasData = inStock > 0 || lowStock > 0 || outOfStock > 0;

    return {
      inStock,
      lowStock,
      outOfStock,
      totalUnits: totalItems,
      chartData: hasData ? chartData.filter(d => d.value > 0) : [{ name: "Sin items", value: 1, color: "#E2E8F0" }]
    };
  }, [inventory]);

  const relevantDispatches = useMemo(() => {
    if (perspective === "warehouse") {
      return dispatches.filter(d => d.fromLocationType === "warehouse" || d.toLocationType === "warehouse");
    }
    if (perspective === "factory") {
      return dispatches.filter(d => d.fromLocationType === "factory" || d.toLocationType === "factory");
    }
    return dispatches;
  }, [dispatches, perspective]);

  const handleCreateQuickDispatch = async () => {
    if (dispatchItems.length === 0) {
      toast.error("Agrega al menos un producto al despacho");
      return;
    }
    try {
      let fromLocId = "";
      let toLocId = "";

      if (dispatchFromType === "warehouse") {
        fromLocId = warehouses[0]?.id || "";
      } else {
        fromLocId = factories[0]?.id || "";
      }

      if (dispatchToType === "store") {
        toLocId = selectedTargetStore || stores[0]?.id || "";
      } else {
        toLocId = warehouses[0]?.id || "";
      }

      await createDispatch({
        fromType: dispatchFromType,
        fromId: fromLocId,
        toType: dispatchToType,
        toId: toLocId,
        notes: `Despacho rápido (${dispatchFromType} → ${dispatchToType})`,
        items: dispatchItems.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
          unitValue: i.unitValue
        }))
      });

      toast.success("Despacho creado exitosamente");
      setIsQuickDispatchOpen(false);
      setDispatchItems([]);
    } catch (err: any) {
      toast.error(err.message || "Error al crear despacho");
    }
  };

  const handleAddProductToDispatch = (prodId: string) => {
    const p = allProducts.find(item => item.id === prodId);
    if (!p) return;
    const existing = dispatchItems.find(i => i.productId === prodId);
    if (existing) {
      setDispatchItems(prev => prev.map(i => i.productId === prodId ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setDispatchItems(prev => [...prev, {
        productId: p.id,
        name: p.name,
        quantity: 1,
        unitValue: Number(p.unit_value || 0)
      }]);
    }
  };

  const handleRegisterRecaudo = async () => {
    const targetStoreId = recaudoStore || stores[0]?.id;
    if (!targetStoreId) {
      toast.error("Selecciona una tienda para registrar el recaudo");
      return;
    }
    const val = Number(recaudoAmount);
    if (!val || val <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }

    try {
      setIsSubmittingRecaudo(true);
      const matchedCat = allProducts.find(p => (p as any).product_categories?.name?.toLowerCase().includes(recaudoCategory.toLowerCase()))?.category_id;

      const { error: pError } = await supabase
        .from("payments")
        .insert({
          store_id: targetStoreId,
          amount: val,
          category_id: matchedCat || null,
          status: "confirmed",
          collected_by: user?.id || null,
          notes: `Recaudo desde Dashboard (${recaudoCategory})`,
        });

      if (pError) throw pError;

      queryClient.invalidateQueries({ queryKey: ["boss-dashboard-payments-30d"] });
      queryClient.invalidateQueries({ queryKey: ["boss-dashboard-sales-30d"] });
      queryClient.invalidateQueries({ queryKey: ["live_payments"] });
      queryClient.invalidateQueries({ queryKey: ["store_dispatches_total"] });

      toast.success(`Recaudo de ${formatCurrency(val)} registrado exitosamente`);
      setIsRecaudoModalOpen(false);
      setRecaudoAmount("");
    } catch (err: any) {
      toast.error(err.message || "Error al registrar recaudo");
    } finally {
      setIsSubmittingRecaudo(false);
    }
  };

  if (isDashboardLoading || isInventoryLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="size-8 animate-spin rounded-full border-3 border-slate-900 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-28 font-sans">
      <div className="mx-auto max-w-md px-5 pt-3 space-y-4">
        
        {/* TOP BAR */}
        <header className="flex items-center justify-between pt-1">
          <div className="flex items-center justify-center size-10 rounded-2xl bg-slate-900 text-white shadow-xs">
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-5">
              <path d="M6 2v6h.01L6 8.01 10 12l-4 4 .01.01H6V22h12v-5.99h-.01L18 16l-4-4 4-3.99-.01-.01H18V2H6zm10 14.5V20H8v-3.5l4-4 4 4zm-4-5l-4-4V4h8v3.5l-4 4z"/>
            </svg>
          </div>

          <div className="flex items-center gap-3">
            <Link 
              to="/notifications" 
              className="relative flex size-10 items-center justify-center rounded-full bg-white border border-slate-200/80 shadow-xs text-slate-700 active:scale-95 transition-transform"
            >
              <Bell className="size-5" />
              <span className="absolute top-2 right-2 size-2 rounded-full bg-slate-900 ring-2 ring-white" />
            </Link>

            <Link 
              to="/profile" 
              className="size-10 rounded-full overflow-hidden border-2 border-white shadow-xs bg-slate-200"
            >
              <img 
                src={user?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"} 
                alt="Usuario" 
                className="size-full object-cover"
              />
            </Link>
          </div>
        </header>

        {/* GREETING & TITLE */}
        <div>
          <p className="text-[14px] text-slate-500 font-medium">
            Hola, {displayName} 👋
          </p>
          <h1 className="text-[28px] font-black tracking-tight text-slate-950 leading-tight">
            Dashboard Operativo
          </h1>
        </div>

        {/* SELECTOR DE PERSPECTIVA (JEFE - BODEGA - FÁBRICA) */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <button
            onClick={() => setPerspective("boss")}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-black transition-all ${
              perspective === "boss" 
                ? "bg-slate-900 text-white shadow-xs" 
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Crown className="size-4" />
            <span>Jefe</span>
          </button>

          <button
            onClick={() => setPerspective("warehouse")}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-black transition-all ${
              perspective === "warehouse" 
                ? "bg-slate-900 text-white shadow-xs" 
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Archive className="size-4" />
            <span>Bodega</span>
          </button>

          <button
            onClick={() => setPerspective("factory")}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-black transition-all ${
              perspective === "factory" 
                ? "bg-slate-900 text-white shadow-xs" 
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Factory className="size-4" />
            <span>Fábrica</span>
          </button>
        </div>

        {/* FILTROS */}
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-slate-200/80 text-[12px] font-bold text-slate-800 shadow-xs">
            <Calendar className="size-3.5 text-slate-500" />
            <span>{timeFilter}</span>
            <ChevronDown className="size-3 text-slate-400" />
          </button>

          <button className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-slate-200/80 text-[12px] font-bold text-slate-800 shadow-xs">
            <Building2 className="size-3.5 text-slate-500" />
            <span>{perspective === "factory" ? "Fábrica Principal" : perspective === "warehouse" ? "Bodega Principal" : storageFilter}</span>
            <ChevronDown className="size-3 text-slate-400" />
          </button>
        </div>

        {/* VISTA 1: JEFE PRINCIPAL */}
        {perspective === "boss" && (
          <>
            {/* CARD 1: LIQUIDACIONES Y VENTAS (3 GRUPOS EXACTOS: BLANCO, VERDE, PRODUCTOS ADICIONALES) */}
            <div className="rounded-[32px] bg-slate-900 p-5 text-white shadow-sm relative overflow-hidden transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-extrabold uppercase tracking-wider text-slate-400">
                  Liquidación de Ventas
                </span>
                <Link to="/sales" className="size-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                  <SlidersHorizontal className="size-4 text-white" />
                </Link>
              </div>

              {/* Monto Total */}
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-[36px] font-black tracking-tight text-white">
                  {formatCurrency(salesBreakdown.totalVentas)}
                </span>
                <span className="text-[12px] font-bold text-slate-300 bg-white/10 px-2.5 py-0.5 rounded-full">
                  Hoy
                </span>
              </div>

              {/* LOS 3 GRUPOS EXACTOS */}
              <div className="space-y-2 mb-4">
                {/* 1. GRUPO BLANCO */}
                <div className="p-3 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[13px] font-black text-white flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full bg-slate-300 ring-2 ring-white/20" />
                      Blanco
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">Mamitas y Tornillo</span>
                  </div>
                  <span className="text-[16px] font-black text-white">
                    {formatCurrency(salesBreakdown.blanco)}
                  </span>
                </div>

                {/* 2. GRUPO VERDE */}
                <div className="p-3 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[13px] font-black text-emerald-300 flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-500/20" />
                      Verde
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">Lisos, Largos y Minis</span>
                  </div>
                  <span className="text-[16px] font-black text-emerald-400">
                    {formatCurrency(salesBreakdown.verde)}
                  </span>
                </div>

                {/* 3. GRUPO PRODUCTOS ADICIONALES (CON DESGLOSE INDIVIDUAL) */}
                <div className="p-3 rounded-2xl bg-white/10 border border-white/10 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[13px] font-black text-rose-300 flex items-center gap-1.5">
                        <span className="size-2.5 rounded-full bg-rose-400 ring-2 ring-rose-500/20" />
                        Productos adicionales
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">Total adicional</span>
                    </div>
                    <span className="text-[16px] font-black text-rose-300">
                      {formatCurrency(salesBreakdown.adicionales)}
                    </span>
                  </div>

                  {/* DESGLOSE INDIVIDUAL: ROJAS, FLORES, BALDES, PRE-ROLL */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-[11px]">
                    <div className="flex justify-between bg-white/5 p-2 rounded-xl">
                      <span className="text-slate-300 font-bold">• Rojas</span>
                      <span className="font-black text-white">{formatCurrency(salesBreakdown.adicionalesBreakdown.rojas)}</span>
                    </div>
                    <div className="flex justify-between bg-white/5 p-2 rounded-xl">
                      <span className="text-slate-300 font-bold">• Flores</span>
                      <span className="font-black text-white">{formatCurrency(salesBreakdown.adicionalesBreakdown.flores)}</span>
                    </div>
                    <div className="flex justify-between bg-white/5 p-2 rounded-xl">
                      <span className="text-slate-300 font-bold">• Baldes</span>
                      <span className="font-black text-white">{formatCurrency(salesBreakdown.adicionalesBreakdown.baldes)}</span>
                    </div>
                    <div className="flex justify-between bg-white/5 p-2 rounded-xl">
                      <span className="text-slate-300 font-bold">• Pre-roll</span>
                      <span className="font-black text-white">{formatCurrency(salesBreakdown.adicionalesBreakdown.preroll)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dinero Recaudado y Dinero Faltante */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-slate-400">💰 Dinero Recaudado</span>
                  <span className="text-[17px] font-black text-emerald-400">
                    {formatCurrency(salesBreakdown.recaudado)}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-rose-300">⏳ Por Justificar / Faltante</span>
                  <span className="text-[17px] font-black text-rose-400">
                    {formatCurrency(salesBreakdown.faltante)}
                  </span>
                </div>
              </div>
            </div>

            {/* CARD 2: ORDERS / DESPACHOS */}
            <div className="rounded-[32px] bg-white p-5 border border-slate-200/80 shadow-xs relative overflow-hidden transition-all">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[15px] font-black tracking-tight text-slate-900">Despachos & Logística</h2>
                <Link to="/dispatches" className="size-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                  <SlidersHorizontal className="size-4 text-slate-700" />
                </Link>
              </div>

              <div className="grid grid-cols-4 gap-2 pt-1 pb-2">
                <div className="flex flex-col p-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                  <span className="text-2xl font-black text-slate-900">{dispatchMetrics.overdue}</span>
                  <span className="text-[10px] font-bold text-slate-500 mt-1">Pendiente</span>
                </div>

                <div className="flex flex-col p-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                  <span className="text-2xl font-black text-slate-900">{dispatchMetrics.returns}</span>
                  <span className="text-[10px] font-bold text-slate-500 mt-1">Devueltos</span>
                </div>

                <div className="flex flex-col p-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                  <span className="text-2xl font-black text-slate-900">{dispatchMetrics.inProgress}</span>
                  <span className="text-[10px] font-bold text-slate-500 mt-1">En curso</span>
                </div>

                <div className="flex flex-col p-2.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
                  <span className="text-2xl font-black text-emerald-900">{dispatchMetrics.completed}</span>
                  <span className="text-[10px] font-bold text-emerald-700 mt-1">Recibidos</span>
                </div>
              </div>
            </div>

            {/* CARD 3: STOCK STATUS CON DONUT CHART */}
            <div className="rounded-[32px] bg-white p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[15px] font-black tracking-tight text-slate-900">Estado de Inventario</h2>
                <Link to="/inventory" className="size-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                  <SlidersHorizontal className="size-4 text-slate-700" />
                </Link>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-2 text-[12px] font-bold text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-slate-900" />
                    <span>Disponible ({stockStats.inStock})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-rose-600" />
                    <span>Agotado ({stockStats.outOfStock})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-amber-500" />
                    <span>Poco stock ({stockStats.lowStock})</span>
                  </div>
                </div>

                <div className="relative size-32 shrink-0 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stockStats.chartData}
                        innerRadius={38}
                        outerRadius={54}
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
                    <span className="text-lg font-black tracking-tight text-slate-950 leading-none">
                      {stockStats.totalUnits}
                    </span>
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                      Total Unids
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* VISTA 2: BODEGA */}
        {perspective === "warehouse" && (
          <div className="space-y-4">
            <div className="rounded-[32px] bg-slate-900 p-5 text-white shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-extrabold uppercase text-slate-400 flex items-center gap-1.5">
                  <Archive className="size-4" /> Bodega Principal · Despachos a Tienda
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 my-3">
                <div className="p-3 rounded-2xl bg-white/10 border border-white/10">
                  <span className="text-[11px] font-bold text-slate-300 uppercase">Recaudado Tiendas</span>
                  <p className="text-xl font-black text-emerald-400 mt-0.5">
                    {formatCurrency(salesBreakdown.recaudado)}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-white/10 border border-white/10">
                  <span className="text-[11px] font-bold text-rose-300 uppercase">Faltante por Cobrar</span>
                  <p className="text-xl font-black text-rose-400 mt-0.5">
                    {formatCurrency(salesBreakdown.faltante)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={() => {
                    setDispatchFromType("warehouse");
                    setDispatchToType("store");
                    setIsQuickDispatchOpen(true);
                  }}
                  className="flex-1 h-12 rounded-2xl bg-white text-slate-950 font-black text-[13px] hover:bg-slate-100 shadow-sm"
                >
                  <Send className="size-4 mr-1.5" /> Despachar a Tienda
                </Button>

                <Button 
                  onClick={() => setIsRecaudoModalOpen(true)}
                  className="h-12 px-4 rounded-2xl bg-white/10 text-white font-black text-[13px] border border-white/20 hover:bg-white/20"
                >
                  <CircleDollarSign className="size-4 mr-1" /> Recaudar
                </Button>
              </div>
            </div>

            <div className="rounded-[32px] bg-white p-5 border border-slate-200/80 shadow-xs">
              <h3 className="text-[15px] font-black text-slate-900 mb-3 flex items-center justify-between">
                <span>Despachos en Curso</span>
                <span className="text-[12px] font-bold text-slate-400">{relevantDispatches.length} envíos</span>
              </h3>

              <div className="space-y-2.5">
                {relevantDispatches.slice(0, 4).map((d) => (
                  <div key={d.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[14px] font-bold text-slate-900">
                        {d.toLocationName} · #{d.dispatchNumber}
                      </span>
                      <span className="text-[12px] text-slate-500 font-medium">
                        {d.date} • {formatCurrency(d.totalValue || 0)}
                      </span>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      d.status === "received" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-800"
                    }`}>
                      {d.status === "received" ? "Recibido" : "Enviado"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VISTA 3: FÁBRICA */}
        {perspective === "factory" && (
          <div className="space-y-4">
            <div className="rounded-[32px] bg-slate-900 p-5 text-white shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-extrabold uppercase text-slate-400 flex items-center gap-1.5">
                  <Factory className="size-4" /> Fábrica · Despacho de Producción
                </span>
              </div>

              <p className="text-[13px] text-slate-300 font-medium my-2">
                Despacha productos terminados en sus presentaciones hacia la Bodega Principal.
              </p>

              <div className="pt-2">
                <Button 
                  onClick={() => {
                    setDispatchFromType("factory");
                    setDispatchToType("warehouse");
                    setIsQuickDispatchOpen(true);
                  }}
                  className="w-full h-12 rounded-2xl bg-white text-slate-950 font-black text-[14px] hover:bg-slate-100 shadow-sm"
                >
                  <Send className="size-4 mr-2" /> Despachar Presentaciones a Bodega
                </Button>
              </div>
            </div>

            <div className="rounded-[32px] bg-white p-5 border border-slate-200/80 shadow-xs">
              <h3 className="text-[15px] font-black text-slate-900 mb-3 flex items-center justify-between">
                <span>Presentaciones Disponibles</span>
                <span className="text-[12px] font-bold text-slate-400">{allProducts.length} productos</span>
              </h3>

              <div className="grid grid-cols-2 gap-2.5">
                {allProducts.map((p) => (
                  <div key={p.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 flex flex-col justify-between">
                    <span className="text-[13px] font-black text-slate-900 truncate">{p.name}</span>
                    <span className="text-[11px] text-slate-500 font-bold">${Number(p.unit_value || 0).toLocaleString()} c/u</span>
                    <button 
                      onClick={() => handleAddProductToDispatch(p.id)}
                      className="mt-2 text-[11px] font-bold bg-slate-900 text-white py-1.5 px-2 rounded-xl active:scale-95 hover:bg-slate-800 transition-colors"
                    >
                      + Despachar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ACCESOS RÁPIDOS INFERIORES */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Link 
            to="/inventory" 
            className="flex items-center justify-between p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-400 transition-all"
          >
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Catálogo</span>
              <span className="text-[15px] font-black text-slate-900">Ver Productos</span>
            </div>
            <div className="size-9 rounded-full bg-slate-100 flex items-center justify-center">
              <Package className="size-4 text-slate-900" />
            </div>
          </Link>

          <Link 
            to="/dispatches" 
            className="flex items-center justify-between p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-400 transition-all"
          >
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Operación</span>
              <span className="text-[15px] font-black text-slate-900">Despachos</span>
            </div>
            <div className="size-9 rounded-full bg-slate-900 flex items-center justify-center">
              <ArrowRight className="size-4 text-white" />
            </div>
          </Link>
        </div>

      </div>

      {/* DRAWER: NUEVO DESPACHO RÁPIDO */}
      <Drawer open={isQuickDispatchOpen} onOpenChange={setIsQuickDispatchOpen}>
        <DrawerContent className="bg-[#F8FAFC] border-t-0 px-5 pb-8">
          <div className="flex flex-col max-h-[85vh]">
            <div className="py-3 border-b border-slate-200 mb-3 flex-shrink-0">
              <h2 className="text-xl font-black text-slate-950">
                {dispatchFromType === "factory" ? "Despacho de Fábrica a Bodega" : "Despacho de Bodega a Tienda"}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pb-3 scrollbar-hide">
              {dispatchToType === "store" && (
                <div>
                  <label className="text-[12px] font-bold text-slate-600 block mb-1">Tienda Destino *</label>
                  <select 
                    value={selectedTargetStore}
                    onChange={(e) => setSelectedTargetStore(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-2xl p-3 text-[14px] font-bold text-slate-900 outline-none"
                  >
                    <option value="">Selecciona la tienda destino</option>
                    {stores.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[12px] font-bold text-slate-600 block mb-1">Agregar Productos al Despacho</label>
                <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
                  {allProducts.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleAddProductToDispatch(p.id)}
                      className="whitespace-nowrap px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[12px] font-bold text-slate-800 hover:bg-slate-100"
                    >
                      + {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lista de productos seleccionados */}
              <div className="space-y-2">
                <span className="text-[12px] font-bold text-slate-500 uppercase">Ítems a despachar:</span>
                {dispatchItems.length === 0 ? (
                  <p className="text-[13px] text-slate-400 italic py-2">Ningún producto seleccionado</p>
                ) : (
                  dispatchItems.map(item => (
                    <div key={item.productId} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-slate-900">{item.name}</span>
                        <span className="text-[11px] text-slate-500">${item.unitValue.toLocaleString()} c/u</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setDispatchItems(prev => prev.map(i => i.productId === item.productId ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))}
                          className="size-7 rounded-lg bg-slate-100 flex items-center justify-center font-bold"
                        >-</button>
                        <span className="text-sm font-black w-6 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => setDispatchItems(prev => prev.map(i => i.productId === item.productId ? { ...i, quantity: i.quantity + 1 } : i))}
                          className="size-7 rounded-lg bg-slate-100 flex items-center justify-center font-bold"
                        >+</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 flex-shrink-0">
              <Button 
                onClick={handleCreateQuickDispatch} 
                disabled={isCreatingDispatch || dispatchItems.length === 0}
                className="w-full h-14 rounded-2xl font-black text-[15px] bg-slate-900 text-white hover:bg-slate-800"
              >
                {isCreatingDispatch ? "Despachando..." : "Confirmar y Enviar Despacho"}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* DRAWER: REGISTRAR RECAUDO */}
      <Drawer open={isRecaudoModalOpen} onOpenChange={setIsRecaudoModalOpen}>
        <DrawerContent className="bg-white border-t-0 px-5 pb-8">
          <div className="flex flex-col">
            <div className="py-3 border-b border-slate-100 mb-3">
              <h2 className="text-xl font-black text-slate-900">Registrar Recaudo de Tienda</h2>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-[12px] font-bold text-slate-500 block mb-1">Tienda</label>
                <select 
                  value={recaudoStore} 
                  onChange={(e) => setRecaudoStore(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-[14px] font-bold text-slate-900 outline-none"
                >
                  <option value="">Selecciona tienda</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[12px] font-bold text-slate-500 block mb-1">Monto a Recaudar ($)</label>
                <input 
                  type="number" 
                  value={recaudoAmount} 
                  onChange={(e) => setRecaudoAmount(e.target.value)}
                  placeholder="Ej. 850000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-[15px] font-bold text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="text-[12px] font-bold text-slate-500 block mb-1">Categoría</label>
                <div className="grid grid-cols-3 gap-2">
                  {["Blanco", "Verde", "Productos adicionales"].map((catName) => (
                    <button 
                      key={catName}
                      type="button"
                      onClick={() => setRecaudoCategory(catName)}
                      className={`p-3 rounded-xl text-[12px] font-bold border transition-colors ${recaudoCategory.toLowerCase() === catName.toLowerCase() ? "bg-slate-900 border-slate-900 text-white" : "bg-slate-50 border-slate-200 text-slate-600"}`}
                    >
                      {catName}
                    </button>
                  ))}
                </div>
              </div>

              <Button 
                onClick={handleRegisterRecaudo}
                disabled={isSubmittingRecaudo || !recaudoAmount}
                className="w-full h-14 rounded-2xl font-black text-[15px] bg-slate-900 text-white hover:bg-slate-800 mt-2"
              >
                {isSubmittingRecaudo ? "Registrando Recaudo..." : "Confirmar Recaudo"}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

    </div>
  );
}
