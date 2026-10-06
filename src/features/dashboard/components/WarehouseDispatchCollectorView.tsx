import { useState } from "react";
import { 
  Package, 
  Send, 
  Wallet, 
  CheckCircle2, 
  Plus, 
  Minus, 
  AlertCircle,
  Store,
  TrendingUp,
  Search,
  Check,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useDispatches, type LiveDispatch } from "@/features/dispatches/use-dispatches";
import { useInventoryData } from "@/features/inventory/use-inventory-data";
import { CATALOG_PRODUCTS, type CatalogProduct } from "@/features/inventory/product-catalog";
import { ProductCard } from "@/features/inventory/components/ProductCard";
import { useSession } from "@/features/auth/session";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";

export function WarehouseDispatchCollectorView() {
  const { user } = useSession();
  const { dispatches, locations, createDispatch, isCreatingDispatch, receiveDispatch, isReceivingDispatch } = useDispatches();
  const { inventory } = useInventoryData();

  // Drawers
  const [isDispatchToStoreOpen, setIsDispatchToStoreOpen] = useState(false);
  const [isCollectMoneyOpen, setIsCollectMoneyOpen] = useState(false);

  // Dispatch to store state
  const [selectedStore, setSelectedStore] = useState("Cambalache");
  const [categoryFilter, setCategoryFilter] = useState<"Todos" | "Verde" | "Blanco">("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductsMap, setSelectedProductsMap] = useState<Record<string, { qty: number; presentation: string }>>({
    "prod-gordos": { qty: 1, presentation: "unidad" }
  });
  const [maxCapLimit, setMaxCapLimit] = useState(250000); // $250,000 default cap

  // Collect money state
  const [collectStore, setCollectStore] = useState("Cambalache");
  const [collectedAmount, setCollectedAmount] = useState("");
  const [collectorName, setCollectorName] = useState("");
  const [collectNotes, setCollectNotes] = useState("");
  const [isCollecting, setIsCollecting] = useState(false);

  // Incoming dispatches from factory
  const incomingFromFactory = dispatches.filter(d => d.status === "dispatched");

  // Calculate total dispatch value
  const totalDispatchValue = Object.entries(selectedProductsMap).reduce((acc, [prodId, config]) => {
    const product = CATALOG_PRODUCTS.find(p => p.id === prodId);
    if (!product) return acc;
    const pres = product.presentations.find(p => p.name === config.presentation) || product.presentations[0];
    const unitPrice = pres ? pres.price : product.defaultPrice;
    return acc + (unitPrice * config.qty);
  }, 0);

  const isOverCap = totalDispatchValue > maxCapLimit;

  // Toggle item selection in dispatch modal
  const handleToggleProductInDispatch = (product: CatalogProduct) => {
    const exists = selectedProductsMap[product.id];
    if (exists) {
      const next = { ...selectedProductsMap };
      delete next[product.id];
      setSelectedProductsMap(next);
    } else {
      setSelectedProductsMap({
        ...selectedProductsMap,
        [product.id]: { qty: 1, presentation: product.presentations[0].name }
      });
    }
  };

  const handleUpdatePresentation = (productId: string, presName: string) => {
    const current = selectedProductsMap[productId] || { qty: 1, presentation: presName };
    setSelectedProductsMap({
      ...selectedProductsMap,
      [productId]: { ...current, presentation: presName }
    });
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    const current = selectedProductsMap[productId] || { qty: 1, presentation: "unidad" };
    const newQty = Math.max(1, current.qty + delta);
    setSelectedProductsMap({
      ...selectedProductsMap,
      [productId]: { ...current, qty: newQty }
    });
  };

  // Handle Receiving incoming dispatch
  const handleAcceptFactoryDispatch = async (disp: LiveDispatch) => {
    try {
      await receiveDispatch({ dispatchId: disp.id, notes: "Recibido en Bodega" });
      toast.success(`Despacho #${disp.dispatchNumber} aceptado y sumado a bodega`);
    } catch (e: any) {
      toast.error(e.message || "Error al recibir despacho");
    }
  };

  // Handle Dispatched to Store
  const handleConfirmStoreDispatch = async () => {
    const entries = Object.entries(selectedProductsMap);
    if (entries.length === 0) {
      toast.error("Selecciona al menos un producto para despachar");
      return;
    }

    if (isOverCap) {
      toast.error(`El despacho supera el límite máximo permitido de ${formatCurrency(maxCapLimit)}`);
      return;
    }

    try {
      const targetStore = locations.find(l => l.name.toLowerCase().includes(selectedStore.toLowerCase()) && l.type === "store") || locations.find(l => l.type === "store");
      
      const dispatchItems = entries.map(([prodId, config]) => {
        const prod = CATALOG_PRODUCTS.find(p => p.id === prodId)!;
        const pres = prod.presentations.find(p => p.name === config.presentation) || prod.presentations[0];
        const unitVal = pres ? pres.price : prod.defaultPrice;
        return {
          product_id: prod.id,
          quantity: config.qty,
          unit_value: unitVal,
        };
      });

      await createDispatch({
        fromLocationType: "warehouse",
        fromId: user?.warehouseId || locations.find(l => l.type === "warehouse")?.id || "",
        toLocationType: "store",
        toId: targetStore?.id || "",
        items: dispatchItems,
        notes: `Despacho a ${selectedStore}`,
      });

      toast.success(`Despacho a ${selectedStore} enviado exitosamente (${formatCurrency(totalDispatchValue)})`);
      setIsDispatchToStoreOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Error al despachar a tienda");
    }
  };

  // Handle Collect Money (Recoger Dinero) with RPC support to prevent permission denied
  const handleCollectMoneySubmit = async () => {
    const amountNum = Number(collectedAmount);
    if (!amountNum || amountNum <= 0) {
      toast.error("Ingresa un monto válido mayor a 0");
      return;
    }

    setIsCollecting(true);
    try {
      const targetStore = locations.find(l => l.name.toLowerCase().includes(collectStore.toLowerCase()) && l.type === "store");
      const storeId = targetStore?.id || locations.find(l => l.type === "store")?.id || null;

      // 1. Intentar registrar vía RPC blindada SECURITY DEFINER
      const { data: rpcPaymentId, error: rpcError } = await supabase.rpc("record_store_payment", {
        p_store_id: storeId,
        p_amount: amountNum,
        p_category_id: null,
        p_collected_by_name: collectorName || user?.displayName || "Bodega",
        p_notes: `Recaudado de ${collectStore}. ${collectNotes}`
      });

      if (rpcError) {
        // 2. Fallback a insert directo si la función aún no compila
        const { error: insertError } = await supabase.from("payments").insert({
          amount: amountNum,
          store_id: storeId || "",
          category_id: (await supabase.from("product_categories").select("id").limit(1).single()).data?.id || "",
          collected_by: user?.id,
          received_at: new Date().toISOString(),
          notes: `Recaudado de ${collectStore} (${collectorName || "Bodega"}). ${collectNotes}`,
          status: "confirmed",
        });

        if (insertError) throw insertError;
      }

      toast.success(`Recaudo de ${formatCurrency(amountNum)} registrado exitosamente`);
      setIsCollectMoneyOpen(false);
      setCollectedAmount("");
      setCollectorName("");
      setCollectNotes("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al registrar recaudo");
    } finally {
      setIsCollecting(false);
    }
  };

  const filteredCatalog = CATALOG_PRODUCTS.filter(p => {
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (categoryFilter !== "Todos" && p.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#231934] text-white pb-24 selection:bg-[#246bfd]/30">
      <div className="mx-auto max-w-md px-5 pt-4 space-y-5">
        
        {/* HEADER BODEGA */}
        <header className="flex items-center justify-between pt-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#246bfd] bg-[#246bfd]/15 px-3 py-1 rounded-full border border-[#246bfd]/30">
              Bodega Operaciones
            </span>
            <h1 className="text-2xl font-black text-white mt-1">
              Despachar & Recibir
            </h1>
          </div>

          <div className="flex items-center gap-2 bg-[#2d2244] px-3.5 py-1.5 rounded-2xl border border-white/10 shadow-sm">
            <TrendingUp className="size-4 text-[#8ec97b]" />
            <span className="text-xs font-bold text-white">Activa</span>
          </div>
        </header>

        {/* PRIMARY ACTION BUTTONS (IOS DARK STYLE) */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setIsDispatchToStoreOpen(true)}
            className="flex flex-col items-start justify-between p-5 bg-gradient-to-br from-[#2d2244] to-[#231934] rounded-[28px] border border-[#246bfd]/40 shadow-lg shadow-[#246bfd]/10 active:scale-95 transition-all text-left"
          >
            <div className="flex size-11 items-center justify-center rounded-2xl bg-[#246bfd] text-white mb-3 shadow-md shadow-[#246bfd]/40">
              <Send className="size-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-[#a497be] uppercase">Salida</span>
              <span className="text-base font-black text-white block leading-tight">Despachar a Tienda</span>
            </div>
          </button>

          <button
            onClick={() => setIsCollectMoneyOpen(true)}
            className="flex flex-col items-start justify-between p-5 bg-gradient-to-br from-[#2d2244] to-[#231934] rounded-[28px] border border-[#f79193]/40 shadow-lg shadow-[#f79193]/10 active:scale-95 transition-all text-left"
          >
            <div className="flex size-11 items-center justify-center rounded-2xl bg-[#f79193] text-[#231934] mb-3 shadow-md shadow-[#f79193]/40 font-bold">
              <Wallet className="size-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-[#a497be] uppercase">Recaudo</span>
              <span className="text-base font-black text-white block leading-tight">Recoger Dinero</span>
            </div>
          </button>
        </div>

        {/* SECTION: RECEPCIONES ENTRANTES DE FABRICA */}
        <section className="bg-[#2d2244] rounded-[28px] p-5 border border-white/10 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-black text-white">Surtido de Fábrica</h2>
              <span className="text-xs text-[#a497be]">Despachos pendientes de recibir</span>
            </div>
            <span className="text-xs font-bold bg-[#8ec97b]/15 text-[#8ec97b] px-2.5 py-0.5 rounded-full border border-[#8ec97b]/30">
              {incomingFromFactory.length} pendientes
            </span>
          </div>

          {incomingFromFactory.length === 0 ? (
            <div className="py-6 text-center text-[#a497be]">
              <Package className="size-9 mx-auto mb-2 opacity-30 text-[#246bfd]" />
              <p className="text-xs font-medium">No hay despachos de fábrica pendientes por recibir.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {incomingFromFactory.map((disp) => (
                <div
                  key={disp.id}
                  className="bg-[#231934] p-4 rounded-2xl flex flex-col gap-3 border border-white/10"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#a497be]">#{disp.dispatchNumber}</span>
                    <span className="text-xs font-black text-[#8ec97b]">{formatCurrency(disp.totalValue)}</span>
                  </div>

                  <div className="text-xs text-white">
                    <span className="font-bold text-[#a497be]">{disp.items.length} productos: </span>
                    {disp.items.map(i => `${i.quantity} ${i.productName}`).join(", ")}
                  </div>

                  <Button
                    onClick={() => handleAcceptFactoryDispatch(disp)}
                    disabled={isReceivingDispatch}
                    className="w-full bg-[#8ec97b] hover:bg-[#7db66c] text-[#14280f] font-black h-10 rounded-xl text-xs"
                  >
                    <CheckCircle2 className="size-4 mr-1.5" />
                    Aceptar y Recibir en Bodega
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* DRAWER: DESPACHAR A TIENDA (PANTALLA VISUAL COMPLETA CON TARJETAS COMO EL INVENTARIO) */}
        <Drawer open={isDispatchToStoreOpen} onOpenChange={setIsDispatchToStoreOpen}>
          <DrawerContent className="bg-[#231934] border-t border-white/10 px-5 pb-8 text-white max-h-[92vh]">
            <div className="flex flex-col h-full overflow-hidden">
              
              {/* Drawer Header */}
              <div className="py-3 border-b border-white/10 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-xl font-black text-white">Despacho a Tienda</h2>
                  <span className="text-xs text-[#a497be]">
                    Tope máx: <strong className="text-white">{formatCurrency(maxCapLimit)}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#246bfd]/20 text-[#246bfd] border border-[#246bfd]/30">
                    {Object.keys(selectedProductsMap).length} seleccionados
                  </span>
                </div>
              </div>

              {/* Store & Category Filters */}
              <div className="py-3 space-y-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-[#a497be] uppercase block mb-1">Tienda Destino</label>
                    <select
                      value={selectedStore}
                      onChange={(e) => setSelectedStore(e.target.value)}
                      className="w-full p-2.5 bg-[#2d2244] border border-white/10 rounded-xl text-xs font-bold text-white outline-none focus:border-[#246bfd]"
                    >
                      <option value="Cambalache">Tienda Cambalache</option>
                      {locations.filter(l => l.type === "store" && l.name !== "Cambalache").map(l => (
                        <option key={l.id} value={l.name}>{l.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-[#a497be] uppercase block mb-1">Categoría</label>
                    <div className="flex gap-1">
                      {(["Todos", "Verde", "Blanco"] as const).map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCategoryFilter(cat)}
                          className={`flex-1 py-2 rounded-xl text-[11px] font-bold transition-all border ${
                            categoryFilter === cat
                              ? "bg-[#246bfd] text-white border-[#246bfd]"
                              : "bg-[#2d2244] text-[#a497be] border-white/10"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual 2-Column Product Grid */}
              <div className="flex-1 overflow-y-auto pr-1 pb-4 scrollbar-hide space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {filteredCatalog.map((product) => {
                    const selectedConfig = selectedProductsMap[product.id];
                    const isSelected = !!selectedConfig;
                    const activePres = selectedConfig?.presentation || product.presentations[0].name;

                    return (
                      <div key={product.id} className="flex flex-col gap-2">
                        <ProductCard
                          product={product}
                          isSelected={isSelected}
                          onToggleSelect={handleToggleProductInDispatch}
                          selectedPresentation={activePres}
                          onSelectPresentation={(pName) => handleUpdatePresentation(product.id, pName)}
                        />

                        {/* Quantity picker if selected */}
                        {isSelected && (
                          <div className="flex items-center justify-between bg-[#2d2244] p-2 rounded-xl border border-[#246bfd]/40">
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(product.id, -1)}
                              className="size-7 rounded-lg bg-white/10 flex items-center justify-center font-bold text-xs"
                            >
                              <Minus className="size-3.5" />
                            </button>
                            <span className="text-xs font-black tabular">{selectedConfig.qty} uds</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(product.id, 1)}
                              className="size-7 rounded-lg bg-[#246bfd] text-white flex items-center justify-center font-bold text-xs"
                            >
                              <Plus className="size-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Total & Confirm */}
              <div className="pt-3 border-t border-white/10 shrink-0 space-y-2">
                <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                  isOverCap 
                    ? "bg-[#f75555]/20 border-[#f75555]/40 text-white" 
                    : "bg-[#2d2244] border-white/10 text-white"
                }`}>
                  <div>
                    <span className="text-[11px] font-bold text-[#a497be] block">Total a despachar:</span>
                    <span className="text-lg font-black tabular">{formatCurrency(totalDispatchValue)}</span>
                  </div>
                  {isOverCap && (
                    <span className="text-[11px] font-bold text-[#f75555] flex items-center gap-1">
                      <AlertCircle className="size-3.5" /> ¡Supera tope de {formatCurrency(maxCapLimit)}!
                    </span>
                  )}
                </div>

                <Button
                  onClick={handleConfirmStoreDispatch}
                  disabled={isCreatingDispatch || isOverCap || Object.keys(selectedProductsMap).length === 0}
                  className="w-full h-12 rounded-2xl font-black text-sm bg-[#246bfd] hover:bg-[#1a4ec8] text-white shadow-lg shadow-[#246bfd]/30"
                >
                  {isCreatingDispatch ? "Enviando despacho..." : `Confirmar Despacho a ${selectedStore}`}
                </Button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>

        {/* DRAWER: RECOGER DINERO (REGISTRAR RECAUDO) */}
        <Drawer open={isCollectMoneyOpen} onOpenChange={setIsCollectMoneyOpen}>
          <DrawerContent className="bg-[#231934] border-t border-white/10 px-5 pb-8 text-white">
            <div className="flex flex-col max-h-[85vh]">
              <div className="py-4 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-white">Recoger Dinero</h2>
                  <span className="text-xs text-[#a497be]">Registrar recaudo de tienda en efectivo</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-4 scrollbar-hide">
                <div>
                  <label className="text-[11px] font-bold text-[#a497be] uppercase block mb-1">Tienda / Persona</label>
                  <input
                    type="text"
                    value={collectStore}
                    onChange={(e) => setCollectStore(e.target.value)}
                    placeholder="Ej. Tienda Cambalache"
                    className="w-full p-3.5 bg-[#2d2244] border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:border-[#246bfd]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#a497be] uppercase block mb-1">Monto Recibido ($ COP) *</label>
                  <input
                    type="number"
                    value={collectedAmount}
                    onChange={(e) => setCollectedAmount(e.target.value)}
                    placeholder="Ej. 100000"
                    className="w-full p-3.5 bg-[#2d2244] border border-white/10 rounded-2xl text-2xl font-black text-white outline-none focus:border-[#246bfd]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#a497be] uppercase block mb-1">Entregado por (Nombre de la persona)</label>
                  <input
                    type="text"
                    value={collectorName}
                    onChange={(e) => setCollectorName(e.target.value)}
                    placeholder="Nombre del encargado en tienda"
                    className="w-full p-3.5 bg-[#2d2244] border border-white/10 rounded-2xl text-sm text-white outline-none focus:border-[#246bfd]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#a497be] uppercase block mb-1">Notas adicionales (Opcional)</label>
                  <input
                    type="text"
                    value={collectNotes}
                    onChange={(e) => setCollectNotes(e.target.value)}
                    placeholder="Ej. Pago de ventas de la semana"
                    className="w-full p-3.5 bg-[#2d2244] border border-white/10 rounded-2xl text-sm text-white outline-none focus:border-[#246bfd]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleCollectMoneySubmit}
                  disabled={isCollecting || !collectedAmount}
                  className="w-full h-12 rounded-2xl font-black text-sm bg-[#f79193] hover:bg-[#e67e80] text-[#231934] shadow-lg shadow-[#f79193]/25"
                >
                  {isCollecting ? "Registrando recaudo..." : "Confirmar Recaudo de Dinero"}
                </Button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}
