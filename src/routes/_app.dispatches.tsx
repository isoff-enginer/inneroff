import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { 
  Plus, 
  ArrowRight, 
  CheckCircle2, 
  Package, 
  Send, 
  Clock, 
  Calendar, 
  ChevronLeft,
  SlidersHorizontal,
  X,
  Store,
  Factory,
  Archive,
  CircleDollarSign
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { formatCurrency } from "@/lib/format";
import type { LocationType } from "@/types/domain";
import { useDispatches, type LiveDispatch } from "@/features/dispatches/use-dispatches";
import { useInventoryData } from "@/features/inventory/use-inventory-data";
import { useSession } from "@/features/auth/session";
import { toast } from "sonner";

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
  const { user, role } = useSession();
  const { dispatches, locations, isLoading, createDispatch, isCreatingDispatch, receiveDispatch, isReceivingDispatch } = useDispatches();
  const { allProducts } = useInventoryData();

  // Safely extract typed location arrays
  const stores = useMemo(() => Array.isArray(locations) ? locations.filter(l => l.type === "store") : [], [locations]);
  const warehouses = useMemo(() => Array.isArray(locations) ? locations.filter(l => l.type === "warehouse") : [], [locations]);
  const factories = useMemo(() => Array.isArray(locations) ? locations.filter(l => l.type === "factory") : [], [locations]);

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
  const [selectedItems, setSelectedItems] = useState<{ productId: string; name: string; quantity: number; unitValue: number }[]>([]);

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

    setSelectedItems(prev => [
      ...prev,
      { productId, name: prod.name, quantity: 1, unitValue: Number(prod.unit_value || 0) }
    ]);
  };

  const handleUpdateItemQty = (productId: string, delta: number) => {
    setSelectedItems(prev =>
      prev.map(item => {
        if (item.productId === productId) {
          const newQ = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQ };
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
      toast.error("Agrega al menos un producto");
      return;
    }

    try {
      await createDispatch({
        fromType,
        fromId: effectiveFromId,
        toType,
        toId: effectiveToId,
        notes: dispatchNotes,
        items: selectedItems.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
          unitValue: i.unitValue
        }))
      });

      toast.success("Despacho creado exitosamente");
      setIsCreateOpen(false);
      setSelectedItems([]);
      setDispatchNotes("");
    } catch (err: any) {
      toast.error(err.message || "Error al crear despacho");
    }
  };

  const totalValueOfItems = selectedItems.reduce((acc, curr) => acc + (curr.quantity * curr.unitValue), 0);

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-stone-900 pb-28 font-sans">
      <div className="mx-auto max-w-md px-5 pt-3 space-y-4">
        
        {/* HEADER */}
        <header className="flex items-center justify-between py-2">
          <button 
            onClick={() => navigate({ to: "/dashboard" })}
            className="flex size-10 items-center justify-center rounded-full bg-white border border-stone-200/80 shadow-2xs text-stone-700 active:scale-95 transition-transform"
          >
            <ChevronLeft className="size-5" />
          </button>

          <h1 className="text-lg font-black tracking-tight text-stone-950">
            Despachos
          </h1>

          <button 
            onClick={() => setIsCreateOpen(true)}
            className="flex size-10 items-center justify-center rounded-full bg-[#FEE867] border border-stone-900/10 shadow-2xs text-stone-950 active:scale-95 transition-transform"
          >
            <Plus className="size-5 stroke-[2.5]" />
          </button>
        </header>

        {/* SEARCH & FILTERS */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1">
            <input 
              type="text" 
              className="block w-full pl-4 pr-10 py-3 rounded-2xl bg-white border border-stone-200/80 text-[14px] text-stone-900 placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-stone-900 shadow-2xs"
              placeholder="Buscar por #, origen, destino..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400">
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* HORIZONTAL FILTER PILLS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button 
            onClick={() => setFilterTab("todos")}
            className={`whitespace-nowrap px-4 py-2 rounded-2xl text-[13px] font-bold transition-colors ${filterTab === "todos" ? 'bg-[#FEE867] text-stone-950 shadow-2xs' : 'bg-white border border-stone-200/80 text-stone-600'}`}
          >
            Todos ({dispatches.length})
          </button>
          <button 
            onClick={() => setFilterTab("despachados")}
            className={`whitespace-nowrap px-4 py-2 rounded-2xl text-[13px] font-bold transition-colors ${filterTab === "despachados" ? 'bg-[#FEE867] text-stone-950 shadow-2xs' : 'bg-white border border-stone-200/80 text-stone-600'}`}
          >
            En Camino
          </button>
          <button 
            onClick={() => setFilterTab("recibidos")}
            className={`whitespace-nowrap px-4 py-2 rounded-2xl text-[13px] font-bold transition-colors ${filterTab === "recibidos" ? 'bg-[#FEE867] text-stone-950 shadow-2xs' : 'bg-white border border-stone-200/80 text-stone-600'}`}
          >
            Recibidos
          </button>
        </div>

        {/* DISPATCHES LIST */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-white/60 rounded-[28px] animate-pulse border border-stone-200/60" />
            ))}
          </div>
        ) : filteredDispatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-stone-400">
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
                  className="p-4 rounded-[28px] bg-white border border-stone-200/80 shadow-2xs hover:border-stone-400 transition-all cursor-pointer active:scale-[0.99] flex flex-col gap-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="size-7 rounded-full bg-[#FAF7F2] border border-stone-200 flex items-center justify-center font-black text-xs text-stone-800">
                        #{d.dispatchNumber}
                      </span>
                      <span className="text-[14px] font-black text-stone-900 truncate max-w-[180px]">
                        {d.toLocationName}
                      </span>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                      isReceived ? 'bg-emerald-100 text-emerald-800' : 'bg-[#FEE867] text-stone-950'
                    }`}>
                      {isReceived ? "Recibido" : "Enviado"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[12px] text-stone-500 font-semibold border-t border-stone-100 pt-2">
                    <span className="flex items-center gap-1">
                      {d.fromLocationName} <ArrowRight className="size-3 text-stone-400" /> {d.toLocationName}
                    </span>
                    <span className="text-[14px] font-black text-stone-950">
                      {formatCurrency(d.totalValue || 0)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* DRAWER: DETALLE DE DESPACHO */}
      <Drawer open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DrawerContent className="bg-[#FAF7F2] border-t-0 px-5 pb-8">
          {selectedDispatch && (
            <div className="flex flex-col max-h-[85vh]">
              <div className="py-3 border-b border-stone-200 mb-3 text-center">
                <span className="text-[11px] font-black uppercase text-stone-400">Detalle de Envío</span>
                <h2 className="text-2xl font-black text-stone-950">Despacho #{selectedDispatch.dispatchNumber}</h2>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto pb-3">
                <div className="p-4 rounded-2xl bg-white border border-stone-200/80 space-y-2">
                  <div className="flex justify-between text-[13px]">
                    <span className="font-semibold text-stone-500">Origen:</span>
                    <span className="font-black text-stone-900">{selectedDispatch.fromLocationName}</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="font-semibold text-stone-500">Destino (Tienda):</span>
                    <span className="font-black text-stone-900">{selectedDispatch.toLocationName}</span>
                  </div>
                  <div className="flex justify-between text-[13px] border-t border-stone-100 pt-2">
                    <span className="font-semibold text-stone-500">Valor Total:</span>
                    <span className="font-black text-stone-950 text-base">{formatCurrency(selectedDispatch.totalValue || 0)}</span>
                  </div>
                </div>

                {selectedDispatch.items && selectedDispatch.items.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[12px] font-bold text-stone-400 uppercase">Productos incluidos:</span>
                    {selectedDispatch.items.map((it: any) => (
                      <div key={it.id} className="flex justify-between p-3 rounded-xl bg-white border border-stone-200 text-[13px]">
                        <span className="font-bold text-stone-900">{it.products?.name || "Producto"}</span>
                        <span className="font-black text-stone-700">{it.quantity} unds</span>
                      </div>
                    ))}
                  </div>
                )}

                {selectedDispatch.status === "dispatched" && (
                  <div className="pt-2">
                    <Button 
                      onClick={handleReceiveDispatch}
                      disabled={isReceivingDispatch}
                      className="w-full h-14 rounded-2xl font-black text-[15px] bg-emerald-600 text-white hover:bg-emerald-700 shadow-md"
                    >
                      {isReceivingDispatch ? "Confirmando..." : "Confirmar y Recibir Despacho"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      {/* DRAWER: CREAR NUEVO DESPACHO */}
      <Drawer open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DrawerContent className="bg-white border-t-0 px-5 pb-8">
          <div className="flex flex-col max-h-[85vh]">
            <div className="py-3 border-b border-stone-100 mb-3 flex-shrink-0">
              <h2 className="text-xl font-black text-stone-900">Crear Nuevo Despacho</h2>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pb-3 scrollbar-hide">
              {/* Selector Origen y Destino */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-stone-500 block mb-1">Origen</label>
                  <select 
                    value={fromType}
                    onChange={(e) => setFromType(e.target.value as LocationType)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-3 text-[13px] font-bold outline-none"
                  >
                    <option value="warehouse">Bodega</option>
                    <option value="factory">Fábrica</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-stone-500 block mb-1">Destino</label>
                  <select 
                    value={toType}
                    onChange={(e) => setToType(e.target.value as LocationType)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-3 text-[13px] font-bold outline-none"
                  >
                    <option value="store">Tienda</option>
                    <option value="warehouse">Bodega</option>
                  </select>
                </div>
              </div>

              {toType === "store" && (
                <div>
                  <label className="text-[11px] font-bold text-stone-500 block mb-1">Nombre de la Tienda *</label>
                  <select 
                    value={toId}
                    onChange={(e) => setToId(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-3.5 text-[14px] font-bold text-stone-900 outline-none"
                  >
                    <option value="">Selecciona la tienda</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              {/* Agregar Productos */}
              <div>
                <label className="text-[11px] font-bold text-stone-500 block mb-1">Catálogo de Productos</label>
                <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
                  {allProducts.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleAddItem(p.id)}
                      className="whitespace-nowrap px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-[#FEE867] text-[12px] font-bold text-stone-800 transition-colors"
                    >
                      + {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Items agregados */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-stone-400 uppercase">Productos a enviar:</span>
                {selectedItems.map(item => (
                  <div key={item.productId} className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-200">
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-stone-900">{item.name}</span>
                      <span className="text-[11px] text-stone-500">${item.unitValue.toLocaleString()} c/u</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleUpdateItemQty(item.productId, -1)}
                        className="size-7 rounded-lg bg-white border border-stone-300 flex items-center justify-center font-bold"
                      >-</button>
                      <span className="text-sm font-black w-6 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => handleUpdateItemQty(item.productId, 1)}
                        className="size-7 rounded-lg bg-white border border-stone-300 flex items-center justify-center font-bold"
                      >+</button>
                      <button 
                        onClick={() => handleRemoveItem(item.productId)}
                        className="text-stone-400 hover:text-rose-600 pl-1"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {selectedItems.length > 0 && (
                <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-stone-200 flex justify-between items-center">
                  <span className="text-[12px] font-bold text-stone-500">Valor Total Despacho:</span>
                  <span className="text-base font-black text-stone-950">{formatCurrency(totalValueOfItems)}</span>
                </div>
              )}
            </div>

            <div className="pt-3 flex-shrink-0">
              <Button 
                onClick={handleCreateDispatchSubmit}
                disabled={isCreatingDispatch || selectedItems.length === 0}
                className="w-full h-14 rounded-2xl font-black text-[15px] bg-[#FEE867] text-stone-950 hover:bg-[#FEE867]/90 shadow-md"
              >
                {isCreatingDispatch ? "Creando..." : "Despachar Mercancía"}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

    </div>
  );
}
