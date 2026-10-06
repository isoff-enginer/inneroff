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
            body: `Fábrica despachó ${totalSurtidoUnits} unidades hacia Bodega (${formatCurrency(totalSurtidoValue)}).`,
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
    <div className="min-h-screen bg-[#231934] text-white pb-28 selection:bg-[#246bfd]/30">
      <div className="mx-auto max-w-md px-5 pt-4 space-y-5">
        
        {/* HEADER FABRICA */}
        <header className="flex items-center justify-between pt-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#246bfd] bg-[#246bfd]/15 px-3 py-1 rounded-full border border-[#246bfd]/30">
              Fábrica Operaciones
            </span>
            <h1 className="text-2xl font-black text-white mt-1">
              Despachar Surtido
            </h1>
          </div>

          <div className="flex size-10 items-center justify-center rounded-2xl bg-[#2d2244] border border-white/10 text-white shadow-sm">
            <Factory className="size-5 text-[#246bfd]" />
          </div>
        </header>

        {/* PRODUCT SELECTION CARD */}
        <section className="bg-[#2d2244] rounded-[28px] p-5 border border-white/10 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-[#a497be]">1. Seleccionar Producto</span>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
              selectedProduct.category === "Verde"
                ? "bg-[#8ec97b]/20 text-[#8ec97b] border-[#8ec97b]/30"
                : "bg-[#f79193]/20 text-[#f79193] border-[#f79193]/30"
            }`}>
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
                    ? "bg-[#246bfd] text-white border-[#246bfd] shadow-md shadow-[#246bfd]/30"
                    : "bg-[#231934] text-[#a497be] border-white/10 hover:border-white/20"
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
          <div className="flex items-center gap-4 bg-[#231934] p-4 rounded-2xl border border-white/10">
            <div className="size-16 shrink-0 bg-[#2d2244] rounded-2xl p-2 flex items-center justify-center border border-white/10">
              <ProductVisualIcon imageType={selectedProduct.imageType} className="size-12" />
            </div>
            <div className="flex-1">
              <span className="text-base font-black text-white block">{selectedProduct.name}</span>
              <span className="text-xs text-[#a497be] block">{selectedProduct.description}</span>
              <span className="text-xs font-bold text-white mt-1 block">
                Precio derivado: <strong className="text-[#8ec97b]">{formatCurrency(itemUnitPrice)}</strong>
              </span>
            </div>
          </div>

          {/* Presentation Picker */}
          <div>
            <label className="text-[11px] font-bold text-[#a497be] uppercase block mb-1.5">
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
                      ? "bg-[#246bfd] text-white border-[#246bfd] shadow-md shadow-[#246bfd]/25"
                      : "bg-[#231934] text-[#a497be] border-white/10 hover:border-white/20"
                  }`}
                >
                  <span className="block text-[11px]">{pres.label}</span>
                  <span className="text-[10px] opacity-80">${pres.price.toLocaleString()}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity Selector */}
          <div>
            <label className="text-[11px] font-bold text-[#a497be] uppercase block mb-1.5">
              Cantidad a surtir
            </label>
            <div className="flex items-center justify-between bg-[#231934] p-3 rounded-2xl border border-white/10">
              <div className="flex items-center gap-1.5">
                {[10, 25, 50, 100].map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setCurrentQty(q)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
                      currentQty === q 
                        ? "bg-[#246bfd] text-white border-[#246bfd]" 
                        : "bg-[#2d2244] text-[#a497be] border-white/10"
                    }`}
                  >
                    +{q}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentQty(Math.max(1, currentQty - 1))}
                  className="size-8 rounded-xl bg-[#2d2244] border border-white/10 flex items-center justify-center font-bold text-white"
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="text-base font-black tabular w-8 text-center text-white">{currentQty}</span>
                <button
                  type="button"
                  onClick={() => setCurrentQty(currentQty + 1)}
                  className="size-8 rounded-xl bg-[#246bfd] text-white flex items-center justify-center font-bold"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleAddSurtidoItem}
            className="w-full bg-[#246bfd] hover:bg-[#1a4ec8] text-white font-black h-12 rounded-2xl text-xs shadow-lg shadow-[#246bfd]/30"
          >
            <Plus className="size-4 mr-1" />
            Añadir {selectedProduct.name} ({activePres.label}) al Surtido
          </Button>
        </section>

        {/* SURTIDO BATCH LIST */}
        <section className="bg-[#2d2244] rounded-[28px] p-5 border border-white/10 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-white">2. Lote de Surtido a Despachar</h2>
              <span className="text-xs text-[#a497be]">Destino: Bodega Principal</span>
            </div>
            <span className="text-xs font-bold bg-[#8ec97b]/15 text-[#8ec97b] px-2.5 py-0.5 rounded-full border border-[#8ec97b]/30">
              {surtidoList.length} items
            </span>
          </div>

          {surtidoList.length === 0 ? (
            <div className="py-6 text-center text-[#a497be]">
              <Layers className="size-9 mx-auto mb-2 opacity-30 text-[#246bfd]" />
              <p className="text-xs font-medium">El lote de surtido está vacío. Selecciona productos arriba.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {surtidoList.map((item, idx) => (
                <div 
                  key={`${item.product.id}-${item.presentationName}-${idx}`}
                  className="flex items-center justify-between p-3.5 bg-[#231934] rounded-2xl border border-white/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-[#2d2244] p-1 border border-white/10 flex items-center justify-center shrink-0">
                      <ProductVisualIcon imageType={item.product.imageType} className="size-7" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-white block leading-tight">
                        {item.product.name} ({item.presentationLabel})
                      </span>
                      <span className="text-[11px] text-[#a497be]">
                        {item.quantity} uds × {formatCurrency(item.unitPrice)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-[#8ec97b] tabular">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </span>
                    <button
                      onClick={() => handleRemoveSurtidoItem(idx)}
                      className="size-6 rounded-full bg-white/10 text-white flex items-center justify-center font-bold text-xs hover:bg-[#f75555]/30 hover:text-[#f75555]"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}

              <div className="pt-2 border-t border-white/10">
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas para Bodega (Opcional)"
                  className="w-full p-3 bg-[#231934] border border-white/10 rounded-xl text-xs text-white outline-none focus:border-[#246bfd] mb-3"
                />

                <div className="flex justify-between items-center bg-[#231934] p-3 rounded-2xl mb-3 border border-white/10">
                  <span className="text-xs font-bold text-[#a497be]">Total ({totalSurtidoUnits} uds):</span>
                  <span className="text-sm font-black text-white">{formatCurrency(totalSurtidoValue)}</span>
                </div>

                <Button
                  onClick={handleDispatchSurtido}
                  disabled={isCreatingDispatch}
                  className="w-full bg-[#246bfd] hover:bg-[#1a4ec8] text-white font-black h-12 rounded-2xl text-sm shadow-lg shadow-[#246bfd]/30"
                >
                  <Send className="size-4 mr-2" />
                  {isCreatingDispatch ? "Despachando..." : "Despachar Surtido a Bodega →"}
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* RECENT DISPATCHES */}
        <section className="bg-[#2d2244] rounded-[28px] p-5 border border-white/10 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-white">Historial de Fábrica</h2>
            <Clock className="size-4 text-[#a497be]" />
          </div>

          {factoryDispatches.length === 0 ? (
            <p className="text-xs text-[#a497be] py-3 text-center">No hay registros recientes.</p>
          ) : (
            <div className="space-y-2">
              {factoryDispatches.slice(0, 5).map(disp => (
                <div key={disp.id} className="flex items-center justify-between p-3 rounded-2xl bg-[#231934] text-xs border border-white/10">
                  <div>
                    <span className="font-bold text-white block">#{disp.dispatchNumber} - {disp.toLocationName}</span>
                    <span className="text-[11px] text-[#a497be]">{new Date(disp.dispatchedAt).toLocaleDateString()}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    disp.status === "received" ? "bg-[#8ec97b]/20 text-[#8ec97b]" : "bg-[#f79193]/20 text-[#f79193]"
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
