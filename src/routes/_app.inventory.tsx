import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Search, Plus, Minus, X, CheckCircle2, AlertCircle, Package } from "lucide-react";

import { useInventoryData, type InventoryProduct } from "@/features/inventory/use-inventory-data";
import { useSession } from "@/features/auth/session";
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle, 
  DrawerDescription,
  DrawerFooter
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/inventory")({
  head: () => ({
    meta: [{ title: "Inventario" }],
  }),
  component: InventoryPage,
});

type FilterType = "todos" | "poco_stock" | "agotados";
type ActionType = "none" | "in" | "out";

function InventoryPage() {
  const { inventory, isLoading, getMovementsQuery, addMovement, isUpdating } = useInventoryData();
  const { role } = useSession();
  const canEdit = role === "boss" || role === "boss_admin" || role === "factory" || role === "warehouse" || role === "store"; // Asumiendo que pueden si tienen este rol, ajustar según necesidad real

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("todos");
  const [selectedProduct, setSelectedProduct] = useState<InventoryProduct | null>(null);
  
  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType>("none");
  const [actionQty, setActionQty] = useState(1);
  const [successMsg, setSuccessMsg] = useState("");

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      // Search
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
      // Filter
      if (filter === "poco_stock" && item.status !== "poco_stock") return false;
      if (filter === "agotados" && item.status !== "agotado") return false;
      return true;
    });
  }, [inventory, search, filter]);

  const lowStockCount = inventory.filter(i => i.status === "poco_stock").length;

  const handleProductClick = (product: InventoryProduct) => {
    setSelectedProduct(product);
    setActionType("none");
    setActionQty(1);
    setSuccessMsg("");
    setIsDrawerOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedProduct) return;
    try {
      await addMovement({
        productId: selectedProduct.productId,
        type: actionType as "in" | "out",
        quantity: actionQty,
        locationType: selectedProduct.locationType,
        locationId: selectedProduct.locationId,
        currentBalanceId: selectedProduct.id,
        currentQuantity: selectedProduct.quantity,
      });
      setSuccessMsg("✓ Inventario actualizado");
      setTimeout(() => {
        setIsDrawerOpen(false);
      }, 1500);
    } catch (error) {
      console.error(error);
      alert("Hubo un error al actualizar. Intenta de nuevo.");
    }
  };

  // Helper para estado visual
  const renderStatus = (status: string) => {
    if (status === "disponible") return <span className="text-emerald-600 flex items-center text-[13px] font-semibold"><span className="size-2 rounded-full bg-emerald-500 mr-2" />Disponible</span>;
    if (status === "poco_stock") return <span className="text-amber-600 flex items-center text-[13px] font-semibold"><span className="size-2 rounded-full bg-amber-500 mr-2" />Poco stock</span>;
    return <span className="text-rose-600 flex items-center text-[13px] font-semibold"><span className="size-2 rounded-full bg-rose-500 mr-2" />Agotado</span>;
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-20 sm:pb-8">
      {/* HEADER SIMPLE */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
        </div>
        
        {/* BUSCADOR */}
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="size-5 text-gray-400" />
          </div>
          <input 
            type="text" 
            className="block w-full pl-10 pr-3 py-3 border-none rounded-xl bg-gray-100 text-[15px] focus:ring-2 focus:ring-black outline-none transition-all placeholder:text-gray-500" 
            placeholder="Buscar producto..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <X className="size-5 text-gray-400" />
            </button>
          )}
        </div>

        {/* MÉTRICAS / FILTROS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button 
            onClick={() => setFilter("todos")}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-[13px] font-bold transition-colors ${filter === "todos" ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Todos ({inventory.length})
          </button>
          <button 
            onClick={() => setFilter("poco_stock")}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-[13px] font-bold transition-colors ${filter === "poco_stock" ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-gray-100 text-gray-600'}`}
          >
            Poco stock {lowStockCount > 0 && `(${lowStockCount})`}
          </button>
          <button 
            onClick={() => setFilter("agotados")}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-[13px] font-bold transition-colors ${filter === "agotados" ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-gray-100 text-gray-600'}`}
          >
            Agotados
          </button>
        </div>
      </header>

      {/* LISTA DE PRODUCTOS */}
      <main className="flex-1 px-4 pt-4">
        {isLoading ? (
          <div className="space-y-3">
             {[1,2,3,4,5].map(i => (
               <div key={i} className="h-20 bg-gray-200 rounded-2xl animate-pulse" />
             ))}
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Package className="size-12 mb-3 opacity-20" />
            <p className="text-[15px] font-medium">Sin productos encontrados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredInventory.map(item => (
              <button 
                key={item.id} 
                onClick={() => handleProductClick(item)}
                className="w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between active:scale-[0.98] transition-transform text-left"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-[16px] font-bold text-gray-900 leading-tight">{item.name}</span>
                  {renderStatus(item.status)}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-black text-gray-900">{item.quantity}</span>
                  <span className="text-gray-300">›</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* DRAWER DE DETALLE / ACCIÓN */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="bg-gray-50 border-t-0 px-4 pb-6">
          {selectedProduct && (
            <div className="flex flex-col h-full max-h-[85vh]">
              {/* Header Detalle */}
              <div className="flex flex-col items-center text-center py-6 border-b border-gray-200/60">
                <span className="text-[13px] font-bold uppercase tracking-wider text-gray-400 mb-1">{selectedProduct.category}</span>
                <h2 className="text-2xl font-black text-gray-900 mb-4">{selectedProduct.name}</h2>
                
                <div className="flex items-center justify-center gap-6">
                  <div className="flex flex-col items-center">
                    <span className="text-[12px] font-bold text-gray-400 uppercase">Actual</span>
                    <span className="text-4xl font-black">{selectedProduct.quantity}</span>
                  </div>
                </div>
                <div className="mt-4">
                  {renderStatus(selectedProduct.status)}
                </div>
              </div>

              {/* Contenido / Acciones */}
              <div className="flex-1 overflow-y-auto py-6">
                {successMsg ? (
                   <div className="flex flex-col items-center justify-center py-10 text-emerald-600 animate-in fade-in zoom-in duration-300">
                     <CheckCircle2 className="size-16 mb-4" />
                     <span className="text-xl font-bold">{successMsg}</span>
                   </div>
                ) : actionType === "none" ? (
                  <div className="flex flex-col gap-4">
                    {canEdit && (
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <button 
                          onClick={() => setActionType("in")}
                          className="flex flex-col items-center justify-center gap-2 bg-emerald-50 text-emerald-700 p-4 rounded-2xl active:bg-emerald-100 transition-colors border border-emerald-100"
                        >
                          <Plus className="size-6" />
                          <span className="font-bold">Entrada</span>
                        </button>
                        <button 
                          onClick={() => setActionType("out")}
                          className="flex flex-col items-center justify-center gap-2 bg-rose-50 text-rose-700 p-4 rounded-2xl active:bg-rose-100 transition-colors border border-rose-100"
                        >
                          <Minus className="size-6" />
                          <span className="font-bold">Salida</span>
                        </button>
                      </div>
                    )}
                    
                    {/* Historial rápido simulado (se podría usar getMovementsQuery aquí si se quiere expandir) */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-100">
                       <h3 className="text-[14px] font-bold text-gray-900 mb-4">Actividad reciente</h3>
                       <p className="text-[13px] text-gray-500 text-center py-4">Toca una acción arriba para registrar un movimiento.</p>
                       {/* Aquí podríamos montar el render de getMovementsQuery(selectedProduct.productId, ...) si el usuario lo requiere después */}
                    </div>
                  </div>
                ) : (
                  /* Vista de Formulario de Acción */
                  <div className="flex flex-col items-center animate-in slide-in-from-right-4 duration-200">
                     <h3 className={`text-xl font-black mb-8 ${actionType === "in" ? "text-emerald-600" : "text-rose-600"}`}>
                       ¿Cuántas unidades {actionType === "in" ? "entraron" : "salieron"}?
                     </h3>
                     
                     <div className="flex items-center gap-6 mb-10">
                        <button 
                          onClick={() => setActionQty(Math.max(1, actionQty - 1))}
                          className="flex size-14 items-center justify-center rounded-full bg-gray-200 active:bg-gray-300 transition-colors"
                        >
                          <Minus className="size-6 text-gray-700" />
                        </button>
                        <span className="text-5xl font-black w-24 text-center">{actionQty}</span>
                        <button 
                          onClick={() => setActionQty(actionQty + 1)}
                          className="flex size-14 items-center justify-center rounded-full bg-gray-200 active:bg-gray-300 transition-colors"
                        >
                          <Plus className="size-6 text-gray-700" />
                        </button>
                     </div>

                     <div className="flex flex-col w-full gap-3">
                       <Button 
                         size="lg" 
                         className={`w-full h-14 text-[16px] font-bold rounded-xl ${actionType === "in" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`}
                         onClick={handleConfirmAction}
                         disabled={isUpdating}
                       >
                         {isUpdating ? "Confirmando..." : `Confirmar ${actionType === "in" ? "entrada" : "salida"}`}
                       </Button>
                       <Button 
                         variant="ghost" 
                         size="lg"
                         className="w-full h-14 text-[15px] font-bold text-gray-500 rounded-xl"
                         onClick={() => { setActionType("none"); setActionQty(1); }}
                         disabled={isUpdating}
                       >
                         Cancelar
                       </Button>
                     </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
