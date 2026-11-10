import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { 
  Plus, 
  ArrowRight, 
  ChevronLeft,
  X,
  Send,
  ChevronDown,
  Layers
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { formatCurrency } from "@/lib/format";
import type { LocationType } from "@/types/domain";
import { useDispatches, type LiveDispatch } from "@/features/dispatches/use-dispatches";
import { useInventoryData } from "@/features/inventory/use-inventory-data";
import { useSalesData } from "@/features/sales/use-sales-data";
import { useSession } from "@/features/auth/session";
import { toast } from "sonner";
import { getProductPackagings, type ProductPackaging } from "@/features/inventory/product-presentations";
import { DispatchDetailsDrawer } from "@/features/dispatches/components/dispatch-details-drawer";

export const Route = createFileRoute("/_app/dispatches")({
  head: () => ({
    meta: [
      { title: "Despachos · Operaciones" },
    ],
  }),
  component: DispatchesPage,
});

function DispatchesPage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const { dispatches, locations, isLoading, createDispatch, isCreatingDispatch, receiveDispatch, isReceivingDispatch } = useDispatches();
  const { allProducts } = useInventoryData();
  const { totalRecaudado } = useSalesData();

  const stores = useMemo(() => {
    const list = Array.isArray(locations) 
      ? locations.filter(l => l.type === "store" && !l.name.toLowerCase().includes("prueba") && (l.name.toLowerCase().includes("centro") || l.name.toLowerCase().includes("usa"))) 
      : [];
    if (list.length > 0) return list;
    return [
      { id: "store-centro", name: "Centro", type: "store" },
      { id: "store-la-usa", name: "La Usa", type: "store" },
    ];
  }, [locations]);
  const warehouses = useMemo(() => Array.isArray(locations) ? locations.filter(l => l.type === "warehouse") : [], [locations]);
  const factories = useMemo(() => Array.isArray(locations) ? locations.filter(l => l.type === "factory") : [], [locations]);

  // Resumen financiero de despachos y dinero pendiente
  const totalDespachado = useMemo(() => {
    return dispatches
      .filter(d => d.status === "dispatched" || d.status === "received")
      .reduce((acc, d) => acc + (d.totalValue || 0), 0);
  }, [dispatches]);

  const pendientePorJustificar = Math.max(0, totalDespachado - totalRecaudado);

  // Desglose por los 3 grupos y por producto
  const dispatchedByGroup = useMemo(() => {
    const groups: {
      blanco: { totalQty: number; totalVal: number; items: Record<string, { qty: number; val: number }> };
      verde: { totalQty: number; totalVal: number; items: Record<string, { qty: number; val: number }> };
      adicionales: { totalQty: number; totalVal: number; items: Record<string, { qty: number; val: number }> };
    } = {
      blanco: { totalQty: 0, totalVal: 0, items: {} },
      verde: { totalQty: 0, totalVal: 0, items: {} },
      adicionales: { totalQty: 0, totalVal: 0, items: {} },
    };

    dispatches.forEach(d => {
      if (d.status === "cancelled") return;
      (d.items || []).forEach(it => {
        const nameLower = (it.productName || "").toLowerCase();
        let targetGroup: "blanco" | "verde" | "adicionales" = "adicionales";
        
        if (nameLower.includes("mamita") || nameLower.includes("tornillo")) {
          targetGroup = "blanco";
        } else if (nameLower.includes("liso") || nameLower.includes("gordo") || nameLower.includes("largo") || nameLower.includes("mini")) {
          targetGroup = "verde";
        } else {
          targetGroup = "adicionales";
        }

        const g = groups[targetGroup];
        const val = it.totalValue || (it.quantity * it.unitValue);
        g.totalQty += it.quantity;
        g.totalVal += val;

        const prodKey = it.productName || "Producto";
        if (!g.items[prodKey]) {
          g.items[prodKey] = { qty: 0, val: 0 };
        }
        g.items[prodKey].qty += it.quantity;
        g.items[prodKey].val += val;
      });
    });

    return groups;
  }, [dispatches]);

  const [isCategoryBreakdownOpen, setIsCategoryBreakdownOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"todos" | "por_recibir" | "despachados" | "recibidos">("todos");

  // Selected dispatch detail drawer
  const [selectedDispatch, setSelectedDispatch] = useState<LiveDispatch | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [receiveNotes, setReceiveNotes] = useState("");

  // Create dispatch modal/drawer
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [fromType, setFromType] = useState<LocationType>("warehouse");
  const [fromId, setFromId] = useState("");
  const [toType, setToType] = useState<LocationType>("store");
  const [toId, setToId] = useState("");
  const [dispatchNotes, setDispatchNotes] = useState("");
  const [selectedItems, setSelectedItems] = useState<{
    productId: string;
    name: string;
    selectedPkgId: string;
    pkgLabel: string;
    multiplier: number;
    pkgCount: number;
    packagePrice: number;
    availablePackagings: ProductPackaging[];
  }[]>([]);

  // Filtered dispatches
  const filteredDispatches = useMemo(() => {
    return dispatches.filter((dispatch) => {
      const text = `${dispatch.dispatchNumber} ${dispatch.fromLocationName} ${dispatch.toLocationName} ${dispatch.notes || ""}`.toLowerCase();
      const matchesQuery = text.includes(query.trim().toLowerCase());
      if (!matchesQuery) return false;

      if (filterTab === "por_recibir" || filterTab === "despachados") {
        return dispatch.status === "dispatched";
      }
      if (filterTab === "recibidos") {
        return dispatch.status === "received";
      }
      return true;
    });
  }, [dispatches, query, filterTab]);

  const handleOpenDetail = (d: LiveDispatch) => {
    setSelectedDispatch(d);
    setReceiveNotes("");
    setIsDetailOpen(true);
  };

  const handleReceiveDispatch = async () => {
    if (!selectedDispatch) return;
    try {
      await receiveDispatch({
        dispatchId: selectedDispatch.id,
        notes: receiveNotes,
      });
      toast.success(`Despacho #${selectedDispatch.dispatchNumber} recibido exitosamente`);
      setIsDetailOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Error al recibir despacho");
    }
  };

  const handleAddItem = (productId: string) => {
    const prod = allProducts.find(p => p.id === productId);
    if (!prod) return;
    if (selectedItems.some(i => i.productId === productId)) return;

    const details = getProductPackagings(prod.name);
    const defaultPkg = details.packagings[0] || {
      id: "unidad",
      label: "Unidad",
      multiplier: 1,
      packagePrice: details.unitPrice,
    };

    setSelectedItems(prev => [
      ...prev,
      {
        productId,
        name: details.name,
        selectedPkgId: defaultPkg.id,
        pkgLabel: defaultPkg.label,
        multiplier: defaultPkg.multiplier,
        pkgCount: 1,
        packagePrice: defaultPkg.packagePrice,
        availablePackagings: details.packagings,
      }
    ]);
  };

  const handleChangePkg = (productId: string, pkgId: string) => {
    setSelectedItems(prev => prev.map(item => {
      if (item.productId === productId) {
        const pkg = item.availablePackagings.find(p => p.id === pkgId);
        if (pkg) {
          return {
            ...item,
            selectedPkgId: pkg.id,
            pkgLabel: pkg.label,
            multiplier: pkg.multiplier,
            packagePrice: pkg.packagePrice,
          };
        }
      }
      return item;
    }));
  };

  const handleUpdateItemQty = (productId: string, delta: number) => {
    setSelectedItems(prev =>
      prev.map(item => {
        if (item.productId === productId) {
          const newQ = Math.max(1, item.pkgCount + delta);
          return { ...item, pkgCount: newQ };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (productId: string) => {
    setSelectedItems(prev => prev.filter(i => i.productId !== productId));
  };

  const handleCreateDispatchSubmit = async () => {
    const effectiveFromId = fromId || (fromType === "warehouse" ? warehouses[0]?.id : factories[0]?.id) || "";
    const effectiveToId = toId || (toType === "store" ? stores[0]?.id : warehouses[0]?.id) || "";

    if (!effectiveFromId || !effectiveToId) {
      toast.error("Selecciona el origen y el destino del despacho");
      return;
    }
    if (selectedItems.length === 0) {
      toast.error("Agrega al menos una presentación al despacho");
      return;
    }

    try {
      const notesDetail = selectedItems.map(
        i => `${i.pkgCount}x ${i.pkgLabel} ${i.name}`
      ).join(", ");

      await createDispatch({
        fromType,
        fromId: effectiveFromId,
        toType,
        toId: effectiveToId,
        notes: dispatchNotes ? `${dispatchNotes} (${notesDetail})` : notesDetail,
        items: selectedItems.map(i => ({
          productId: i.productId,
          quantity: i.pkgCount * i.multiplier, // Unidades físicas reales descontadas
          unitValue: Math.round(i.packagePrice / i.multiplier),
        }))
      });

      toast.success("Despacho de presentaciones creado exitosamente");
      setIsCreateOpen(false);
      setSelectedItems([]);
      setDispatchNotes("");
    } catch (err: any) {
      toast.error(err.message || "Error al crear despacho");
    }
  };

  const totalValueOfItems = selectedItems.reduce((acc, curr) => acc + (curr.pkgCount * curr.packagePrice), 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-28 font-sans">
      <div className="mx-auto max-w-md px-5 pt-3 space-y-4">
        
        {/* HEADER */}
        <header className="flex items-center justify-between py-2">
          <button 
            onClick={() => navigate({ to: "/dashboard" })}
            className="flex size-10 items-center justify-center rounded-full bg-white border border-slate-200/80 shadow-xs text-slate-700 active:scale-95 transition-transform"
          >
            <ChevronLeft className="size-5" />
          </button>

          <h1 className="text-lg font-black tracking-tight text-slate-950">
            Despachos & Bodega
          </h1>

          <button 
            onClick={() => setIsCreateOpen(true)}
            className="flex size-10 items-center justify-center rounded-full bg-slate-900 border border-slate-800 shadow-xs text-white active:scale-95 transition-transform"
            title="Crear Despacho"
          >
            <Plus className="size-5 stroke-[2.5]" />
          </button>
        </header>

        {/* RESUMEN FINANCIERO DE DESPACHOS Y BODEGA */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Control de Mercancía y Recaudos</span>
            <span className="text-[11px] font-bold text-slate-400">{dispatches.length} envíos</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 block">Total Despachado</span>
              <span className="text-[13px] font-black text-slate-900 block mt-0.5">
                {formatCurrency(totalDespachado)}
              </span>
            </div>

            <div className="p-2.5 rounded-2xl bg-emerald-50/60 border border-emerald-100">
              <span className="text-[10px] font-bold text-emerald-700 block">Recaudado</span>
              <span className="text-[13px] font-black text-emerald-900 block mt-0.5">
                {formatCurrency(totalRecaudado)}
              </span>
            </div>

            <div className="p-2.5 rounded-2xl bg-rose-50/60 border border-rose-100">
              <span className="text-[10px] font-bold text-rose-700 block">Por Justificar</span>
              <span className="text-[13px] font-black text-rose-950 block mt-0.5">
                {formatCurrency(pendientePorJustificar)}
              </span>
            </div>
          </div>

          {/* DESPLEGABLE: CONSULTA DE LO DESPACHADO POR CATEGORÍA Y PRODUCTO */}
          <div className="pt-1">
            <button
              onClick={() => setIsCategoryBreakdownOpen(!isCategoryBreakdownOpen)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Layers className="size-3.5 text-slate-500" />
                <span>Ver despachos por categoría y producto</span>
              </span>
              <ChevronDown className={`size-4 text-slate-400 transition-transform ${isCategoryBreakdownOpen ? "rotate-180" : ""}`} />
            </button>

            {isCategoryBreakdownOpen && (
              <div className="mt-2.5 space-y-2 text-xs">
                {/* 1. Blanco */}
                <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100">
                  <div className="flex justify-between font-black text-slate-900 mb-1">
                    <span>Blanco</span>
                    <span>{formatCurrency(dispatchedByGroup.blanco.totalVal)} ({dispatchedByGroup.blanco.totalQty} unds)</span>
                  </div>
                  <div className="space-y-0.5 pl-2 text-slate-600 font-medium text-[11px]">
                    {Object.entries(dispatchedByGroup.blanco.items).map(([name, data]) => (
                      <div key={name} className="flex justify-between">
                        <span>• {name}</span>
                        <span>{data.qty} unds - {formatCurrency(data.val)}</span>
                      </div>
                    ))}
                    {Object.keys(dispatchedByGroup.blanco.items).length === 0 && (
                      <span className="text-slate-400 italic">Sin despachos de Blanco</span>
                    )}
                  </div>
                </div>

                {/* 2. Verde */}
                <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100">
                  <div className="flex justify-between font-black text-slate-900 mb-1">
                    <span>Verde</span>
                    <span>{formatCurrency(dispatchedByGroup.verde.totalVal)} ({dispatchedByGroup.verde.totalQty} unds)</span>
                  </div>
                  <div className="space-y-0.5 pl-2 text-slate-600 font-medium text-[11px]">
                    {Object.entries(dispatchedByGroup.verde.items).map(([name, data]) => (
                      <div key={name} className="flex justify-between">
                        <span>• {name}</span>
                        <span>{data.qty} unds - {formatCurrency(data.val)}</span>
                      </div>
                    ))}
                    {Object.keys(dispatchedByGroup.verde.items).length === 0 && (
                      <span className="text-slate-400 italic">Sin despachos de Verde</span>
                    )}
                  </div>
                </div>

                {/* 3. Productos adicionales */}
                <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100">
                  <div className="flex justify-between font-black text-slate-900 mb-1">
                    <span>Productos adicionales</span>
                    <span>{formatCurrency(dispatchedByGroup.adicionales.totalVal)} ({dispatchedByGroup.adicionales.totalQty} unds)</span>
                  </div>
                  <div className="space-y-0.5 pl-2 text-slate-600 font-medium text-[11px]">
                    {Object.entries(dispatchedByGroup.adicionales.items).map(([name, data]) => (
                      <div key={name} className="flex justify-between">
                        <span>• {name}</span>
                        <span>{data.qty} unds - {formatCurrency(data.val)}</span>
                      </div>
                    ))}
                    {Object.keys(dispatchedByGroup.adicionales.items).length === 0 && (
                      <span className="text-slate-400 italic">Sin despachos de Adicionales</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SEARCH & FILTERS */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1">
            <input 
              type="text" 
              className="block w-full pl-4 pr-10 py-3 rounded-2xl bg-white border border-slate-200/80 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-900 shadow-xs"
              placeholder="Buscar por #, origen, destino..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* HORIZONTAL FILTER PILLS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button 
            onClick={() => setFilterTab("todos")}
            className={`whitespace-nowrap px-4 py-2 rounded-2xl text-[13px] font-bold transition-colors ${filterTab === "todos" ? 'bg-slate-900 text-white shadow-xs' : 'bg-white border border-slate-200/80 text-slate-600'}`}
          >
            Todos ({dispatches.length})
          </button>
          <button 
            onClick={() => setFilterTab("despachados")}
            className={`whitespace-nowrap px-4 py-2 rounded-2xl text-[13px] font-bold transition-colors ${filterTab === "despachados" ? 'bg-slate-900 text-white shadow-xs' : 'bg-white border border-slate-200/80 text-slate-600'}`}
          >
            En Camino
          </button>
          <button 
            onClick={() => setFilterTab("recibidos")}
            className={`whitespace-nowrap px-4 py-2 rounded-2xl text-[13px] font-bold transition-colors ${filterTab === "recibidos" ? 'bg-slate-900 text-white shadow-xs' : 'bg-white border border-slate-200/80 text-slate-600'}`}
          >
            Recibidos
          </button>
        </div>

        {/* DISPATCHES LIST */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-white/60 rounded-3xl animate-pulse border border-slate-200/60" />
            ))}
          </div>
        ) : filteredDispatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Send className="size-12 mb-3 opacity-30" />
            <p className="text-[15px] font-semibold">Sin despachos en esta sección</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDispatches.map((d) => {
              const isReceived = d.status === "received";

              return (
                <div 
                  key={d.id}
                  onClick={() => handleOpenDetail(d)}
                  className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-400 transition-all cursor-pointer active:scale-[0.99] flex flex-col gap-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="size-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-xs text-slate-800">
                        #{d.dispatchNumber}
                      </span>
                      <span className="text-[14px] font-black text-slate-900 truncate max-w-[180px]">
                        {d.toLocationName}
                      </span>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                      isReceived ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-900 border border-slate-200'
                    }`}>
                      {isReceived ? "Recibido" : "Enviado"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Despachado por: <strong className="text-slate-700">{d.createdByName || "Administración"}</strong></span>
                    {d.receivedByName && <span>Recibido: <strong className="text-emerald-700">{d.receivedByName}</strong></span>}
                  </div>

                  <div className="flex items-center justify-between text-[12px] text-slate-500 font-semibold border-t border-slate-100 pt-2">
                    <span className="flex items-center gap-1">
                      {d.fromLocationName} <ArrowRight className="size-3 text-slate-400" /> {d.toLocationName}
                    </span>
                    <span className="text-[14px] font-black text-slate-950">
                      {formatCurrency(d.totalValue || 0)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* DRAWER: DETALLE DE DESPACHO CON FOTOS Y EMPAQUES (IPHONE 2026) */}
      <DispatchDetailsDrawer
        dispatch={selectedDispatch}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onReceive={async () => {
          await handleReceiveDispatch();
        }}
        isReceiving={isReceivingDispatch}
      />

      {/* DRAWER: CREAR NUEVO DESPACHO */}
      <Drawer open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DrawerContent className="bg-white border-t-0 px-5 pb-8">
          <div className="flex flex-col max-h-[85vh]">
            <div className="py-3 border-b border-slate-100 mb-3 flex-shrink-0">
              <h2 className="text-xl font-black text-slate-900">Crear Nuevo Despacho</h2>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pb-3 scrollbar-hide">
              {/* Selector Origen y Destino */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Origen</label>
                  <select 
                    value={fromType}
                    onChange={(e) => setFromType(e.target.value as LocationType)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-[13px] font-bold outline-none"
                  >
                    <option value="warehouse">Bodega</option>
                    <option value="factory">Fábrica</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Destino</label>
                  <select 
                    value={toType}
                    onChange={(e) => setToType(e.target.value as LocationType)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-[13px] font-bold outline-none"
                  >
                    <option value="store">Tienda</option>
                    <option value="warehouse">Bodega</option>
                  </select>
                </div>
              </div>

              {toType === "store" && (
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Nombre de la Tienda *</label>
                  <select 
                    value={toId}
                    onChange={(e) => setToId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-[14px] font-bold text-slate-900 outline-none"
                  >
                    <option value="">Selecciona la tienda</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              {/* Selector de productos para agregar */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Agregar Productos al Despacho</label>
                <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
                  {allProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleAddItem(p.id)}
                      className="whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-[12px] font-bold"
                    >
                      + {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Items seleccionados */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Presentaciones en este despacho ({selectedItems.length}):</span>
                {selectedItems.length === 0 ? (
                  <p className="text-[13px] text-slate-400 italic py-2">Ningún producto agregado aún.</p>
                ) : (
                  selectedItems.map((it) => (
                    <div key={it.productId} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[14px] font-black text-slate-900">{it.name}</span>
                        <button 
                          type="button"
                          onClick={() => handleRemoveItem(it.productId)}
                          className="text-[11px] font-bold text-rose-500 hover:text-rose-700"
                        >
                          Quitar
                        </button>
                      </div>

                      {/* Selector de Presentación / Empaque */}
                      <div className="flex flex-wrap gap-1.5">
                        {it.availablePackagings.map(pkg => (
                          <button
                            key={pkg.id}
                            type="button"
                            onClick={() => handleChangePkg(it.productId, pkg.id)}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-colors ${
                              it.selectedPkgId === pkg.id 
                                ? "bg-slate-900 text-white" 
                                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {pkg.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-slate-500">
                            {it.pkgCount}x {it.pkgLabel} = <span className="text-slate-900 font-black">{it.pkgCount * it.multiplier} unidades</span>
                          </span>
                          <span className="text-[12px] font-black text-slate-900">
                            Total: ${Number(it.pkgCount * it.packagePrice).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button 
                            type="button"
                            onClick={() => handleUpdateItemQty(it.productId, -1)}
                            className="size-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-700"
                          >-</button>
                          <span className="text-sm font-black w-6 text-center">{it.pkgCount}</span>
                          <button 
                            type="button"
                            onClick={() => handleUpdateItemQty(it.productId, 1)}
                            className="size-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-700"
                          >+</button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Total y Notas */}
              {selectedItems.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-100 text-right">
                  <span className="text-xs font-bold text-slate-500">Valor estimado del despacho: </span>
                  <span className="text-sm font-black text-slate-950">{formatCurrency(totalValueOfItems)}</span>
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Notas de Envío</label>
                <input 
                  type="text" 
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  placeholder="Ej. Entrega urgente turno mañana"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-[13px] outline-none"
                />
              </div>
            </div>

            <div className="pt-3 flex-shrink-0">
              <Button 
                onClick={handleCreateDispatchSubmit}
                disabled={isCreatingDispatch || selectedItems.length === 0}
                className="w-full h-14 rounded-2xl font-black text-[15px] bg-slate-900 text-white hover:bg-slate-800"
              >
                {isCreatingDispatch ? "Despachando..." : "Confirmar y Enviar Despacho"}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

    </div>
  );
}
