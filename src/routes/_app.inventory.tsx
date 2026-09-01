import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Search, Plus, Minus, X, CheckCircle2, Package, Folder, Tag, Layers } from "lucide-react";

import { useInventoryData, type InventoryProduct, type ProductCategory } from "@/features/inventory/use-inventory-data";
import { useSession } from "@/features/auth/session";
import { 
  Drawer, 
  DrawerContent, 
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
type ViewType = "products" | "categories";

function InventoryPage() {
  const { 
    inventory, 
    categories, 
    isLoading, 
    addMovement, 
    isUpdating,
    createCategory,
    createProduct,
    isCreatingCategory,
    isCreatingProduct
  } = useInventoryData();
  
  const { role } = useSession();
  const canEdit = role === "boss" || role === "boss_admin" || role === "factory" || role === "warehouse" || role === "store";
  const isBoss = role === "boss" || role === "boss_admin";

  const [view, setView] = useState<ViewType>("products");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("todos");
  
  // Product Detail Drawer
  const [selectedProduct, setSelectedProduct] = useState<InventoryProduct | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType>("none");
  const [actionQty, setActionQty] = useState(1);
  const [successMsg, setSuccessMsg] = useState("");

  // Create Category Drawer
  const [isCreateCatOpen, setIsCreateCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");

  // Create Product Drawer
  const [isCreateProdOpen, setIsCreateProdOpen] = useState(false);
  const [newProdName, setNewProdName] = useState("");
  const [newProdCat, setNewProdCat] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdCost, setNewProdCost] = useState("");
  const [newProdSku, setNewProdSku] = useState("");
  const [newProdUnit, setNewProdUnit] = useState("unidades");
  const [newProdDesc, setNewProdDesc] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
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
    setIsDetailDrawerOpen(true);
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
        setIsDetailDrawerOpen(false);
      }, 1500);
    } catch (error) {
      console.error(error);
      alert("Error al actualizar.");
    }
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      await createCategory({ name: newCatName, description: newCatDesc });
      setIsCreateCatOpen(false);
      setNewCatName("");
      setNewCatDesc("");
    } catch (e) {
      alert("Error al crear categoría");
    }
  };

  const handleCreateProduct = async () => {
    if (!newProdName.trim() || !newProdCat) return;
    try {
      await createProduct({
        name: newProdName,
        category_id: newProdCat,
        unit_value: Number(newProdPrice) || 0,
        cost_value: Number(newProdCost) || 0,
        unit_name: newProdUnit,
        sku: newProdSku,
        description: newProdDesc
      });
      setIsCreateProdOpen(false);
      setNewProdName("");
      setNewProdCat("");
      setNewProdPrice("");
      setNewProdCost("");
      setNewProdSku("");
      setNewProdDesc("");
    } catch (e) {
      alert("Error al crear producto");
    }
  };

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
          {isBoss && (
            <div className="flex bg-gray-100 rounded-xl p-1">
              <button 
                onClick={() => setView("products")} 
                className={`px-3 py-1.5 rounded-lg text-[13px] font-bold transition-colors ${view === "products" ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}
              >
                Productos
              </button>
              <button 
                onClick={() => setView("categories")} 
                className={`px-3 py-1.5 rounded-lg text-[13px] font-bold transition-colors ${view === "categories" ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}
              >
                Categorías
              </button>
            </div>
          )}
        </div>
        
        {view === "products" && (
          <>
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
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
              {isBoss && (
                <button 
                  onClick={() => setIsCreateProdOpen(true)}
                  className="flex items-center justify-center bg-black text-white rounded-xl px-4 active:scale-95 transition-transform"
                >
                  <Plus className="size-5" />
                </button>
              )}
            </div>

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
          </>
        )}
      </header>

      {/* VISTAS */}
      <main className="flex-1 px-4 pt-4">
        {isLoading ? (
          <div className="space-y-3">
             {[1,2,3,4,5].map(i => (
               <div key={i} className="h-20 bg-gray-200 rounded-2xl animate-pulse" />
             ))}
          </div>
        ) : view === "products" ? (
          filteredInventory.length === 0 ? (
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
          )
        ) : (
          <div className="space-y-4">
            <Button 
              className="w-full bg-gray-900 text-white rounded-2xl h-14 font-bold text-[15px]" 
              onClick={() => setIsCreateCatOpen(true)}
            >
              <Plus className="size-5 mr-2" /> Nueva categoría
            </Button>
            <div className="space-y-3 mt-4">
              {categories.map(cat => (
                <div key={cat.id} className="w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[16px] font-bold text-gray-900">{cat.name}</span>
                    <span className="text-[13px] text-gray-500">{cat.productCount} productos</span>
                  </div>
                  <Folder className="size-5 text-gray-300" />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* DRAWER: DETALLE / ACCIÓN DE INVENTARIO */}
      <Drawer open={isDetailDrawerOpen} onOpenChange={setIsDetailDrawerOpen}>
        <DrawerContent className="bg-gray-50 border-t-0 px-4 pb-6">
          {selectedProduct && (
            <div className="flex flex-col h-full max-h-[85vh]">
              <div className="flex flex-col items-center text-center py-6 border-b border-gray-200/60">
                <span className="text-[13px] font-bold uppercase tracking-wider text-gray-400 mb-1">{selectedProduct.category}</span>
                <h2 className="text-2xl font-black text-gray-900 mb-2">{selectedProduct.name}</h2>
                <span className="text-[14px] font-medium text-gray-500 mb-4">${selectedProduct.unitValue.toLocaleString()}</span>
                
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
                    
                    <div className="bg-white rounded-2xl p-5 border border-gray-100">
                       <h3 className="text-[14px] font-bold text-gray-900 mb-2">Movimientos / Detalles</h3>
                       <p className="text-[13px] text-gray-500 text-center py-4">Toca una acción arriba para registrar un movimiento.</p>
                    </div>
                  </div>
                ) : (
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

      {/* DRAWER: CREAR CATEGORIA */}
      <Drawer open={isCreateCatOpen} onOpenChange={setIsCreateCatOpen}>
        <DrawerContent className="bg-white border-t-0 px-5 pb-8">
          <div className="flex flex-col">
            <div className="py-6 border-b border-gray-100 mb-4">
              <h2 className="text-xl font-black text-gray-900">Nueva Categoría</h2>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[13px] font-bold text-gray-500 ml-1 mb-1 block">Nombre</label>
                <input 
                  type="text" 
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Ej. Bebidas"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-[16px] outline-none focus:border-black transition-colors"
                />
              </div>
              <div>
                <label className="text-[13px] font-bold text-gray-500 ml-1 mb-1 block">Descripción (Opcional)</label>
                <input 
                  type="text" 
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-[16px] outline-none focus:border-black transition-colors"
                />
              </div>
              <Button 
                onClick={handleCreateCategory} 
                disabled={isCreatingCategory || !newCatName.trim()}
                className="w-full h-14 rounded-xl font-bold text-[16px] mt-4"
              >
                {isCreatingCategory ? "Creando..." : "Crear categoría"}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* DRAWER: CREAR PRODUCTO */}
      <Drawer open={isCreateProdOpen} onOpenChange={setIsCreateProdOpen}>
        <DrawerContent className="bg-white border-t-0 px-5 pb-8">
          <div className="flex flex-col max-h-[85vh]">
            <div className="py-6 border-b border-gray-100 mb-4 flex-shrink-0">
              <h2 className="text-xl font-black text-gray-900">Nuevo Producto</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pb-4 scrollbar-hide">
              <div>
                <label className="text-[13px] font-bold text-gray-500 ml-1 mb-1 block">Nombre del producto *</label>
                <input 
                  type="text" 
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  placeholder="Ej. Whisky 750ml"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-[16px] outline-none focus:border-black transition-colors"
                />
              </div>
              
              <div>
                <label className="text-[13px] font-bold text-gray-500 ml-1 mb-1 block">Categoría *</label>
                <select 
                  value={newProdCat}
                  onChange={(e) => setNewProdCat(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-[16px] outline-none focus:border-black transition-colors appearance-none"
                >
                  <option value="" disabled>Selecciona una categoría</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[13px] font-bold text-gray-500 ml-1 mb-1 block">Precio de Venta</label>
                <input 
                  type="number" 
                  value={newProdPrice}
                  onChange={(e) => setNewProdPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-[16px] outline-none focus:border-black transition-colors"
                />
              </div>

              <div className="border border-gray-100 rounded-2xl overflow-hidden mt-6">
                <button 
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full p-4 flex items-center justify-between bg-gray-50 font-bold text-[14px] text-gray-700"
                >
                  Más detalles {showAdvanced ? "▾" : "▸"}
                </button>
                {showAdvanced && (
                  <div className="p-4 space-y-4 bg-white">
                     <div>
                      <label className="text-[12px] font-bold text-gray-500 ml-1 mb-1 block">Costo</label>
                      <input type="number" value={newProdCost} onChange={(e) => setNewProdCost(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-[14px]" />
                    </div>
                    <div>
                      <label className="text-[12px] font-bold text-gray-500 ml-1 mb-1 block">SKU</label>
                      <input type="text" value={newProdSku} onChange={(e) => setNewProdSku(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-[14px]" />
                    </div>
                    <div>
                      <label className="text-[12px] font-bold text-gray-500 ml-1 mb-1 block">Unidad (Ej. lb, kg, cajas)</label>
                      <input type="text" value={newProdUnit} onChange={(e) => setNewProdUnit(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-[14px]" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 flex-shrink-0">
              <Button 
                onClick={handleCreateProduct} 
                disabled={isCreatingProduct || !newProdName.trim() || !newProdCat}
                className="w-full h-14 rounded-xl font-bold text-[16px]"
              >
                {isCreatingProduct ? "Creando..." : "Crear producto"}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
