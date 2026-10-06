import { useState } from "react";
import { 
  Factory, 
  Send, 
  Plus, 
  Minus, 
  CheckCircle2, 
  Package, 
  Clock,
  Sparkles,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDispatches } from "@/features/dispatches/use-dispatches";
import { CATALOG_PRODUCTS, type CatalogProduct } from "@/features/inventory/product-catalog";
import { ProductVisualIcon } from "@/features/inventory/components/ProductVisualIcon";
import { useSession } from "@/features/auth/session";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";

interface SurtidoItem {
  product: CatalogProduct;
  presentationName: string;
  presentationLabel: string;
  unitPrice: number;
  quantity: number;
}

export function FactoryDispatchView() {
  const { user } = useSession();
  const { dispatches, locations, createDispatch, isCreatingDispatch } = useDispatches();

  // Selected item to configure
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct>(CATALOG_PRODUCTS[0]);
  const [selectedPresentation, setSelectedPresentation] = useState<string>(CATALOG_PRODUCTS[0].presentations[0].name);
  const [currentQty, setCurrentQty] = useState<number>(10);

  // Cart of surtido items to dispatch
  const [surtidoList, setSurtidoList] = useState<SurtidoItem[]>([]);
  const [notes, setNotes] = useState<string>("");

  // Recent factory dispatches (sent from factory)
  const factoryDispatches = dispatches.filter(d => 
    d.fromLocationName.toLowerCase().includes("fábrica") || 
    d.fromLocationName.toLowerCase().includes("fabrica") ||
    d.notes?.toLowerCase().includes("surtido")
  );

  const activePres = selectedProduct.presentations.find(p => p.name === selectedPresentation) || selectedProduct.presentations[0];
  const itemUnitPrice = activePres ? activePres.price : selectedProduct.defaultPrice;

  // Add configured product to Surtido batch
  const handleAddSurtidoItem = () => {
    const existingIndex = surtidoList.findIndex(
      item => item.product.id === selectedProduct.id && item.presentationName === selectedPresentation
    );

    if (existingIndex >= 0) {
      const updated = [...surtidoList];
      updated[existingIndex].quantity += currentQty;
      setSurtidoList(updated);
    } else {
      setSurtidoList([
        ...surtidoList,
        {
          product: selectedProduct,
          presentationName: selectedPresentation,
          presentationLabel: activePres.label,
          unitPrice: itemUnitPrice,
          quantity: currentQty,
        }
      ]);
    }

    toast.success(`Agregado: ${currentQty} ${selectedProduct.name} (${activePres.label})`);
  };

  const handleRemoveSurtidoItem = (index: number) => {
    setSurtidoList(surtidoList.filter((_, i) => i !== index));
  };

  const totalSurtidoValue = surtidoList.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
  const totalSurtidoUnits = surtidoList.reduce((acc, item) => acc + item.quantity, 0);

  // Send entire Surtido to Bodega
  const handleDispatchSurtido = async () => {
    if (surtidoList.length === 0) {
      toast.error("Agrega al menos un producto al surtido");
      return;
    }

    try {
      const warehouseLoc = locations.find(l => l.type === "warehouse") || locations[0];
      const factoryLoc = locations.find(l => l.type === "factory") || locations.find(l => l.name.toLowerCase().includes("fábrica"));

      await createDispatch({
        fromLocationType: "factory",
        fromId: factoryLoc?.id || user?.warehouseId || "",
        toLocationType: "warehouse",
        toId: warehouseLoc?.id || "",
        items: surtidoList.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_value: item.unitPrice,
        })),
        notes: notes ? `Surtido Fábrica: ${notes}` : "Surtido despachado desde Fábrica a Bodega",
      });

      // Notify Boss directly
      const { data: bossUsers } = await supabase.from("profiles").select("id").in("role", ["boss", "boss_admin"]);
      if (bossUsers) {
        for (const b of bossUsers) {
          await supabase.from("notifications").insert({
            user_id: b.id,
            title: `Nuevo Surtido de Fábrica`,
            body: `Fábrica despachó ${totalSurtidoUnits} unidades de surtido hacia Bodega (${formatCurrency(totalSurtidoValue)}).`,
            type: "dispatch",
          });
        }
      }

      toast.success(`Surtido despachado a Bodega exitosamente`);
      setSurtidoList([]);
      setNotes("");
    } catch (err: any) {
      toast.error(err.message || "Error al despachar surtido");
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-gray-900 pb-28">
      <div className="mx-auto max-w-md px-5 pt-4 space-y-5">
        
        {/* HEADER FABRICA */}
        <header className="flex items-center justify-between pt-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full">
              Fábrica Operaciones
            </span>
            <h1 className="text-2xl font-black text-gray-900 mt-1">
              Despachar Surtido
            </h1>
          </div>

          <div className="flex size-10 items-center justify-center rounded-2xl bg-black text-white shadow-xs">
            <Factory className="size-5" />
          </div>
        </header>

        {/* PRODUCT SELECTION CARD */}
        <section className="bg-white rounded-[28px] p-5 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-gray-400">1. Seleccionar Producto</span>
            <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
              {selectedProduct.category}
            </span>
          </div>

          {/* Product Carousel / Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CATALOG_PRODUCTS.map(prod => (
              <button
                key={prod.id}
                type="button"
                onClick={() => {
                  setSelectedProduct(prod);
                  setSelectedPresentation(prod.presentations[0].name);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl shrink-0 text-xs font-bold transition-all border ${
                  selectedProduct.id === prod.id
                    ? "bg-black text-white border-black shadow-xs"
                    : "bg-[#F5F4F0] text-gray-700 border-gray-200/80 hover:bg-gray-200"
                }`}
              >
                <div className="size-5 shrink-0">
                  <ProductVisualIcon imageType={prod.imageType} className="size-5" />
                </div>
                <span>{prod.name}</span>
              </button>
            ))}
          </div>

          {/* Active Product Card Preview */}
          <div className="flex items-center gap-4 bg-[#F5F4F0] p-4 rounded-2xl border border-gray-200/60">
            <div className="size-16 shrink-0 bg-white rounded-2xl p-2 flex items-center justify-center shadow-2xs">
              <ProductVisualIcon imageType={selectedProduct.imageType} className="size-12" />
            </div>
            <div className="flex-1">
              <span className="text-base font-black text-gray-900 block">{selectedProduct.name}</span>
              <span className="text-xs text-gray-500 block">{selectedProduct.description}</span>
              <span className="text-xs font-bold text-gray-700 mt-1 block">
                Precio derivado: <strong className="text-gray-900">{formatCurrency(itemUnitPrice)}</strong>
              </span>
            </div>
          </div>

          {/* Presentation Picker */}
          <div>
            <label className="text-[11px] font-bold text-gray-400 uppercase block mb-1.5">
              Presentación / Derivado
            </label>
            <div className="grid grid-cols-3 gap-2">
              {selectedProduct.presentations.map(pres => (
                <button
                  key={pres.name}
                  type="button"
                  onClick={() => setSelectedPresentation(pres.name)}
                  className={`p-2 rounded-xl text-center border font-bold text-xs transition-all ${
                    selectedPresentation === pres.name
                      ? "bg-black text-white border-black"
                      : "bg-[#F5F4F0] text-gray-700 border-gray-200 hover:bg-gray-200"
                  }`}
                >
                  <span className="block text-[11px]">{pres.label}</span>
                  <span className="text-[10px] opacity-75">${pres.price.toLocaleString()}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity Selector */}
          <div>
            <label className="text-[11px] font-bold text-gray-400 uppercase block mb-1.5">
              Cantidad a surtir
            </label>
            <div className="flex items-center justify-between bg-[#F5F4F0] p-3 rounded-2xl border border-gray-200/80">
              <div className="flex items-center gap-2">
                {[10, 25, 50, 100].map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setCurrentQty(q)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ${currentQty === q ? 'bg-black text-white' : 'bg-white text-gray-700 border border-gray-200'}`}
                  >
                    +{q}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentQty(Math.max(1, currentQty - 1))}
                  className="size-8 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold"
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="text-lg font-black tabular w-8 text-center">{currentQty}</span>
                <button
                  type="button"
                  onClick={() => setCurrentQty(currentQty + 1)}
                  className="size-8 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleAddSurtidoItem}
            className="w-full bg-[#FEF08A] hover:bg-amber-300 text-gray-900 font-black h-11 rounded-xl text-xs border border-amber-300"
          >
            <Plus className="size-4 mr-1" />
            Añadir {selectedProduct.name} ({activePres.label}) al Surtido
          </Button>
        </section>

        {/* SURTIDO BATCH LIST */}
        <section className="bg-white rounded-[28px] p-5 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-gray-900">2. Lote de Surtido a Despachar</h2>
              <span className="text-xs text-gray-500">Destino: Bodega Principal</span>
            </div>
            <span className="text-xs font-bold bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full">
              {surtidoList.length} items
            </span>
          </div>

          {surtidoList.length === 0 ? (
            <div className="py-6 text-center text-gray-400">
              <Layers className="size-10 mx-auto mb-2 opacity-30" />
              <p className="text-xs font-medium">El lote de surtido está vacío. Selecciona productos arriba.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {surtidoList.map((item, idx) => (
                <div 
                  key={`${item.product.id}-${item.presentationName}-${idx}`}
                  className="flex items-center justify-between p-3.5 bg-[#FAF8F5] rounded-2xl border border-gray-200/60"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-white p-1 border border-gray-100 flex items-center justify-center shrink-0">
                      <ProductVisualIcon imageType={item.product.imageType} className="size-7" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-gray-900 block leading-tight">
                        {item.product.name} ({item.presentationLabel})
                      </span>
                      <span className="text-[11px] text-gray-500">
                        {item.quantity} uds × {formatCurrency(item.unitPrice)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-gray-900 tabular">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </span>
                    <button
                      onClick={() => handleRemoveSurtidoItem(idx)}
                      className="size-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-xs hover:bg-rose-100 hover:text-rose-600"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}

              <div className="pt-2 border-t border-gray-100">
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas para Bodega (Opcional)"
                  className="w-full p-2.5 bg-[#F5F4F0] border border-gray-200 rounded-xl text-xs outline-none mb-3"
                />

                <div className="flex justify-between items-center bg-[#FAF8F5] p-3 rounded-xl mb-3">
                  <span className="text-xs font-bold text-gray-600">Total Surtido ({totalSurtidoUnits} uds):</span>
                  <span className="text-sm font-black text-gray-900">{formatCurrency(totalSurtidoValue)}</span>
                </div>

                <Button
                  onClick={handleDispatchSurtido}
                  disabled={isCreatingDispatch}
                  className="w-full bg-black hover:bg-gray-800 text-white font-black h-12 rounded-xl text-sm shadow-md"
                >
                  <Send className="size-4 mr-2" />
                  {isCreatingDispatch ? "Despachando a Bodega..." : "Despachar Surtido a Bodega →"}
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* RECENT DISPATCHES */}
        <section className="bg-white rounded-[28px] p-5 border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-gray-900">Historial Reciente de Fábrica</h2>
            <Clock className="size-4 text-gray-400" />
          </div>

          {factoryDispatches.length === 0 ? (
            <p className="text-xs text-gray-400 py-3 text-center">No hay registros recientes.</p>
          ) : (
            <div className="space-y-2">
              {factoryDispatches.slice(0, 5).map(disp => (
                <div key={disp.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 text-xs">
                  <div>
                    <span className="font-bold text-gray-900 block">#{disp.dispatchNumber} - {disp.toLocationName}</span>
                    <span className="text-[11px] text-gray-500">{new Date(disp.dispatchedAt).toLocaleDateString()}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    disp.status === "received" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {disp.status === "received" ? "Recibido en Bodega" : "En camino"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
