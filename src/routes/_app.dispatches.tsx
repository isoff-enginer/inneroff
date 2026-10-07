import { createFileRoute } from "@tanstack/react-router";
import { Plus, ArrowRight, CheckCircle, Package, Send, Clock, Calendar, User } from "lucide-react";
import { useMemo, useState } from "react";

import { SearchBar } from "@/components/common/search-bar";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import {
  DISPATCH_STATUS_LABELS,
  DISPATCH_STATUS_TONES,
} from "@/features/dispatches/mock-data";
import { formatCurrency } from "@/lib/format";
import type { DispatchStatus, LocationType } from "@/types/domain";
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

const ALL = "all";

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
      toast.success(`Despacho #${selectedDispatch.dispatchNumber} recibido y aceptado exitosamente`);
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
    <div className="flex flex-col min-h-screen bg-gray-50 pb-20 sm:pb-8">
      {/* HEADER */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 pt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Despachos</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {role === "warehouse" ? "Recibe de fábrica y despacha a tiendas" : "Flujo de envíos y recepciones"}
            </p>
          </div>
          {canCreateDispatch && (
            <Button
              onClick={() => {
                // Auto-set default locations
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
              className="bg-black text-white font-bold h-10 px-4 rounded-xl shadow-xs active:scale-95"
            >
              <Plus className="size-4 mr-1.5" />
              Nuevo
            </Button>
          )}
        </div>

        <div className="flex gap-2 mb-3">
          <SearchBar
            value={query}
            onValueChange={setQuery}
            placeholder="Buscar por #, origen o destino…"
            label="Buscar despacho"
            className="w-full"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setFilterTab("todos")}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-colors ${filterTab === "todos" ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Todos ({dispatches.length})
          </button>
          <button
            onClick={() => setFilterTab("por_recibir")}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-colors ${filterTab === "por_recibir" ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-gray-100 text-gray-600'}`}
          >
            Por recibir {pendingReceiveCount > 0 && `(${pendingReceiveCount})`}
          </button>
          <button
            onClick={() => setFilterTab("recibidos")}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-colors ${filterTab === "recibidos" ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-gray-100 text-gray-600'}`}
          >
            Recibidos
          </button>
        </div>
      </header>

      {/* LISTA DE DESPACHOS */}
      <main className="flex-1 px-4 pt-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-28 bg-gray-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredDispatches.length === 0 ? (
          <EmptyState
            title="Sin despachos"
            description={query ? "No hay despachos con ese filtro." : "No hay registros de despachos aún."}
          />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredDispatches.map((dispatch) => {
              const isPendingReceive = dispatch.status === "dispatched";

              return (
                <li
                  key={dispatch.id}
                  onClick={() => handleOpenDetail(dispatch)}
                  className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100 active:scale-[0.99] transition-transform cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="tabular text-xs font-bold text-gray-400">
                        #{String(dispatch.dispatchNumber).padStart(4, "0")}
                      </span>
                      <StatusBadge tone={DISPATCH_STATUS_TONES[dispatch.status] || "neutral"}>
                        {DISPATCH_STATUS_LABELS[dispatch.status] || dispatch.status}
                      </StatusBadge>
                    </div>

                    <div className="flex items-center gap-2 text-[14px] font-semibold text-gray-900 mb-2">
                      <span className="truncate">{dispatch.fromLocationName}</span>
                      <ArrowRight className="size-4 text-gray-400 shrink-0" />
                      <span className="truncate">{dispatch.toLocationName}</span>
                    </div>

                    <div className="text-xs text-muted-foreground flex items-center gap-3">
                      <span>{dispatch.items.length} {dispatch.items.length === 1 ? 'producto' : 'productos'}</span>
                      <span>•</span>
                      <span>{new Date(dispatch.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-900">
                      {formatCurrency(dispatch.totalValue)}
                    </span>
                    {isPendingReceive && (
                      <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                        Pendiente recibir
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      {/* DRAWER: DETALLE DEL DESPACHO & ACCIÓN DE RECEPCIÓN */}
      <Drawer open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DrawerContent className="bg-white border-t-0 px-5 pb-8">
          {selectedDispatch && (
            <div className="flex flex-col max-h-[85vh]">
              <div className="py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase">
                    Despacho #{String(selectedDispatch.dispatchNumber).padStart(4, "0")}
                  </span>
                  <h2 className="text-xl font-black text-gray-900 mt-0.5">
                    {selectedDispatch.fromLocationName} → {selectedDispatch.toLocationName}
                  </h2>
                </div>
                <StatusBadge tone={DISPATCH_STATUS_TONES[selectedDispatch.status] || "neutral"}>
                  {DISPATCH_STATUS_LABELS[selectedDispatch.status]}
                </StatusBadge>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-4 scrollbar-hide">
                {/* ITEMS */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Productos ({selectedDispatch.items.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedDispatch.items.map(item => (
                      <div
                        key={item.id}
                        className="bg-gray-50 p-3 rounded-xl flex items-center justify-between border border-gray-100"
                      >
                        <div>
                          <span className="text-sm font-bold text-gray-900 block">{item.productName}</span>
                          <span className="text-xs text-gray-500">${item.unitValue.toLocaleString()} c/u</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-gray-900 block">{item.quantity} {item.unitName}</span>
                          <span className="text-xs font-semibold text-gray-600">${item.totalValue.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* INFO ADICIONAL */}
                <div className="bg-gray-50 p-3.5 rounded-xl space-y-2 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Creado por:</span>
                    <span className="font-semibold text-gray-900">{selectedDispatch.createdByName || "Sistema"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fecha:</span>
                    <span className="font-semibold text-gray-900">{new Date(selectedDispatch.createdAt).toLocaleString()}</span>
                  </div>
                  {selectedDispatch.receivedByName && (
                    <div className="flex justify-between">
                      <span>Recibido por:</span>
                      <span className="font-semibold text-gray-900">{selectedDispatch.receivedByName}</span>
                    </div>
                  )}
                  {selectedDispatch.notes && (
                    <div className="pt-2 border-t border-gray-200">
                      <span className="block text-gray-400 font-bold mb-1">Notas:</span>
                      <p className="text-gray-800 italic">{selectedDispatch.notes}</p>
                    </div>
                  )}
                </div>

                {/* ACCIÓN ACEPTAR Y RECIBIR DESPACHO */}
                {selectedDispatch.status === "dispatched" && (
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                      <CheckCircle className="size-5 text-emerald-600" />
                      <span>Recepción en Destino</span>
                    </div>
                    <p className="text-xs text-emerald-700 leading-relaxed">
                      Al aceptar este despacho, los productos se sumarán automáticamente al inventario de {selectedDispatch.toLocationName}.
                    </p>
                    <input
                      type="text"
                      placeholder="Nota de recepción (opcional)"
                      value={receiveNotes}
                      onChange={(e) => setReceiveNotes(e.target.value)}
                      className="w-full bg-white border border-emerald-200 rounded-xl p-2.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <Button
                      onClick={handleReceiveDispatch}
                      disabled={isReceivingDispatch}
                      className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm"
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
        <DrawerContent className="bg-white border-t-0 px-5 pb-8">
          <div className="flex flex-col max-h-[85vh]">
            <div className="py-4 border-b border-gray-100 mb-3 flex-shrink-0">
              <h2 className="text-xl font-black text-gray-900">Nuevo Despacho</h2>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pb-3 scrollbar-hide">
              {/* ORIGEN Y DESTINO */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 ml-1 mb-1 block uppercase">Origen</label>
                  <select
                    value={`${fromType}:${fromId}`}
                    onChange={(e) => {
                      const [t, id] = e.target.value.split(":");
                      setFromType(t as LocationType);
                      setFromId(id);
                    }}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-semibold outline-none"
                  >
                    <option value="" disabled>Selecciona origen</option>
                    {locations.map(loc => (
                      <option key={`${loc.type}:${loc.id}`} value={`${loc.type}:${loc.id}`}>
                        {loc.name} ({loc.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-500 ml-1 mb-1 block uppercase">Destino</label>
                  <select
                    value={`${toType}:${toId}`}
                    onChange={(e) => {
                      const [t, id] = e.target.value.split(":");
                      setToType(t as LocationType);
                      setToId(id);
                    }}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-semibold outline-none"
                  >
                    <option value="" disabled>Selecciona destino</option>
                    {locations.map(loc => (
                      <option key={`${loc.type}:${loc.id}`} value={`${loc.type}:${loc.id}`}>
                        {loc.name} ({loc.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SELECCIONAR PRODUCTOS */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 ml-1 mb-1 block uppercase">Agregar Producto</label>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) handleAddItem(e.target.value);
                  }}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-semibold outline-none"
                >
                  <option value="">+ Seleccionar producto para agregar...</option>
                  {allProducts.map(prod => (
                    <option key={prod.id} value={prod.id}>
                      {prod.name} (${Number(prod.unit_value || 0).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* ITEMS AGREGADOS */}
              {selectedItems.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-gray-400 uppercase">Productos a despachar</span>
                  {selectedItems.map(item => {
                    const prod = allProducts.find(p => p.id === item.productId);
                    return (
                      <div
                        key={item.productId}
                        className="bg-gray-50 p-3 rounded-xl flex items-center justify-between border border-gray-100"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="text-xs font-bold text-gray-900 block truncate">{prod?.name || "Producto"}</span>
                          <span className="text-[11px] text-gray-500">${item.unitValue.toLocaleString()} c/u</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-gray-200">
                            <button
                              onClick={() => handleUpdateItemQty(item.productId, -1)}
                              className="size-6 flex items-center justify-center font-bold text-gray-600"
                            >
                              -
                            </button>
                            <span className="font-bold text-xs w-6 text-center">{item.quantity}</span>
                            <button
                              onClick={() => handleUpdateItemQty(item.productId, 1)}
                              className="size-6 flex items-center justify-center font-bold text-gray-600"
                            >
                              +
                            </button>
                          </div>
                          <button
                            onClick={() => handleRemoveItem(item.productId)}
                            className="text-rose-500 text-xs font-bold px-1"
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
                <label className="text-[11px] font-bold text-gray-500 ml-1 mb-1 block uppercase">Notas de Despacho (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej. Entregar antes de las 5pm"
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs outline-none focus:border-black"
                />
              </div>
            </div>

            <div className="pt-3 flex-shrink-0">
              <Button
                onClick={handleCreateDispatchSubmit}
                disabled={isCreatingDispatch || selectedItems.length === 0 || !toId}
                className="w-full h-12 rounded-xl font-bold text-sm bg-black text-white"
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
