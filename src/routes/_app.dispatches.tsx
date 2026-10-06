import { createFileRoute } from "@tanstack/react-router";
import { Plus, ArrowRight, CheckCircle, Package, Send, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import {
  DISPATCH_STATUS_LABELS,
  DISPATCH_STATUS_TONES,
} from "@/features/dispatches/mock-data";
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
      {
        name: "description",
        content: "Flujo operativo de despachos entre fábrica, bodegas y tiendas.",
      },
    ],
  }),
  component: DispatchesPage,
});

function DispatchesPage() {
  const { user, role } = useSession();
  const { dispatches, locations, isLoading, createDispatch, isCreatingDispatch, receiveDispatch, isReceivingDispatch } = useDispatches();
  const { allProducts } = useInventoryData();

  const [query, setQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"todos" | "por_recibir" | "despachados" | "recibidos">("todos");

  // Selected dispatch detail drawer
  const [selectedDispatch, setSelectedDispatch] = useState<LiveDispatch | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [receiveNotes, setReceiveNotes] = useState("");

  // Create dispatch modal/drawer
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [fromType, setFromType] = useState<LocationType>(
    role === "warehouse" ? "warehouse" : role === "store" ? "store" : "factory"
  );
  const [fromId, setFromId] = useState(
    role === "warehouse" ? user?.warehouseId || "" : role === "factory" ? user?.factoryId || "" : ""
  );
  const [toType, setToType] = useState<LocationType>(
    role === "factory" ? "warehouse" : "store"
  );
  const [toId, setToId] = useState("");
  const [dispatchNotes, setDispatchNotes] = useState("");
  const [selectedItems, setSelectedItems] = useState<{ productId: string; quantity: number; unitValue: number }[]>([]);

  // Filtered dispatches
  const filteredDispatches = useMemo(() => {
    return dispatches.filter((dispatch) => {
      const text = `${dispatch.dispatchNumber} ${dispatch.fromLocationName} ${dispatch.toLocationName} ${dispatch.notes || ""}`.toLowerCase();
      const matchesQuery = text.includes(query.trim().toLowerCase());
      if (!matchesQuery) return false;

      if (filterTab === "por_recibir") {
        return dispatch.status === "dispatched";
      }
      if (filterTab === "despachados") {
        return dispatch.status === "dispatched";
      }
      if (filterTab === "recibidos") {
        return dispatch.status === "received";
      }
      return true;
    });
  }, [dispatches, query, filterTab]);

  const pendingReceiveCount = dispatches.filter(d => d.status === "dispatched").length;

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
      toast.success(`Despacho #${selectedDispatch.dispatchNumber} recibido y aceptado`);
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
      { productId, quantity: 1, unitValue: Number(prod.unit_value || 0) }
    ]);
  };

  const handleUpdateItemQty = (productId: string, delta: number) => {
    setSelectedItems(prev =>
      prev.map(item => {
        if (item.productId === productId) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (productId: string) => {
    setSelectedItems(prev => prev.filter(i => i.productId !== productId));
  };

  const handleCreateDispatchSubmit = async () => {
    if (!fromId || !toId) {
      toast.error("Selecciona origen y destino");
      return;
    }
    if (selectedItems.length === 0) {
      toast.error("Agrega al menos un producto");
      return;
    }

    try {
      await createDispatch({
        fromLocationType: fromType,
        fromId,
        toLocationType: toType,
        toId,
        items: selectedItems.map(i => ({
          product_id: i.productId,
          quantity: i.quantity,
          unit_value: i.unitValue,
        })),
        notes: dispatchNotes,
      });

      toast.success("Despacho creado y enviado exitosamente");
      setIsCreateOpen(false);
      setSelectedItems([]);
      setDispatchNotes("");
    } catch (err: any) {
      toast.error(err.message || "Error al crear despacho");
    }
  };

  const canCreateDispatch = role === "boss" || role === "boss_admin" || role === "operations_admin" || role === "factory" || role === "warehouse";

  return (
    <div className="flex flex-col min-h-screen bg-[#231934] pb-24 text-white">
      {/* HEADER */}
      <header className="sticky top-0 z-10 bg-[#1e152d]/90 backdrop-blur-md border-b border-white/10 px-5 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-black text-white">Despachos</h1>
            <p className="text-xs text-[#a497be] mt-0.5">
              {role === "warehouse" ? "Recibe de fábrica y despacha a tiendas" : "Flujo de envíos y recepciones"}
            </p>
          </div>
          {canCreateDispatch && (
            <Button
              onClick={() => {
                if (role === "factory" && user?.factoryId) {
                  setFromType("factory");
                  setFromId(user.factoryId);
                  setToType("warehouse");
                  const wh = locations.find(l => l.type === "warehouse");
                  if (wh) setToId(wh.id);
                } else if (role === "warehouse" && user?.warehouseId) {
                  setFromType("warehouse");
                  setFromId(user.warehouseId);
                  setToType("store");
                  const st = locations.find(l => l.type === "store");
                  if (st) setToId(st.id);
                }
                setIsCreateOpen(true);
              }}
              className="bg-[#246bfd] hover:bg-[#1a4ec8] text-white font-black h-10 px-4 rounded-2xl shadow-md shadow-[#246bfd]/30 active:scale-95"
            >
              <Plus className="size-4 mr-1.5" />
              Nuevo
            </Button>
          )}
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#a497be]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por #, origen o destino…"
            className="w-full bg-[#2d2244] pl-10 pr-9 py-2.5 rounded-2xl border border-white/10 text-sm text-white font-medium outline-none focus:border-[#246bfd] transition-colors"
          />
          {query && (
            <button 
              onClick={() => setQuery("")} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a497be] hover:text-white"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setFilterTab("todos")}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              filterTab === "todos" 
                ? "bg-[#246bfd] text-white shadow-md shadow-[#246bfd]/30" 
                : "bg-[#2d2244] text-[#a497be] border border-white/10 hover:border-white/20"
            }`}
          >
            Todos ({dispatches.length})
          </button>
          <button
            onClick={() => setFilterTab("por_recibir")}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              filterTab === "por_recibir" 
                ? "bg-[#f79193] text-[#231934] font-black shadow-md shadow-[#f79193]/30" 
                : "bg-[#2d2244] text-[#a497be] border border-white/10 hover:border-white/20"
            }`}
          >
            Por recibir {pendingReceiveCount > 0 && `(${pendingReceiveCount})`}
          </button>
          <button
            onClick={() => setFilterTab("recibidos")}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              filterTab === "recibidos" 
                ? "bg-[#8ec97b] text-[#14280f] font-black shadow-md shadow-[#8ec97b]/30" 
                : "bg-[#2d2244] text-[#a497be] border border-white/10 hover:border-white/20"
            }`}
          >
            Recibidos
          </button>
        </div>
      </header>

      {/* LISTA DE DESPACHOS */}
      <main className="flex-1 px-5 pt-4 max-w-md mx-auto w-full">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-28 bg-[#2d2244] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredDispatches.length === 0 ? (
          <div className="py-20 text-center text-[#a497be]">
            <Package className="size-12 mb-2 opacity-30 text-[#246bfd] mx-auto" />
            <p className="text-sm font-medium">{query ? "No hay despachos con ese filtro." : "No hay despachos registrados aún."}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDispatches.map((dispatch) => {
              const isPendingReceive = dispatch.status === "dispatched";

              return (
                <div
                  key={dispatch.id}
                  onClick={() => handleOpenDetail(dispatch)}
                  className="bg-[#2d2244] p-4 rounded-[26px] border border-white/10 shadow-lg active:scale-[0.99] transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="tabular text-xs font-black text-[#a497be]">
                        #{String(dispatch.dispatchNumber).padStart(4, "0")}
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        dispatch.status === "received"
                          ? "bg-[#8ec97b]/20 text-[#8ec97b] border-[#8ec97b]/30"
                          : "bg-[#f79193]/20 text-[#f79193] border-[#f79193]/30"
                      }`}>
                        {DISPATCH_STATUS_LABELS[dispatch.status] || dispatch.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm font-bold text-white mb-1.5">
                      <span className="truncate">{dispatch.fromLocationName}</span>
                      <ArrowRight className="size-3.5 text-[#246bfd] shrink-0" />
                      <span className="truncate">{dispatch.toLocationName}</span>
                    </div>

                    <div className="text-xs text-[#a497be] flex items-center gap-2">
                      <span>{dispatch.items.length} {dispatch.items.length === 1 ? 'producto' : 'productos'}</span>
                      <span>•</span>
                      <span>{new Date(dispatch.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between">
                    <span className="text-sm font-black text-white">
                      {formatCurrency(dispatch.totalValue)}
                    </span>
                    {isPendingReceive && (
                      <span className="text-[10px] font-bold text-[#f79193] bg-[#f79193]/15 px-2.5 py-0.5 rounded-full border border-[#f79193]/30">
                        Pendiente recibir
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* DRAWER: DETALLE DEL DESPACHO & ACCIÓN DE RECEPCIÓN */}
      <Drawer open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DrawerContent className="bg-[#231934] border-t border-white/10 px-5 pb-8 text-white">
          {selectedDispatch && (
            <div className="flex flex-col max-h-[85vh]">
              <div className="py-4 border-b border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#a497be] uppercase">
                    Despacho #{String(selectedDispatch.dispatchNumber).padStart(4, "0")}
                  </span>
                  <h2 className="text-xl font-black text-white mt-0.5">
                    {selectedDispatch.fromLocationName} → {selectedDispatch.toLocationName}
                  </h2>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  selectedDispatch.status === "received"
                    ? "bg-[#8ec97b]/20 text-[#8ec97b] border-[#8ec97b]/30"
                    : "bg-[#f79193]/20 text-[#f79193] border-[#f79193]/30"
                }`}>
                  {DISPATCH_STATUS_LABELS[selectedDispatch.status]}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-4 scrollbar-hide">
                {/* ITEMS */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#a497be] mb-2">
                    Productos ({selectedDispatch.items.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedDispatch.items.map(item => (
                      <div
                        key={item.id}
                        className="bg-[#2d2244] p-3.5 rounded-2xl flex items-center justify-between border border-white/10"
                      >
                        <div>
                          <span className="text-sm font-bold text-white block">{item.productName}</span>
                          <span className="text-xs text-[#a497be]">${item.unitValue.toLocaleString()} c/u</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-white block">{item.quantity} {item.unitName}</span>
                          <span className="text-xs font-black text-[#8ec97b]">${item.totalValue.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* INFO ADICIONAL */}
                <div className="bg-[#2d2244] p-4 rounded-2xl space-y-2 text-xs text-[#a497be] border border-white/10">
                  <div className="flex justify-between">
                    <span>Creado por:</span>
                    <span className="font-bold text-white">{selectedDispatch.createdByName || "Sistema"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fecha:</span>
                    <span className="font-bold text-white">{new Date(selectedDispatch.createdAt).toLocaleString()}</span>
                  </div>
                  {selectedDispatch.notes && (
                    <div className="pt-2 border-t border-white/10">
                      <span className="block text-[#a497be] font-bold mb-1">Notas:</span>
                      <p className="text-white italic">{selectedDispatch.notes}</p>
                    </div>
                  )}
                </div>

                {/* ACCIÓN ACEPTAR Y RECIBIR DESPACHO */}
                {selectedDispatch.status === "dispatched" && (
                  <div className="bg-[#2d2244] border border-[#8ec97b]/30 p-4 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-[#8ec97b] font-bold text-sm">
                      <CheckCircle className="size-5 text-[#8ec97b]" />
                      <span>Recepción en Destino</span>
                    </div>
                    <p className="text-xs text-[#a497be] leading-relaxed">
                      Al aceptar este despacho, los productos se sumarán automáticamente al inventario de {selectedDispatch.toLocationName}.
                    </p>
                    <input
                      type="text"
                      placeholder="Nota de recepción (opcional)"
                      value={receiveNotes}
                      onChange={(e) => setReceiveNotes(e.target.value)}
                      className="w-full bg-[#231934] border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-[#246bfd]"
                    />
                    <Button
                      onClick={handleReceiveDispatch}
                      disabled={isReceivingDispatch}
                      className="w-full h-12 bg-[#8ec97b] hover:bg-[#7db66c] text-[#14280f] font-black rounded-2xl text-sm shadow-md shadow-[#8ec97b]/30"
                    >
                      {isReceivingDispatch ? "Procesando recepción..." : "Aceptar y Recibir Despacho"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      {/* DRAWER: NUEVO DESPACHO */}
      <Drawer open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DrawerContent className="bg-[#231934] border-t border-white/10 px-5 pb-8 text-white">
          <div className="flex flex-col max-h-[85vh]">
            <div className="py-4 border-b border-white/10 mb-3 flex-shrink-0">
              <h2 className="text-xl font-black text-white">Nuevo Despacho</h2>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pb-3 scrollbar-hide">
              {/* ORIGEN Y DESTINO */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#a497be] ml-1 mb-1 block uppercase">Origen</label>
                  <select
                    value={`${fromType}:${fromId}`}
                    onChange={(e) => {
                      const [t, id] = e.target.value.split(":");
                      setFromType(t as LocationType);
                      setFromId(id);
                    }}
                    className="w-full bg-[#2d2244] border border-white/10 rounded-2xl p-3 text-xs font-semibold text-white outline-none focus:border-[#246bfd]"
                  >
                    <option value="" disabled>Selecciona origen</option>
                    {locations.map(loc => (
                      <option key={`${loc.type}:${loc.id}`} value={`${loc.type}:${loc.id}`} className="bg-[#231934] text-white">
                        {loc.name} ({loc.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#a497be] ml-1 mb-1 block uppercase">Destino</label>
                  <select
                    value={`${toType}:${toId}`}
                    onChange={(e) => {
                      const [t, id] = e.target.value.split(":");
                      setToType(t as LocationType);
                      setToId(id);
                    }}
                    className="w-full bg-[#2d2244] border border-white/10 rounded-2xl p-3 text-xs font-semibold text-white outline-none focus:border-[#246bfd]"
                  >
                    <option value="" disabled>Selecciona destino</option>
                    {locations.map(loc => (
                      <option key={`${loc.type}:${loc.id}`} value={`${loc.type}:${loc.id}`} className="bg-[#231934] text-white">
                        {loc.name} ({loc.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SELECCIONAR PRODUCTOS */}
              <div>
                <label className="text-[11px] font-bold text-[#a497be] ml-1 mb-1 block uppercase">Agregar Producto</label>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) handleAddItem(e.target.value);
                  }}
                  className="w-full bg-[#2d2244] border border-white/10 rounded-2xl p-3 text-xs font-semibold text-white outline-none focus:border-[#246bfd]"
                >
                  <option value="">+ Seleccionar producto para agregar...</option>
                  {allProducts.map(prod => (
                    <option key={prod.id} value={prod.id} className="bg-[#231934] text-white">
                      {prod.name} (${Number(prod.unit_value || 0).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* ITEMS AGREGADOS */}
              {selectedItems.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-[#a497be] uppercase">Productos a despachar</span>
                  {selectedItems.map(item => {
                    const prod = allProducts.find(p => p.id === item.productId);
                    return (
                      <div
                        key={item.productId}
                        className="bg-[#2d2244] p-3 rounded-2xl flex items-center justify-between border border-white/10"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="text-xs font-bold text-white block truncate">{prod?.name || "Producto"}</span>
                          <span className="text-[11px] text-[#a497be]">${item.unitValue.toLocaleString()} c/u</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 bg-[#231934] rounded-xl p-1 border border-white/10">
                            <button
                              onClick={() => handleUpdateItemQty(item.productId, -1)}
                              className="size-6 flex items-center justify-center font-bold text-white"
                            >
                              -
                            </button>
                            <span className="font-bold text-xs w-6 text-center text-white">{item.quantity}</span>
                            <button
                              onClick={() => handleUpdateItemQty(item.productId, 1)}
                              className="size-6 flex items-center justify-center font-bold text-white"
                            >
                              +
                            </button>
                          </div>
                          <button
                            onClick={() => handleRemoveItem(item.productId)}
                            className="text-[#f75555] text-xs font-bold px-1"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* NOTAS */}
              <div>
                <label className="text-[11px] font-bold text-[#a497be] ml-1 mb-1 block uppercase">Notas de Despacho (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej. Entregar antes de las 5pm"
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  className="w-full bg-[#2d2244] border border-white/10 rounded-2xl p-3 text-xs text-white outline-none focus:border-[#246bfd]"
                />
              </div>
            </div>

            <div className="pt-3 flex-shrink-0">
              <Button
                onClick={handleCreateDispatchSubmit}
                disabled={isCreatingDispatch || selectedItems.length === 0 || !toId}
                className="w-full h-12 rounded-2xl font-black text-sm bg-[#246bfd] hover:bg-[#1a4ec8] text-white shadow-lg shadow-[#246bfd]/30"
              >
                {isCreatingDispatch ? "Despachando..." : "Confirmar y Despachar"}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
