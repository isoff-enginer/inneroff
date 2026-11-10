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
  ChevronRight,
  Eye,
  EyeOff,
  Info,
  Check,
  Plus,
  Minus,
  Sparkles
} from "lucide-react";
import { useState, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

import { useBossDashboardData } from "@/features/dashboard/use-dashboard-data";
import { useInventoryData } from "@/features/inventory/use-inventory-data";
import { useDispatches, type LiveDispatch } from "@/features/dispatches/use-dispatches";
import { useSession } from "@/features/auth/session";
import { formatCurrency } from "@/lib/format";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { getProductPackagings, type ProductPackaging } from "@/features/inventory/product-presentations";
import { DispatchDetailsDrawer } from "@/features/dispatches/components/dispatch-details-drawer";
import { DEFAULT_CENTRO_UUID, DEFAULT_LA_USA_UUID } from "@/features/sales/use-sales-data";
import { useProductLiquidation, CANONICAL_9_NAMES } from "@/features/sales/use-product-liquidation";

type ViewPerspective = "boss" | "warehouse" | "factory";

interface DispatchPackagingItem {
  productId: string;
  name: string;
  selectedPkgId: string;
  pkgLabel: string;
  multiplier: number;
  pkgCount: number;
  packagePrice: number;
  availablePackagings: ProductPackaging[];
}

export function BossDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { 
    salesToday, 
    paymentsToday,
    liquidationData,
    isLoading: isDashboardLoading 
  } = useBossDashboardData();

  const { inventory, allProducts, isLoading: isInventoryLoading } = useInventoryData();
  const { dispatches, createDispatch, isCreatingDispatch, locations } = useDispatches();
  const { liquidationMap, consolidation } = useProductLiquidation();

  const stores = useMemo(() => {
    const list = Array.isArray(locations) 
      ? locations.filter(l => l.type === "store" && !l.name.toLowerCase().includes("prueba") && (l.name.toLowerCase().includes("centro") || l.name.toLowerCase().includes("usa"))) 
      : [];
    if (list.length > 0) return list;
    return [
      { id: DEFAULT_CENTRO_UUID, name: "Centro", type: "store" },
      { id: DEFAULT_LA_USA_UUID, name: "La Usa", type: "store" },
    ];
  }, [locations]);
  const warehouses = useMemo(() => Array.isArray(locations) ? locations.filter(l => l.type === "warehouse") : [], [locations]);
  const factories = useMemo(() => Array.isArray(locations) ? locations.filter(l => l.type === "factory") : [], [locations]);

  const [perspective, setPerspective] = useState<ViewPerspective>("boss");
  const [timeFilter, setTimeFilter] = useState("Hoy");
  const [storageFilter, setStorageFilter] = useState("Todas las sedes");
  const [showAmountEye, setShowAmountEye] = useState(true);
  const [isAdicionalesExpanded, setIsAdicionalesExpanded] = useState(false);

  // Dispatch Details Drawer State (Con fotos de productos y empaques)
  const [selectedDispatchDetail, setSelectedDispatchDetail] = useState<LiveDispatch | null>(null);
  const [isDispatchDetailOpen, setIsDispatchDetailOpen] = useState(false);

  // Quick Dispatch Modal State (Con presentaciones / empaques)
  const [isQuickDispatchOpen, setIsQuickDispatchOpen] = useState(false);
  const [dispatchFromType, setDispatchFromType] = useState<"warehouse" | "factory">("warehouse");
  const [dispatchToType, setDispatchToType] = useState<"store" | "warehouse">("store");
  const [selectedTargetStore, setSelectedTargetStore] = useState("");
  const [dispatchPackagingItems, setDispatchPackagingItems] = useState<DispatchPackagingItem[]>([]);

  // Quick Recaudo Modal State (Categoría General vs Producto / Presentación)
  const [isRecaudoModalOpen, setIsRecaudoModalOpen] = useState(false);
  const [recaudoStore, setRecaudoStore] = useState("");
  const [recaudoAmount, setRecaudoAmount] = useState("");
  const [recaudoMode, setRecaudoMode] = useState<"category" | "product">("category");
  const [recaudoCategory, setRecaudoCategory] = useState("Blanco");
  const [recaudoProdId, setRecaudoProdId] = useState("");
  const [recaudoPkgId, setRecaudoPkgId] = useState("");
  const [recaudoPkgCount, setRecaudoPkgCount] = useState(1);
  const [isSubmittingRecaudo, setIsSubmittingRecaudo] = useState(false);

  const displayName = user?.fullName?.split(" ")[0] || "Director";

  // Liquidación de ventas agrupada estrictamente en 3 grupos:
  // 1. Blanco (Mamitas, Tornillo)
  // 2. Verde (Lisos, Largos, Minis)
  // 3. Productos adicionales (Rojas, Flores, Baldes, Pre-roll)
  const salesBreakdown = useMemo(() => {
    // Si consolidation tiene datos de despachos a tiendas, priorizamos esos montos exactos
    const useConsolidation = consolidation.totalVentas > 0;
    const blanco = useConsolidation ? consolidation.totalByGroup.blanco : (liquidationData?.blanco || 0);
    const verde = useConsolidation ? consolidation.totalByGroup.verde : (liquidationData?.verde || 0);
    const adicionales = useConsolidation ? consolidation.totalByGroup.adicionales : (liquidationData?.adicionales || 0);

    const computedTotal = blanco + verde + adicionales;
    const totalVentas = useConsolidation ? consolidation.totalVentas : (computedTotal > 0 ? computedTotal : salesToday);
    const recaudado = useConsolidation ? consolidation.totalRecaudado : paymentsToday;
    const faltante = Math.max(0, totalVentas - recaudado);

    const totalCalc = blanco + verde + adicionales;
    const pctBlanco = totalCalc > 0 ? (blanco / totalCalc) * 100 : 0;
    const pctVerde = totalCalc > 0 ? (verde / totalCalc) * 100 : 0;
    const pctAdicionales = totalCalc > 0 ? (adicionales / totalCalc) * 100 : 0;

    const adicionalesBreakdown = useConsolidation
      ? consolidation.totalByGroup.adicionalesBreakdown
      : (liquidationData?.adicionalesBreakdown || { rojas: 0, flores: 0, baldes: 0, preroll: 0 });

    return {
      totalVentas,
      recaudado,
      faltante,
      blanco,
      verde,
      adicionales,
      pctBlanco,
      pctVerde,
      pctAdicionales,
      adicionalesBreakdown
    };
  }, [consolidation, liquidationData, salesToday, paymentsToday]);

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

  // Despacho rápido por presentaciones / empaques
  const handleCreateQuickDispatch = async () => {
    if (dispatchPackagingItems.length === 0) {
      toast.error("Agrega al menos una presentación al despacho");
      return;
    }

    // REGLA FUNDAMENTAL: Fábrica no puede despachar a Bodega si no se ha pagado la totalidad
    if (dispatchFromType === "factory" || dispatchToType === "warehouse") {
      for (const item of dispatchPackagingItems) {
        const details = getProductPackagings(item.name);
        const lock = liquidationMap[details.name];
        if (lock?.isBlocked) {
          toast.error(`🔒 Fábrica Bloqueada: No puedes despachar ${details.name} a Bodega porque la tienda tiene un saldo pendiente de liquidar de ${formatCurrency(lock.pendingVal)}. Deben pagar la totalidad primero.`);
          return;
        }
      }
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

      const notesDetail = dispatchPackagingItems.map(
        i => `${i.pkgCount}x ${i.pkgLabel} ${i.name}`
      ).join(", ");

      await createDispatch({
        fromType: dispatchFromType,
        fromId: fromLocId,
        toType: dispatchToType,
        toId: toLocId,
        notes: `Despacho de presentaciones: ${notesDetail}`,
        items: dispatchPackagingItems.map(i => ({
          productId: i.productId,
          quantity: i.pkgCount * i.multiplier, // Unidades físicas reales descontadas de inventario
          unitValue: Math.round(i.packagePrice / i.multiplier), // Valor por unidad
        }))
      });

      toast.success("Despacho de presentaciones creado exitosamente");
      setIsQuickDispatchOpen(false);
      setDispatchPackagingItems([]);
    } catch (err: any) {
      toast.error(err.message || "Error al crear despacho");
    }
  };

  const handleAddProductToDispatch = (prodId: string) => {
    const p = allProducts.find(item => item.id === prodId);
    if (!p) return;
    const details = getProductPackagings(p.name);

    // REGLA ESTRICTA DE BLOQUEO: Si el producto tiene saldo pendiente por liquidar en tienda,
    // Fábrica y Bodega tienen bloqueado despacharlo hasta que se liquide al 100%.
    const lock = liquidationMap[details.name];
    if (lock?.isBlocked) {
      toast.error(`🔒 Bloqueado: No se puede despachar ${details.name} hasta que la tienda liquide ${formatCurrency(lock.pendingVal)} pendientes.`);
      return;
    }

    const defaultPkg = details.packagings[0] || {
      id: "unidad",
      label: "Unidad",
      multiplier: 1,
      packagePrice: details.unitPrice,
    };

    const existing = dispatchPackagingItems.find(i => i.productId === prodId);
    if (existing) {
      setDispatchPackagingItems(prev => prev.map(i => i.productId === prodId ? { ...i, pkgCount: i.pkgCount + 1 } : i));
    } else {
      setDispatchPackagingItems(prev => [...prev, {
        productId: p.id,
        name: details.name,
        selectedPkgId: defaultPkg.id,
        pkgLabel: defaultPkg.label,
        multiplier: defaultPkg.multiplier,
        pkgCount: 1,
        packagePrice: defaultPkg.packagePrice,
        availablePackagings: details.packagings,
      }]);
    }
  };

  const handleChangeItemPackaging = (productId: string, pkgId: string) => {
    setDispatchPackagingItems(prev => prev.map(item => {
      if (item.productId === productId) {
        const selected = item.availablePackagings.find(pkg => pkg.id === pkgId);
        if (selected) {
          return {
            ...item,
            selectedPkgId: selected.id,
            pkgLabel: selected.label,
            multiplier: selected.multiplier,
            packagePrice: selected.packagePrice,
          };
        }
      }
      return item;
    }));
  };

  // Abrir detalle visual con fotos de un despacho
  const handleOpenDispatchDetail = (dispatch: LiveDispatch) => {
    setSelectedDispatchDetail(dispatch);
    setIsDispatchDetailOpen(true);
  };

  // Recaudo Inteligente (Categoría General vs Producto / Presentación)
  const handleRegisterRecaudo = async () => {
    // Validar tienda de recaudo (estrictamente Centro o La Usa, jamás Tienda Prueba)
    let targetStoreId = recaudoStore || stores[0]?.id;
    const currentStoreObj = stores.find(s => s.id === targetStoreId);
    if (!currentStoreObj || currentStoreObj.name.toLowerCase().includes("prueba")) {
      targetStoreId = stores.find(s => !s.name.toLowerCase().includes("prueba"))?.id || stores[0]?.id;
    }

    if (!targetStoreId) {
      toast.error("Selecciona una tienda oficial (Centro o La Usa) para registrar el recaudo");
      return;
    }

    const val = Number(recaudoAmount);
    if (!val || val <= 0) {
      toast.error("Ingresa un monto válido a recaudar");
      return;
    }

    try {
      setIsSubmittingRecaudo(true);
      const { data: authData } = await supabase.auth.getUser();
      const currentAuthId = authData?.user?.id || user?.id || null;

      let targetCatId = "";
      let notes = "";

      if (recaudoMode === "category") {
        // Modo 1: Recaudo por Categoría General
        const { data: catData } = await supabase
          .from("product_categories")
          .select("id")
          .ilike("name", `%${recaudoCategory}%`)
          .limit(1);

        targetCatId = catData?.[0]?.id || "";
        notes = `Recaudo General de Categoría: ${recaudoCategory}`;
      } else {
        // Modo 2: Recaudo por Producto / Presentación
        const selectedProd = allProducts.find(p => p.id === recaudoProdId) || allProducts[0];
        targetCatId = selectedProd?.category_id || "";
        const prodDetails = getProductPackagings(selectedProd?.name || "");
        const pkg = prodDetails.packagings.find(pk => pk.id === recaudoPkgId) || prodDetails.packagings[0];
        notes = `Recaudo Producto: ${prodDetails.name} (${recaudoPkgCount}x ${pkg?.label || "Unidad"})`;
      }

      // Fallback si la categoría no resuelve
      if (!targetCatId) {
        const { data: anyCat } = await supabase.from("product_categories").select("id").limit(1);
        targetCatId = anyCat?.[0]?.id || "";
      }

      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      // Sanitizar IDs a UUIDs reales de Supabase
      if (!UUID_REGEX.test(targetStoreId)) {
        const { data: dbStores } = await supabase.from("stores").select("id").not("name", "ilike", "%prueba%").limit(1);
        targetStoreId = dbStores?.[0]?.id || DEFAULT_CENTRO_UUID;
      }
      if (!UUID_REGEX.test(targetCatId)) {
        const { data: dbCats } = await supabase.from("product_categories").select("id").limit(1);
        targetCatId = dbCats?.[0]?.id || "33333333-3333-3333-3333-333333333333";
      }

      // 1. Intentar registrar vía RPC de Postgres (SECURITY DEFINER para eludir RLS)
      let recordedViaRpc = false;
      try {
        const { data: rpcPayId, error: rpcErr } = await supabase.rpc("register_payment", {
          p_store_id: targetStoreId,
          p_category_id: targetCatId,
          p_amount: val,
          p_notes: notes || undefined,
        });

        if (!rpcErr && rpcPayId) {
          recordedViaRpc = true;
        }
      } catch (rpcEx) {
        console.warn("register_payment RPC fallback:", rpcEx);
      }

      // 2. Fallback: Inserción directa en tabla payments
      if (!recordedViaRpc) {
        const payPayload: any = {
          store_id: targetStoreId,
          amount: val,
          category_id: targetCatId,
          status: "confirmed",
          notes,
        };
        if (currentAuthId && UUID_REGEX.test(currentAuthId)) {
          payPayload.collected_by = currentAuthId;
        }

        const { error: pError } = await supabase.from("payments").insert(payPayload);
        if (pError) {
          // Si falló por RLS sobre collected_by, reintentar sin collected_by
          if (payPayload.collected_by) {
            delete payPayload.collected_by;
            const { error: retryErr } = await supabase.from("payments").insert(payPayload);
            if (retryErr) {
              console.warn("Direct payment insert retry:", retryErr);
            }
          }
        }
      }

      // Intentar asentar en account_entries
      try {
        await supabase.from("account_entries").insert({
          store_id: targetStoreId,
          category_id: targetCatId,
          amount: val,
          entry_type: "income",
          created_by: currentAuthId,
          notes,
        });
      } catch (aeErr) {
        console.warn("Account entry optional sync:", aeErr);
      }

      queryClient.invalidateQueries({ queryKey: ["boss-dashboard-payments-30d"] });
      queryClient.invalidateQueries({ queryKey: ["boss-dashboard-sales-30d"] });
      queryClient.invalidateQueries({ queryKey: ["live_payments"] });
      queryClient.invalidateQueries({ queryKey: ["store_dispatches_total"] });

      toast.success(`Recaudo de ${formatCurrency(val)} registrado exitosamente`);
      setIsRecaudoModalOpen(false);
      setRecaudoAmount("");
      setRecaudoPkgCount(1);
    } catch (err: any) {
      toast.error(err.message || "Error al registrar recaudo");
    } finally {
      setIsSubmittingRecaudo(false);
    }
  };

  // Manejador de cambio de producto en recaudo
  const handleSelectRecaudoProduct = (prodId: string) => {
    setRecaudoProdId(prodId);
    const prod = allProducts.find(p => p.id === prodId);
    if (prod) {
      const details = getProductPackagings(prod.name);
      const firstPkg = details.packagings[0];
      setRecaudoPkgId(firstPkg.id);
      setRecaudoPkgCount(1);
      setRecaudoAmount(String(firstPkg.packagePrice));
    }
  };

  const handleSelectRecaudoPkg = (pkgId: string) => {
    setRecaudoPkgId(pkgId);
    const prod = allProducts.find(p => p.id === recaudoProdId) || allProducts[0];
    if (prod) {
      const details = getProductPackagings(prod.name);
      const pkg = details.packagings.find(pk => pk.id === pkgId);
      if (pkg) {
        setRecaudoAmount(String(pkg.packagePrice * recaudoPkgCount));
      }
    }
  };

  const handleUpdateRecaudoPkgCount = (delta: number) => {
    const newCount = Math.max(1, recaudoPkgCount + delta);
    setRecaudoPkgCount(newCount);
    const prod = allProducts.find(p => p.id === recaudoProdId) || allProducts[0];
    if (prod) {
      const details = getProductPackagings(prod.name);
      const pkg = details.packagings.find(pk => pk.id === recaudoPkgId) || details.packagings[0];
      if (pkg) {
        setRecaudoAmount(String(pkg.packagePrice * newCount));
      }
    }
  };

  if (isDashboardLoading || isInventoryLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="size-8 animate-spin rounded-full border-3 border-slate-900 border-t-transparent" />
      </div>
    );
  }

  // Cálculos para el Donut SVG Minimalista (inspirado en la captura del usuario)
  const totalLiq = salesBreakdown.totalVentas || 0;
  const cRadius = 36;
  const cCircumference = 2 * Math.PI * cRadius; // ~226.19

  const adicLength = totalLiq > 0 ? (salesBreakdown.adicionales / totalLiq) * cCircumference : 0;
  const verdeLength = totalLiq > 0 ? (salesBreakdown.verde / totalLiq) * cCircumference : 0;
  const blancoLength = totalLiq > 0 ? (salesBreakdown.blanco / totalLiq) * cCircumference : 0;

  const adicOffset = 0;
  const verdeOffset = -adicLength;
  const blancoOffset = -(adicLength + verdeLength);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-28 font-sans selection:bg-slate-200">
      <div className="mx-auto max-w-md px-5 pt-3 space-y-4">
        
        {/* TOP BAR MINIMALISTA */}
        <header className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-slate-900 text-white font-black text-sm shadow-xs">
              R
            </span>
            <span className="text-[13px] font-black tracking-tight text-slate-900">
              Reserva Operaciones
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link 
              to="/notifications" 
              className="relative flex size-9 items-center justify-center rounded-full bg-white border border-slate-200/80 shadow-xs text-slate-700 active:scale-95 transition-transform"
            >
              <Bell className="size-4" />
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-slate-900 ring-2 ring-white" />
            </Link>

            <Link 
              to="/profile" 
              className="size-9 rounded-full overflow-hidden border-2 border-white shadow-xs bg-slate-100"
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
          <p className="text-[13px] text-slate-400 font-medium">
            Hola, {displayName} 👋
          </p>
          <h1 className="text-[26px] font-black tracking-tight text-slate-950 leading-tight">
            Dashboard Operativo
          </h1>
        </div>

        {/* SELECTOR DE PERSPECTIVA (JEFE - BODEGA - FÁBRICA) */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <button
            onClick={() => setPerspective("boss")}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2 rounded-xl text-[13px] font-black transition-all ${
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
            className={`flex flex-1 items-center justify-center gap-1.5 py-2 rounded-xl text-[13px] font-black transition-all ${
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
            className={`flex flex-1 items-center justify-center gap-1.5 py-2 rounded-xl text-[13px] font-black transition-all ${
              perspective === "factory" 
                ? "bg-slate-900 text-white shadow-xs" 
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Factory className="size-4" />
            <span>Fábrica</span>
          </button>
        </div>

        {/* FILTROS MINIMALISTAS */}
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white border border-slate-200/80 text-[12px] font-bold text-slate-800 shadow-xs">
            <Calendar className="size-3.5 text-slate-400" />
            <span>{timeFilter}</span>
            <ChevronDown className="size-3 text-slate-400" />
          </button>

          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white border border-slate-200/80 text-[12px] font-bold text-slate-800 shadow-xs">
            <Building2 className="size-3.5 text-slate-400" />
            <span>{perspective === "factory" ? "Fábrica Principal" : perspective === "warehouse" ? "Bodega Principal" : storageFilter}</span>
            <ChevronDown className="size-3 text-slate-400" />
          </button>
        </div>

        {/* ======================================================== */}
        {/* VISTA 1: JEFE PRINCIPAL (MINIMALISTA - ESTILO IMAGEN 2)  */}
        {/* ======================================================== */}
        {perspective === "boss" && (
          <div className="space-y-4">
            {/* TARJETA BLANCA MINIMALISTA TIPO PORTAFOLIO FINTECH */}
            <div className="rounded-[28px] bg-white p-5 border border-slate-200/80 shadow-xs transition-all">
              
              {/* Header de la Tarjeta */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Saldo total (liquidación)
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowAmountEye(prev => !prev)}
                    className="size-7 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors"
                    title={showAmountEye ? "Ocultar monto" : "Mostrar monto"}
                  >
                    {showAmountEye ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                  </button>
                  <Link 
                    to="/sales" 
                    className="size-7 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    <SlidersHorizontal className="size-3.5" />
                  </Link>
                </div>
              </div>

              {/* Saldo Principal en Grande */}
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-[32px] font-black tracking-tight text-slate-950">
                  {showAmountEye ? formatCurrency(salesBreakdown.totalVentas) : "••••••••"}
                </span>
                <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  Hoy
                </span>
              </div>

              {/* Gráfico Donut Ring y Leyenda de 3 Grupos (Idéntico estilo a la foto 2) */}
              <div className="flex items-center justify-between py-2">
                {/* Donut SVG Minimalista */}
                <div className="relative size-24 shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="size-full -rotate-90">
                    {/* Track de fondo */}
                    <circle
                      cx="50"
                      cy="50"
                      r={cRadius}
                      stroke="#F1F5F9"
                      strokeWidth="9"
                      fill="transparent"
                    />
                    {totalLiq > 0 ? (
                      <>
                        {/* 1. Productos adicionales (Coral / Salmón #FB7185) */}
                        {adicLength > 0 && (
                          <circle
                            cx="50"
                            cy="50"
                            r={cRadius}
                            stroke="#FB7185"
                            strokeWidth="9"
                            strokeDasharray={`${adicLength} ${cCircumference}`}
                            strokeDashoffset={adicOffset}
                            fill="transparent"
                            strokeLinecap="round"
                          />
                        )}
                        {/* 2. Verde (Menta / Esmeralda #10B981) */}
                        {verdeLength > 0 && (
                          <circle
                            cx="50"
                            cy="50"
                            r={cRadius}
                            stroke="#10B981"
                            strokeWidth="9"
                            strokeDasharray={`${verdeLength} ${cCircumference}`}
                            strokeDashoffset={verdeOffset}
                            fill="transparent"
                            strokeLinecap="round"
                          />
                        )}
                        {/* 3. Blanco (Gris Slate #64748B) */}
                        {blancoLength > 0 && (
                          <circle
                            cx="50"
                            cy="50"
                            r={cRadius}
                            stroke="#64748B"
                            strokeWidth="9"
                            strokeDasharray={`${blancoLength} ${cCircumference}`}
                            strokeDashoffset={blancoOffset}
                            fill="transparent"
                            strokeLinecap="round"
                          />
                        )}
                      </>
                    ) : (
                      <circle
                        cx="50"
                        cy="50"
                        r={cRadius}
                        stroke="#CBD5E1"
                        strokeWidth="9"
                        strokeDasharray={`40 ${cCircumference}`}
                        fill="transparent"
                      />
                    )}
                  </svg>
                </div>

                {/* Leyenda a la derecha con los 3 grupos y montos + porcentajes exactos */}
                <div className="flex-1 pl-4 space-y-2 text-[12px]">
                  {/* Blanco */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold text-slate-700">
                      <span className="size-2 rounded-full bg-[#64748B]" />
                      Blanco
                    </span>
                    <div className="flex items-center gap-1.5 text-right">
                      <span className="font-black text-slate-900">
                        {formatCurrency(salesBreakdown.blanco)}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {salesBreakdown.pctBlanco > 0 ? `(${salesBreakdown.pctBlanco.toFixed(1)}%)` : "(0%)"}
                      </span>
                    </div>
                  </div>

                  {/* Verde */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold text-slate-700">
                      <span className="size-2 rounded-full bg-[#10B981]" />
                      Verde
                    </span>
                    <div className="flex items-center gap-1.5 text-right">
                      <span className="font-black text-emerald-600">
                        {formatCurrency(salesBreakdown.verde)}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {salesBreakdown.pctVerde > 0 ? `(${salesBreakdown.pctVerde.toFixed(1)}%)` : "(0%)"}
                      </span>
                    </div>
                  </div>

                  {/* Productos adicionales */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold text-slate-700">
                      <span className="size-2 rounded-full bg-[#FB7185]" />
                      Adicionales
                    </span>
                    <div className="flex items-center gap-1.5 text-right">
                      <span className="font-black text-rose-500">
                        {formatCurrency(salesBreakdown.adicionales)}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {salesBreakdown.pctAdicionales > 0 ? `(${salesBreakdown.pctAdicionales.toFixed(1)}%)` : "(0%)"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botón para Desplegar el Desglose Individual de Productos Adicionales */}
              <div className="pt-2">
                <button
                  onClick={() => setIsAdicionalesExpanded(prev => !prev)}
                  className="w-full flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-[#FB7185]" />
                    Desglose Adicionales: Rojas, Flores, Baldes, Pre-roll
                  </span>
                  <ChevronDown className={`size-3.5 transition-transform ${isAdicionalesExpanded ? "rotate-180" : ""}`} />
                </button>

                {isAdicionalesExpanded && (
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 text-[11px]">
                    <div className="flex justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-600 font-bold">• Rojas</span>
                      <span className="font-black text-slate-900">{formatCurrency(salesBreakdown.adicionalesBreakdown.rojas)}</span>
                    </div>
                    <div className="flex justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-600 font-bold">• Flores</span>
                      <span className="font-black text-slate-900">{formatCurrency(salesBreakdown.adicionalesBreakdown.flores)}</span>
                    </div>
                    <div className="flex justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-600 font-bold">• Baldes</span>
                      <span className="font-black text-slate-900">{formatCurrency(salesBreakdown.adicionalesBreakdown.baldes)}</span>
                    </div>
                    <div className="flex justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-600 font-bold">• Pre-roll</span>
                      <span className="font-black text-slate-900">{formatCurrency(salesBreakdown.adicionalesBreakdown.preroll)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Fila Inferior con Línea Divisoria (Disponible vs Por Justificar) */}
              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <span className="text-slate-500 font-bold">Disponible:</span>
                  <span className="font-black text-slate-900">{formatCurrency(salesBreakdown.recaudado)}</span>
                </div>

                <div className="flex items-center gap-1 text-slate-500">
                  <span className="font-bold">Por justificar:</span>
                  <span className="font-black text-rose-500">{formatCurrency(salesBreakdown.faltante)}</span>
                  <ChevronRight className="size-3.5 text-slate-400" />
                </div>
              </div>

            </div>

            {/* CARD: CONSOLIDACIÓN DE VENTAS COMPLETADAS (100% LIQUIDADAS) */}
            <div className="rounded-[28px] bg-slate-900 text-white p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <Check className="size-3.5 stroke-[3]" />
                  </span>
                  <span className="text-[12px] font-extrabold uppercase tracking-wider text-slate-300">
                    Ventas Completadas (Consolidadas)
                  </span>
                </div>
                <span className="text-[11px] font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  {consolidation.completedProducts.length} de 9 Liquidados
                </span>
              </div>

              <div>
                <span className="text-3xl font-black text-white tracking-tight">
                  {formatCurrency(consolidation.totalVentasCompletadas)}
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Monto total de ventas liquidadas al 100% (sin deuda en tienda)
                </p>
              </div>

              {/* Desglose de Ventas Consolidadas por los 3 Grupos con Montos Totales y Consolidados al 100% */}
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/10 text-center">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Blanco</span>
                  <div className="my-1">
                    <span className="text-[14px] font-black text-white block">
                      {formatCurrency(consolidation.completedByGroup.blanco)}
                    </span>
                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full inline-block mt-0.5">
                      100% Consolidado
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-400">
                    Total: {formatCurrency(consolidation.totalByGroup.blanco || salesBreakdown.blanco)}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Verde</span>
                  <div className="my-1">
                    <span className="text-[14px] font-black text-emerald-400 block">
                      {formatCurrency(consolidation.completedByGroup.verde)}
                    </span>
                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full inline-block mt-0.5">
                      100% Consolidado
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-400">
                    Total: {formatCurrency(consolidation.totalByGroup.verde || salesBreakdown.verde)}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Adicionales</span>
                  <div className="my-1">
                    <span className="text-[14px] font-black text-rose-400 block">
                      {formatCurrency(consolidation.completedByGroup.adicionales)}
                    </span>
                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full inline-block mt-0.5">
                      100% Consolidado
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-400">
                    Total: {formatCurrency(consolidation.totalByGroup.adicionales || salesBreakdown.adicionales)}
                  </span>
                </div>
              </div>

              {/* Desglose individual de productos adicionales con montos exactos */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Desglose Productos Adicionales (Montos Consolidados al 100%):
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div className="flex justify-between items-center px-2.5 py-1.5 rounded-lg bg-white/5 text-slate-300">
                    <span className="font-bold">• Rojas</span>
                    <div className="text-right">
                      <span className="font-black text-white block">{formatCurrency(consolidation.completedByGroup.adicionalesBreakdown.rojas)}</span>
                      {consolidation.totalByGroup.adicionalesBreakdown.rojas > consolidation.completedByGroup.adicionalesBreakdown.rojas && (
                        <span className="text-[9px] text-slate-400">de {formatCurrency(consolidation.totalByGroup.adicionalesBreakdown.rojas)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center px-2.5 py-1.5 rounded-lg bg-white/5 text-slate-300">
                    <span className="font-bold">• Flores</span>
                    <div className="text-right">
                      <span className="font-black text-white block">{formatCurrency(consolidation.completedByGroup.adicionalesBreakdown.flores)}</span>
                      {consolidation.totalByGroup.adicionalesBreakdown.flores > consolidation.completedByGroup.adicionalesBreakdown.flores && (
                        <span className="text-[9px] text-slate-400">de {formatCurrency(consolidation.totalByGroup.adicionalesBreakdown.flores)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center px-2.5 py-1.5 rounded-lg bg-white/5 text-slate-300">
                    <span className="font-bold">• Baldes</span>
                    <div className="text-right">
                      <span className="font-black text-white block">{formatCurrency(consolidation.completedByGroup.adicionalesBreakdown.baldes)}</span>
                      {consolidation.totalByGroup.adicionalesBreakdown.baldes > consolidation.completedByGroup.adicionalesBreakdown.baldes && (
                        <span className="text-[9px] text-slate-400">de {formatCurrency(consolidation.totalByGroup.adicionalesBreakdown.baldes)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center px-2.5 py-1.5 rounded-lg bg-white/5 text-slate-300">
                    <span className="font-bold">• Pre-roll</span>
                    <div className="text-right">
                      <span className="font-black text-white block">{formatCurrency(consolidation.completedByGroup.adicionalesBreakdown.preroll)}</span>
                      {consolidation.totalByGroup.adicionalesBreakdown.preroll > consolidation.completedByGroup.adicionalesBreakdown.preroll && (
                        <span className="text-[9px] text-slate-400">de {formatCurrency(consolidation.totalByGroup.adicionalesBreakdown.preroll)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Estado de Desbloqueo de Fábrica por Producto */}
              <div className="pt-2 border-t border-white/10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Estado para Despacho Fábrica ➔ Bodega:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {CANONICAL_9_NAMES.map((name) => {
                    const status = liquidationMap[name];
                    const isCompleted = status?.isFullyPaid && status.totalDispatchedVal > 0;
                    const isBlocked = status?.isBlocked;
                    return (
                      <span
                        key={name}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isBlocked
                            ? "bg-rose-500/10 text-rose-300 border-rose-500/30"
                            : isCompleted
                            ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                            : "bg-slate-800 text-slate-300 border-slate-700"
                        }`}
                      >
                        {isBlocked ? `🔒 ${name}` : `✓ ${name}`}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* BOTONES DE ACCIÓN RÁPIDA (RECAUDAR Y DESPACHAR) */}
            <div className="grid grid-cols-2 gap-2.5">
              <Button 
                onClick={() => setIsRecaudoModalOpen(true)}
                className="h-12 rounded-2xl bg-slate-900 text-white font-black text-[13px] hover:bg-slate-800 shadow-xs"
              >
                <CircleDollarSign className="size-4 mr-1.5" /> Recaudar Dinero
              </Button>

              <Button 
                onClick={() => {
                  setDispatchFromType("warehouse");
                  setDispatchToType("store");
                  setIsQuickDispatchOpen(true);
                }}
                className="h-12 rounded-2xl bg-white text-slate-900 border border-slate-200/80 font-black text-[13px] hover:bg-slate-50 shadow-xs"
              >
                <Send className="size-4 mr-1.5 text-slate-700" /> Despachar a Tienda
              </Button>
            </div>

            {/* CARD 2: ESTADO LOGÍSTICO Y DESPACHOS */}
            <div className="rounded-[28px] bg-white p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[14px] font-black tracking-tight text-slate-900">Despachos & Logística</h2>
                <Link to="/dispatches" className="size-7 rounded-full bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors">
                  <SlidersHorizontal className="size-3.5 text-slate-600" />
                </Link>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="flex flex-col p-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                  <span className="text-xl font-black text-slate-900">{dispatchMetrics.overdue}</span>
                  <span className="text-[9px] font-bold text-slate-500 mt-0.5">Pendiente</span>
                </div>

                <div className="flex flex-col p-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                  <span className="text-xl font-black text-slate-900">{dispatchMetrics.returns}</span>
                  <span className="text-[9px] font-bold text-slate-500 mt-0.5">Devueltos</span>
                </div>

                <div className="flex flex-col p-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                  <span className="text-xl font-black text-slate-900">{dispatchMetrics.inProgress}</span>
                  <span className="text-[9px] font-bold text-slate-500 mt-0.5">En curso</span>
                </div>

                <div className="flex flex-col p-2.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
                  <span className="text-xl font-black text-emerald-900">{dispatchMetrics.completed}</span>
                  <span className="text-[9px] font-bold text-emerald-700 mt-0.5">Recibidos</span>
                </div>
              </div>
            </div>

            {/* CARD 3 (JEFE): DESPACHOS EN CURSO INTERACTIVOS */}
            <div className="rounded-[28px] bg-white p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-[14px] font-black text-slate-900">Despachos en Curso</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Toca cualquier despacho para ver fotos y detalle</p>
                </div>
                <Link to="/dispatches" className="text-[11px] font-bold text-slate-900 underline">
                  Ver todos
                </Link>
              </div>

              <div className="space-y-2">
                {dispatches.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">No hay despachos registrados</p>
                ) : (
                  dispatches.slice(0, 5).map((d) => (
                    <div 
                      key={d.id} 
                      onClick={() => handleOpenDispatchDetail(d)}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100 active:scale-[0.98] transition-all flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex flex-col">
                        <span className="text-[14px] font-black text-slate-900">
                          {d.toLocationName} · #{d.dispatchNumber}
                        </span>
                        <span className="text-[12px] text-slate-500 font-medium mt-0.5">
                          {d.items?.length || 0} productos • {formatCurrency(d.totalValue || 0)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          d.status === "received" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
                        }`}>
                          {d.status === "received" ? "Recibido" : "Enviado"}
                        </span>
                        <ChevronRight className="size-4 text-slate-400" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VISTA 2: BODEGA                                          */}
        {/* ======================================================== */}
        {perspective === "warehouse" && (
          <div className="space-y-4">
            <div className="rounded-[28px] bg-white p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-extrabold uppercase text-slate-400 flex items-center gap-1.5">
                  <Archive className="size-4" /> Bodega Principal · Operaciones
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 my-3">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Recaudado Tiendas</span>
                  <p className="text-lg font-black text-emerald-600 mt-0.5">
                    {formatCurrency(salesBreakdown.recaudado)}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-rose-400 uppercase">Faltante por Cobrar</span>
                  <p className="text-lg font-black text-rose-600 mt-0.5">
                    {formatCurrency(salesBreakdown.faltante)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button 
                  onClick={() => {
                    setDispatchFromType("warehouse");
                    setDispatchToType("store");
                    setIsQuickDispatchOpen(true);
                  }}
                  className="flex-1 h-12 rounded-2xl bg-slate-900 text-white font-black text-[13px] hover:bg-slate-800 shadow-xs"
                >
                  <Send className="size-4 mr-1.5" /> Despachar a Tienda
                </Button>

                <Button 
                  onClick={() => setIsRecaudoModalOpen(true)}
                  className="h-12 px-4 rounded-2xl bg-white border border-slate-200 text-slate-800 font-black text-[13px] hover:bg-slate-50 shadow-xs"
                >
                  <CircleDollarSign className="size-4 mr-1" /> Recaudar
                </Button>
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-5 border border-slate-200/80 shadow-xs">
              <h3 className="text-[14px] font-black text-slate-900 mb-3 flex items-center justify-between">
                <span>Despachos en Curso</span>
                <span className="text-[11px] font-bold text-slate-400">{relevantDispatches.length} envíos</span>
              </h3>

              <div className="space-y-2">
                {relevantDispatches.slice(0, 5).map((d) => (
                  <div 
                    key={d.id} 
                    onClick={() => handleOpenDispatchDetail(d)}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100 active:scale-[0.98] transition-all flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex flex-col">
                      <span className="text-[14px] font-black text-slate-900">
                        {d.toLocationName} · #{d.dispatchNumber}
                      </span>
                      <span className="text-[12px] text-slate-500 font-medium mt-0.5">
                        {d.items?.length || 0} productos • {formatCurrency(d.totalValue || 0)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        d.status === "received" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
                      }`}>
                        {d.status === "received" ? "Recibido" : "Enviado"}
                      </span>
                      <ChevronRight className="size-4 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VISTA 3: FÁBRICA                                         */}
        {/* ======================================================== */}
        {perspective === "factory" && (
          <div className="space-y-4">
            <div className="rounded-[28px] bg-white p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-extrabold uppercase text-slate-400 flex items-center gap-1.5">
                  <Factory className="size-4" /> Fábrica · Despacho de Producción
                </span>
              </div>

              <p className="text-[13px] text-slate-500 font-medium my-2">
                Despacha productos terminados en sus presentaciones (Bombas, Balones o Paquetes) hacia la Bodega Principal.
              </p>

              <div className="pt-2">
                <Button 
                  onClick={() => {
                    setDispatchFromType("factory");
                    setDispatchToType("warehouse");
                    setIsQuickDispatchOpen(true);
                  }}
                  className="w-full h-12 rounded-2xl bg-slate-900 text-white font-black text-[14px] hover:bg-slate-800 shadow-xs"
                >
                  <Send className="size-4 mr-2" /> Despachar Presentaciones a Bodega
                </Button>
              </div>
            </div>

            {/* Banner de Control de Liquidación y Bloqueo */}
            <div className="rounded-[28px] bg-slate-900 text-white p-4 shadow-xs space-y-1">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-[12px] font-black uppercase tracking-wider text-slate-200">
                  Control de Liquidación y Bloqueo
                </span>
              </div>
              <p className="text-[12px] text-slate-300">
                Fábrica solo puede despachar productos que estén 100% liquidados en tienda. Si un producto tiene saldo pendiente, queda bloqueado 🔒 automáticamente hasta que Bodega registre el recaudo total.
              </p>
            </div>

            <div className="rounded-[28px] bg-white p-5 border border-slate-200/80 shadow-xs">
              <h3 className="text-[14px] font-black text-slate-900 mb-3 flex items-center justify-between">
                <span>Presentaciones Disponibles</span>
                <span className="text-[11px] font-bold text-slate-400">{allProducts.length} productos</span>
              </h3>

              <div className="grid grid-cols-2 gap-2">
                {allProducts.map((p) => {
                  const details = getProductPackagings(p.name);
                  const mainPkg = details.packagings[0];
                  const lock = liquidationMap[details.name];
                  const isBlocked = !!lock?.isBlocked;

                  return (
                    <div 
                      key={p.id} 
                      className={`p-3 rounded-2xl border flex flex-col justify-between transition-all ${
                        isBlocked 
                          ? 'bg-rose-50/60 border-rose-200/80' 
                          : 'bg-slate-50 border-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-black text-slate-900 truncate">{details.name}</span>
                        {isBlocked && (
                          <span className="text-[9px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-md">
                            🔒 Bloqueado
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] text-slate-500 font-bold mt-0.5">
                        {mainPkg.label} · ${mainPkg.packagePrice.toLocaleString()}
                      </span>

                      {isBlocked ? (
                        <span className="text-[10px] font-bold text-rose-600 mt-1">
                          Falta liquidar: {formatCurrency(lock.pendingVal)}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600 mt-1">
                          ✓ Al día para despacho
                        </span>
                      )}

                      <button 
                        disabled={isBlocked}
                        onClick={() => handleAddProductToDispatch(p.id)}
                        className={`mt-2 text-[11px] font-bold py-1.5 px-2 rounded-xl active:scale-95 transition-all ${
                          isBlocked 
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                      >
                        {isBlocked ? '🔒 Bloqueado' : '+ Despachar'}
                      </button>
                    </div>
                  );
                })}
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
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Catálogo</span>
              <span className="text-[14px] font-black text-slate-900">Ver Productos</span>
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
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Operación</span>
              <span className="text-[14px] font-black text-slate-900">Despachos</span>
            </div>
            <div className="size-9 rounded-full bg-slate-900 flex items-center justify-center">
              <ArrowRight className="size-4 text-white" />
            </div>
          </Link>
        </div>

      </div>

      {/* ======================================================== */}
      {/* DRAWER: NUEVO DESPACHO CON PRESENTACIONES Y EMPAQUES     */}
      {/* ======================================================== */}
      <Drawer open={isQuickDispatchOpen} onOpenChange={setIsQuickDispatchOpen}>
        <DrawerContent className="bg-white border-t-0 px-5 pb-8">
          <div className="flex flex-col max-h-[85vh]">
            <div className="py-3 border-b border-slate-100 mb-3 flex-shrink-0">
              <h2 className="text-xl font-black text-slate-950">
                {dispatchFromType === "factory" ? "Despacho de Fábrica a Bodega" : "Despacho de Bodega a Tienda"}
              </h2>
              <p className="text-[12px] text-slate-500 font-medium">
                Selecciona la presentación (Bomba, Balón, Paquete o Unidad)
              </p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pb-3 scrollbar-hide">
              {dispatchToType === "store" && (
                <div>
                  <label className="text-[12px] font-bold text-slate-600 block mb-1">Tienda Destino *</label>
                  <select 
                    value={selectedTargetStore}
                    onChange={(e) => setSelectedTargetStore(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-[14px] font-bold text-slate-900 outline-none"
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
                  {allProducts.map(p => {
                    const details = getProductPackagings(p.name);
                    const lock = liquidationMap[details.name];
                    const isBlocked = !!lock?.isBlocked;
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleAddProductToDispatch(p.id)}
                        className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all ${
                          isBlocked 
                            ? "bg-rose-50 border border-rose-200 text-rose-700 opacity-80" 
                            : "bg-slate-50 border border-slate-200 text-slate-800 hover:bg-slate-100"
                        }`}
                      >
                        {isBlocked ? `🔒 ${p.name} (${formatCurrency(lock.pendingVal)})` : `+ ${p.name}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Lista de productos seleccionados con selector de presentación */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Presentaciones a despachar:</span>
                {dispatchPackagingItems.length === 0 ? (
                  <p className="text-[13px] text-slate-400 italic py-2">Ningún producto seleccionado</p>
                ) : (
                  dispatchPackagingItems.map(item => (
                    <div key={item.productId} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[14px] font-black text-slate-900">{item.name}</span>
                        <button
                          onClick={() => setDispatchPackagingItems(prev => prev.filter(i => i.productId !== item.productId))}
                          className="text-[11px] font-bold text-rose-500 hover:text-rose-700"
                        >
                          Quitar
                        </button>
                      </div>

                      {/* Selector de Presentación / Empaque */}
                      <div className="flex flex-wrap gap-1.5">
                        {item.availablePackagings.map(pkg => (
                          <button
                            key={pkg.id}
                            type="button"
                            onClick={() => handleChangeItemPackaging(item.productId, pkg.id)}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-colors ${
                              item.selectedPkgId === pkg.id 
                                ? "bg-slate-900 text-white" 
                                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {pkg.label}
                          </button>
                        ))}
                      </div>

                      {/* Contador de Paquetes / Presentaciones y Cálculo de Unidades */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-slate-500">
                            {item.pkgCount}x {item.pkgLabel} = <span className="text-slate-900 font-black">{item.pkgCount * item.multiplier} unidades</span>
                          </span>
                          <span className="text-[12px] font-black text-slate-900">
                            Total: ${Number(item.pkgCount * item.packagePrice).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setDispatchPackagingItems(prev => prev.map(i => i.productId === item.productId ? { ...i, pkgCount: Math.max(1, i.pkgCount - 1) } : i))}
                            className="size-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-800"
                          >
                            <Minus className="size-3.5" />
                          </button>
                          <span className="text-sm font-black w-6 text-center">{item.pkgCount}</span>
                          <button 
                            onClick={() => setDispatchPackagingItems(prev => prev.map(i => i.productId === item.productId ? { ...i, pkgCount: i.pkgCount + 1 } : i))}
                            className="size-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-800"
                          >
                            <Plus className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 flex-shrink-0">
              <Button 
                onClick={handleCreateQuickDispatch} 
                disabled={isCreatingDispatch || dispatchPackagingItems.length === 0}
                className="w-full h-14 rounded-2xl font-black text-[15px] bg-slate-900 text-white hover:bg-slate-800"
              >
                {isCreatingDispatch ? "Despachando..." : "Confirmar y Enviar Despacho"}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* ======================================================== */}
      {/* DRAWER: REGISTRAR RECAUDO (CATEGORÍA O PRODUCTO)         */}
      {/* ======================================================== */}
      <Drawer open={isRecaudoModalOpen} onOpenChange={setIsRecaudoModalOpen}>
        <DrawerContent className="bg-white border-t-0 px-5 pb-8">
          <div className="flex flex-col">
            <div className="py-3 border-b border-slate-100 mb-3">
              <h2 className="text-xl font-black text-slate-900">Registrar Recaudo</h2>
              <p className="text-[12px] text-slate-500 font-medium">
                Recauda dinero en general de la categoría o por producto / presentación
              </p>
            </div>
            
            <div className="space-y-3">
              {/* Tienda */}
              <div>
                <label className="text-[12px] font-bold text-slate-500 block mb-1">Tienda *</label>
                <select 
                  value={recaudoStore} 
                  onChange={(e) => setRecaudoStore(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-[14px] font-bold text-slate-900 outline-none"
                >
                  <option value="">Selecciona tienda</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {/* Selector de Modo: Por Categoría General vs Por Producto / Presentación */}
              <div>
                <label className="text-[12px] font-bold text-slate-500 block mb-1">Tipo de Recaudo</label>
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-100">
                  <button
                    type="button"
                    onClick={() => setRecaudoMode("category")}
                    className={`py-2 rounded-xl text-[12px] font-black transition-all ${
                      recaudoMode === "category" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Por Categoría General
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRecaudoMode("product");
                      if (!recaudoProdId && allProducts.length > 0) {
                        handleSelectRecaudoProduct(allProducts[0].id);
                      }
                    }}
                    className={`py-2 rounded-xl text-[12px] font-black transition-all ${
                      recaudoMode === "product" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Por Producto / Presentación
                  </button>
                </div>
              </div>

              {/* MODO 1: CATEGORÍA GENERAL */}
              {recaudoMode === "category" && (
                <div>
                  <label className="text-[12px] font-bold text-slate-500 block mb-1">Categoría General</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Blanco", "Verde", "Productos adicionales"].map((catName) => (
                      <button 
                        key={catName}
                        type="button"
                        onClick={() => setRecaudoCategory(catName)}
                        className={`p-3 rounded-xl text-[12px] font-bold border transition-colors ${
                          recaudoCategory.toLowerCase() === catName.toLowerCase() 
                            ? "bg-slate-900 border-slate-900 text-white" 
                            : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      >
                        {catName}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* MODO 2: POR PRODUCTO / PRESENTACIÓN */}
              {recaudoMode === "product" && (
                <div className="space-y-2.5">
                  <div>
                    <label className="text-[12px] font-bold text-slate-500 block mb-1">Producto</label>
                    <select
                      value={recaudoProdId}
                      onChange={(e) => handleSelectRecaudoProduct(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-[14px] font-bold text-slate-900 outline-none"
                    >
                      {allProducts.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Selector de Presentación del Producto */}
                  {recaudoProdId && (
                    <div>
                      <label className="text-[12px] font-bold text-slate-500 block mb-1">Presentación / Empaque</label>
                      <div className="flex flex-wrap gap-1.5">
                        {getProductPackagings(allProducts.find(p => p.id === recaudoProdId)?.name || "").packagings.map(pk => (
                          <button
                            key={pk.id}
                            type="button"
                            onClick={() => handleSelectRecaudoPkg(pk.id)}
                            className={`px-3 py-1.5 rounded-xl text-[12px] font-bold transition-colors ${
                              recaudoPkgId === pk.id 
                                ? "bg-slate-900 text-white" 
                                : "bg-slate-50 border border-slate-200 text-slate-700"
                            }`}
                          >
                            {pk.label} (${pk.packagePrice.toLocaleString()})
                          </button>
                        ))}
                      </div>

                      {/* Contador de Presentaciones */}
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 mt-2">
                        <span className="text-[12px] font-bold text-slate-600">Cantidad cobrada:</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateRecaudoPkgCount(-1)}
                            className="size-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold"
                          >
                            <Minus className="size-3.5" />
                          </button>
                          <span className="text-sm font-black w-6 text-center">{recaudoPkgCount}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateRecaudoPkgCount(1)}
                            className="size-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold"
                          >
                            <Plus className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Monto Final a Recaudar */}
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

      {/* DRAWER: DETALLE DE DESPACHO CON FOTOS Y EMPAQUES (IPHONE 2026) */}
      <DispatchDetailsDrawer
        dispatch={selectedDispatchDetail}
        isOpen={isDispatchDetailOpen}
        onClose={() => setIsDispatchDetailOpen(false)}
      />

    </div>
  );
}
