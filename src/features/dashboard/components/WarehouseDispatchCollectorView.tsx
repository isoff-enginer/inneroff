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
  ArrowRight,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useDispatches, type LiveDispatch } from "@/features/dispatches/use-dispatches";
import { useInventoryData } from "@/features/inventory/use-inventory-data";
import { CATALOG_PRODUCTS, type CatalogProduct } from "@/features/inventory/product-catalog";
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
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct>(CATALOG_PRODUCTS[0]);
  const [selectedPresentation, setSelectedPresentation] = useState<string>("unidad");
  const [dispatchQty, setDispatchQty] = useState(1);
  const [maxCapLimit, setMaxCapLimit] = useState(250000); // $250,000 default cap

  // Collect money state
  const [collectStore, setCollectStore] = useState("Cambalache");
  const [collectedAmount, setCollectedAmount] = useState("");
  const [collectorName, setCollectorName] = useState("");
  const [collectNotes, setCollectNotes] = useState("");
  const [isCollecting, setIsCollecting] = useState(false);

  // Incoming dispatches from factory
  const incomingFromFactory = dispatches.filter(d => d.status === "dispatched");

  // Calculate current item price based on presentation
  const activePres = selectedProduct.presentations.find(p => p.name === selectedPresentation) || selectedProduct.presentations[0];
  const itemUnitPrice = activePres ? activePres.price : selectedProduct.defaultPrice;
  const totalDispatchValue = itemUnitPrice * dispatchQty;
  const isOverCap = totalDispatchValue > maxCapLimit;

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
    if (isOverCap) {
      toast.error(`El despacho supera el límite máximo permitido de ${formatCurrency(maxCapLimit)}`);
      return;
    }

    try {
      const targetStore = locations.find(l => l.name.toLowerCase().includes(selectedStore.toLowerCase()) && l.type === "store") || locations.find(l => l.type === "store");
      
      await createDispatch({
        fromLocationType: "warehouse",
        fromId: user?.warehouseId || locations.find(l => l.type === "warehouse")?.id || "",
        toLocationType: "store",
        toId: targetStore?.id || "",
        items: [
          {
            product_id: selectedProduct.id,
            quantity: dispatchQty,
            unit_value: itemUnitPrice,
          }
        ],
        notes: `Despacho a ${selectedStore} (${activePres.label})`,
      });

      toast.success(`Despacho de ${selectedProduct.name} (${activePres.label}) enviado a ${selectedStore}`);
      setIsDispatchToStoreOpen(false);
      setDispatchQty(1);
    } catch (err: any) {
      toast.error(err.message || "Error al despachar a tienda");
    }
  };

  // Handle Collect Money (Recoger Dinero)
  const handleCollectMoneySubmit = async () => {
    const amountNum = Number(collectedAmount);
    if (!amountNum || amountNum <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }

    setIsCollecting(true);
    try {
      const targetStore = locations.find(l => l.name.toLowerCase().includes(collectStore.toLowerCase()) && l.type === "store");
      const storeId = targetStore?.id || locations.find(l => l.type === "store")?.id;

      // Insert payment / collection in Supabase
      const { error } = await supabase.from("payments").insert({
        amount: amountNum,
        category_id: (await supabase.from("product_categories").select("id").limit(1).single()).data?.id || "",
        store_id: storeId || "",
        collected_by: user?.id,
        received_at: new Date().toISOString(),
        notes: `Recaudado por Bodega de ${collectStore} (${collectorName || "Responsable"}). ${collectNotes}`,
        status: "confirmed",
      });

      if (error) throw error;

      // Create notification for Boss
      const { data: bossUsers } = await supabase.from("profiles").select("id").in("role", ["boss", "boss_admin"]);
      if (bossUsers) {
        for (const b of bossUsers) {
          await supabase.from("notifications").insert({
            user_id: b.id,
            title: `Recaudo recibido: ${formatCurrency(amountNum)}`,
            body: `Bodega recogió dinero de ${collectStore}.`,
            type: "payment",
          });
        }
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

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-gray-900 pb-24">
      <div className="mx-auto max-w-md px-5 pt-4 space-y-5">
        
        {/* HEADER BODEGA */}
        <header className="flex items-center justify-between pt-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-100 px-2.5 py-0.5 rounded-full">
              Bodega Operaciones
            </span>
            <h1 className="text-2xl font-black text-gray-900 mt-1">
              Despachar & Recibir
            </h1>
          </div>

          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-gray-100 shadow-2xs">
            <TrendingUp className="size-4 text-emerald-600" />
            <span className="text-xs font-bold text-gray-800">Operación Activa</span>
          </div>
        </header>

        {/* TOP METRIC CARD: DESPACHAR A TIENDA & RECOGER DINERO */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setIsDispatchToStoreOpen(true)}
            className="flex flex-col items-start justify-between p-4 bg-[#FEF08A] rounded-[24px] border border-amber-300/80 shadow-xs active:scale-95 transition-transform text-left"
          >
            <div className="flex size-10 items-center justify-center rounded-full bg-black text-white mb-3">
              <Send className="size-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-gray-700 uppercase">Salida</span>
              <span className="text-base font-black text-gray-900 block leading-tight">Despachar a Tienda</span>
            </div>
          </button>

          <button
            onClick={() => setIsCollectMoneyOpen(true)}
            className="flex flex-col items-start justify-between p-4 bg-[#FB923C] rounded-[24px] border border-orange-400/80 shadow-xs text-white active:scale-95 transition-transform text-left"
          >
            <div className="flex size-10 items-center justify-center rounded-full bg-white text-orange-600 mb-3">
              <Wallet className="size-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-white/80 uppercase">Recaudo</span>
              <span className="text-base font-black text-white block leading-tight">Recoger Dinero</span>
            </div>
          </button>
        </div>

        {/* SECTION: RECEPCIONES ENTRANTES DE FABRICA */}
        <section className="bg-white rounded-[26px] p-5 border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-black text-gray-900">Surtido de Fábrica</h2>
              <span className="text-xs text-gray-500">Despachos pendientes de recibir</span>
            </div>
            <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
              {incomingFromFactory.length} pendientes
            </span>
          </div>

          {incomingFromFactory.length === 0 ? (
            <div className="py-6 text-center text-gray-400">
              <Package className="size-10 mx-auto mb-2 opacity-30" />
              <p className="text-xs font-medium">No hay despachos entrantes de fábrica por recibir.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {incomingFromFactory.map((disp) => (
                <div
                  key={disp.id}
                  className="bg-[#F5F4F0] p-4 rounded-2xl flex flex-col gap-3 border border-gray-200/60"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-400">#{disp.dispatchNumber}</span>
                    <span className="text-xs font-black text-gray-900">{formatCurrency(disp.totalValue)}</span>
                  </div>

                  <div className="text-xs text-gray-700">
                    <span className="font-bold">{disp.items.length} productos: </span>
                    {disp.items.map(i => `${i.quantity} ${i.productName}`).join(", ")}
                  </div>

                  <Button
                    onClick={() => handleAcceptFactoryDispatch(disp)}
                    disabled={isReceivingDispatch}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 rounded-xl text-xs"
                  >
                    <CheckCircle2 className="size-4 mr-1.5" />
                    Aceptar y Recibir en Bodega
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* DRAWER: DESPACHAR A TIENDA (CON DERIVADOS Y TOPE $250,000) */}
        <Drawer open={isDispatchToStoreOpen} onOpenChange={setIsDispatchToStoreOpen}>
          <DrawerContent className="bg-white border-t-0 px-5 pb-8">
            <div className="flex flex-col max-h-[85vh]">
              <div className="py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-gray-900">Despacho a Tienda</h2>
                  <span className="text-xs text-gray-500">Tope máximo por despacho: {formatCurrency(maxCapLimit)}</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-4 scrollbar-hide">
                {/* TIENDA SELECCIONADA */}
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Tienda Destino</label>
                  <select
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none"
                  >
                    <option value="Cambalache">Tienda Cambalache</option>
                    {locations.filter(l => l.type === "store" && l.name !== "Cambalache").map(l => (
                      <option key={l.id} value={l.name}>{l.name}</option>
                    ))}
                  </select>
                </div>

                {/* PRODUCTO SELECCIONADO */}
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Producto</label>
                  <select
                    value={selectedProduct.id}
                    onChange={(e) => {
                      const found = CATALOG_PRODUCTS.find(p => p.id === e.target.value) || CATALOG_PRODUCTS[0];
                      setSelectedProduct(found);
                      setSelectedPresentation(found.presentations[0].name);
                    }}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none"
                  >
                    {CATALOG_PRODUCTS.map(prod => (
                      <option key={prod.id} value={prod.id}>
                        [{prod.category}] {prod.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* DERIVADO / PRESENTACIÓN */}
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">
                    Presentación / Derivado
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedProduct.presentations.map(pres => (
                      <button
                        key={pres.name}
                        type="button"
                        onClick={() => setSelectedPresentation(pres.name)}
                        className={`p-2.5 rounded-xl text-center border font-bold text-xs transition-all ${
                          selectedPresentation === pres.name
                            ? "bg-black text-white border-black"
                            : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        <span className="block">{pres.label}</span>
                        <span className="text-[10px] opacity-80">${pres.price.toLocaleString()}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* CANTIDAD */}
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Cantidad</label>
                  <div className="flex items-center justify-center gap-6 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                    <button
                      onClick={() => setDispatchQty(Math.max(1, dispatchQty - 1))}
                      className="size-10 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-lg"
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="text-3xl font-black tabular w-16 text-center">{dispatchQty}</span>
                    <button
                      onClick={() => setDispatchQty(dispatchQty + 1)}
                      className="size-10 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-lg"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>

                {/* RESUMEN Y ALERTA TOPE */}
                <div className={`p-4 rounded-2xl border ${isOverCap ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                  <div className="flex justify-between items-center text-sm font-black mb-1">
                    <span>Total Despacho:</span>
                    <span className="text-lg tabular">{formatCurrency(totalDispatchValue)}</span>
                  </div>
                  {isOverCap && (
                    <div className="flex items-center gap-1.5 text-xs text-rose-600 font-bold mt-1">
                      <AlertCircle className="size-4 shrink-0" />
                      <span>¡Supera el tope de {formatCurrency(maxCapLimit)} por despacho!</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleConfirmStoreDispatch}
                  disabled={isCreatingDispatch || isOverCap}
                  className="w-full h-12 rounded-xl font-bold text-sm bg-black text-white"
                >
                  {isCreatingDispatch ? "Enviando despacho..." : `Despachar a ${selectedStore}`}
                </Button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>

        {/* DRAWER: RECOGER DINERO (REGISTRAR RECAUDO) */}
        <Drawer open={isCollectMoneyOpen} onOpenChange={setIsCollectMoneyOpen}>
          <DrawerContent className="bg-white border-t-0 px-5 pb-8">
            <div className="flex flex-col max-h-[85vh]">
              <div className="py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-gray-900">Recoger Dinero</h2>
                  <span className="text-xs text-gray-500">Registrar recaudo de tienda en efectivo</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-4 scrollbar-hide">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Tienda / Persona</label>
                  <input
                    type="text"
                    value={collectStore}
                    onChange={(e) => setCollectStore(e.target.value)}
                    placeholder="Ej. Tienda Cambalache"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Monto Recibido ($ COP) *</label>
                  <input
                    type="number"
                    value={collectedAmount}
                    onChange={(e) => setCollectedAmount(e.target.value)}
                    placeholder="Ej. 150000"
                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xl font-black outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Entregado por (Nombre de la persona)</label>
                  <input
                    type="text"
                    value={collectorName}
                    onChange={(e) => setCollectorName(e.target.value)}
                    placeholder="Nombre del encargado en tienda"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Notas adicionales (Opcional)</label>
                  <input
                    type="text"
                    value={collectNotes}
                    onChange={(e) => setCollectNotes(e.target.value)}
                    placeholder="Ej. Pago parcial de ventas de la semana"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleCollectMoneySubmit}
                  disabled={isCollecting || !collectedAmount}
                  className="w-full h-12 rounded-xl font-bold text-sm bg-orange-600 hover:bg-orange-700 text-white"
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
