import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { 
  Search, 
  Plus, 
  Minus, 
  X, 
  CheckCircle2, 
  SlidersHorizontal,
  ChevronLeft,
  Check,
  Package,
  ArrowRight,
  FolderTree,
  Edit3
} from "lucide-react";

import { useInventoryData, type InventoryProduct } from "@/features/inventory/use-inventory-data";
import { useSession } from "@/features/auth/session";
import { 
  Drawer, 
  DrawerContent, 
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ProductVisualIcon } from "@/features/inventory/components/ProductVisualIcon";

export const Route = createFileRoute("/_app/inventory")({
  head: () => ({
    meta: [{ title: "Items · Inventario" }],
  }),
  component: InventoryPage,
});

type ActionType = "none" | "in" | "out";

function InventoryPage() {
  const navigate = useNavigate();
  const { 
    inventory, 
    categories, 
    subcategories,
    isLoading, 
    addMovement, 
    isUpdating,
    createProduct,
    updateProduct,
    isCreatingProduct,
    isUpdatingProduct,
  } = useInventoryData();
  
  const { role } = useSession();
  const isBoss = role === "boss" || role === "boss_admin" || role === "operations_admin";
  const canEditStock = isBoss || role === "factory" || role === "warehouse" || role === "store";

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<"all" | "warehouse" | "store" | "factory">("all");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  
  // Product Detail / Movement Drawer
  const [detailProduct, setDetailProduct] = useState<InventoryProduct | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType>("none");
  const [actionQty, setActionQty] = useState(1);
  const [successMsg, setSuccessMsg] = useState("");

  // Edit Product Modal (Boss)
  const [isEditProdOpen, setIsEditProdOpen] = useState(false);
  const [editProdId, setEditProdId] = useState("");
  const [editProdName, setEditProdName] = useState("");
  const [editProdCat, setEditProdCat] = useState("");
  const [editProdSubcat, setEditProdSubcat] = useState("");
  const [editProdPrice, setEditProdPrice] = useState("");
  const [editProdCost, setEditProdCost] = useState("");
  const [editProdDesc, setEditProdDesc] = useState("");

  // Create Product Modal
  const [isCreateProdOpen, setIsCreateProdOpen] = useState(false);
  const [newProdName, setNewProdName] = useState("");
  const [newProdCat, setNewProdCat] = useState("");
  const [newProdSubcat, setNewProdSubcat] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdCost, setNewProdCost] = useState("");
  const [newProdSku, setNewProdSku] = useState("");
  const [newProdUnit, setNewProdUnit] = useState("Unidad");
  const [newProdDesc, setNewProdDesc] = useState("");

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (selectedCategory !== "all" && item.category.trim().toLowerCase() !== selectedCategory.toLowerCase()) return false;
      if (locationFilter !== "all" && item.locationType !== locationFilter) return false;
      return true;
    });
  }, [inventory, search, selectedCategory, locationFilter]);

  const handleOpenDrawer = (product: InventoryProduct) => {
    setDetailProduct(product);
    setActionType("none");
    setActionQty(1);
    setSuccessMsg("");
    setIsDetailDrawerOpen(true);
  };

  const handleSelectCard = (product: InventoryProduct) => {
    if (selectedProductId === product.id) {
      setSelectedProductId(null);
    } else {
      setSelectedProductId(product.id);
    }
  };

  const handleOpenEditProduct = (product: InventoryProduct) => {
    setEditProdId(product.productId || product.id);
    setEditProdName(product.name);
    setEditProdCat(product.categoryId || "");
    setEditProdSubcat(product.subcategoryId || "");
    setEditProdPrice(String(product.unitValue || ""));
    setEditProdCost(String(product.costValue || ""));
    setEditProdDesc(product.description || "");
    setIsEditProdOpen(true);
  };

  const handleSaveEditProduct = async () => {
    if (!editProdId || !editProdName.trim()) {
      toast.error("El nombre del producto no puede estar vacío.");
      return;
    }
    try {
      await updateProduct({
        id: editProdId,
        name: editProdName.trim(),
        category_id: editProdCat || undefined,
        subcategory_id: editProdSubcat || null,
        unit_value: editProdPrice ? Number(editProdPrice) : undefined,
        cost_value: editProdCost ? Number(editProdCost) : undefined,
        description: editProdDesc.trim() || null,
      });
      toast.success("Producto actualizado exitosamente.");
      setIsEditProdOpen(false);
      setIsDetailDrawerOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Error al actualizar producto.");
    }
  };

  const handleCreateProduct = async () => {
    if (!newProdName.trim() || !newProdCat) {
      toast.error("Ingresa nombre y categoría.");
      return;
    }
    try {
      await createProduct({
        name: newProdName.trim(),
        category_id: newProdCat,
        subcategory_id: newProdSubcat || null,
        unit_value: Number(newProdPrice) || 0,
        cost_value: Number(newProdCost) || 0,
        unit_name: newProdUnit,
        sku: newProdSku.trim() || undefined,
        description: newProdDesc.trim() || undefined,
      });
      toast.success("Producto creado exitosamente.");
      setIsCreateProdOpen(false);
      setNewProdName("");
      setNewProdCat("");
      setNewProdSubcat("");
      setNewProdPrice("");
      setNewProdCost("");
      setNewProdSku("");
      setNewProdDesc("");
    } catch (e: any) {
      toast.error(e.message || "Error al crear producto.");
    }
  };

  const handleConfirmAction = async () => {
    if (!detailProduct || actionType === "none" || actionQty <= 0) return;

    try {
      const isEntry = actionType === "in";
      await addMovement({
        productId: detailProduct.productId || detailProduct.id,
        type: isEntry ? "in" : "out",
        movementType: isEntry ? "adjustment_in" : "adjustment_out",
        locationType: detailProduct.locationType,
        locationId: detailProduct.locationId,
        currentBalanceId: detailProduct.id,
        currentQuantity: detailProduct.quantity,
        quantity: actionQty,
        notes: isEntry ? "Entrada manual de inventario" : "Salida manual de inventario",
      });

      setSuccessMsg(isEntry ? `+${actionQty} unidades añadidas` : `-${actionQty} unidades descontadas`);
      
      setTimeout(() => {
        setIsDetailDrawerOpen(false);
        setActionType("none");
        setSuccessMsg("");
      }, 1500);

    } catch (error: any) {
      toast.error(error?.message || "Error al actualizar inventario.");
    }
  };

  const activeProduct = inventory.find(p => p.id === selectedProductId);

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
            Items & Inventario
          </h1>

          <div className="flex items-center gap-2">
            <Link 
              to="/admin"
              className="flex size-10 items-center justify-center rounded-full bg-white border border-slate-200/80 shadow-xs text-slate-800 active:scale-95 transition-transform"
              title="Panel Administrativo (Categorías y Subcategorías)"
            >
              <FolderTree className="size-4" />
            </Link>

            <button 
              onClick={() => setIsCreateProdOpen(true)}
              className="flex size-10 items-center justify-center rounded-full bg-slate-900 border border-slate-800 shadow-xs text-white active:scale-95 transition-transform"
              title="Crear Producto"
            >
              <Plus className="size-5 stroke-[2.5]" />
            </button>
          </div>
        </header>

        {/* BUSCADOR Y BOTON DE FILTROS */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="size-4" />
            </div>
            <input 
              type="text" 
              className="block w-full pl-10 pr-3.5 py-3 rounded-2xl bg-white border border-slate-200/80 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-900 shadow-xs transition-all"
              placeholder="Buscar productos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
                <X className="size-4" />
              </button>
            )}
          </div>

          <button 
            onClick={() => {
              if (locationFilter === "all") setLocationFilter("warehouse");
              else if (locationFilter === "warehouse") setLocationFilter("store");
              else if (locationFilter === "store") setLocationFilter("factory");
              else setLocationFilter("all");
            }}
            className="flex size-12 items-center justify-center rounded-2xl bg-white border border-slate-200/80 text-slate-800 shadow-xs active:scale-95 transition-transform shrink-0"
            title={`Filtrar sede: ${locationFilter}`}
          >
            <SlidersHorizontal className="size-5" />
          </button>
        </div>

        {/* PILLS DE CATEGORÍAS HORIZONTALES */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide pt-1">
          <button 
            onClick={() => setSelectedCategory("all")}
            className={`whitespace-nowrap px-4 py-2 rounded-2xl text-[13px] font-bold transition-colors ${selectedCategory === "all" ? 'bg-slate-900 text-white shadow-xs' : 'bg-white border border-slate-200/80 text-slate-600'}`}
          >
            Todos
          </button>

          {categories.map((cat) => (
            <button 
              key={cat.id}
              onClick={() => setSelectedCategory(cat.name.trim().toLowerCase())}
              className={`whitespace-nowrap px-4 py-2 rounded-2xl text-[13px] font-bold transition-colors ${selectedCategory === cat.name.trim().toLowerCase() ? 'bg-slate-900 text-white shadow-xs' : 'bg-white border border-slate-200/80 text-slate-600'}`}
            >
              {cat.name.trim()}
            </button>
          ))}

          {isBoss && (
            <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Sede:</span>
              <button 
                onClick={() => setLocationFilter("all")}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold ${locationFilter === "all" ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200"}`}
              >
                Todas
              </button>
              <button 
                onClick={() => setLocationFilter("warehouse")}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold ${locationFilter === "warehouse" ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200"}`}
              >
                Bodega
              </button>
              <button 
                onClick={() => setLocationFilter("store")}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold ${locationFilter === "store" ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200"}`}
              >
                Tienda
              </button>
            </div>
          )}
        </div>

        {/* PRODUCT GRID (2 COLUMNAS) */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-56 bg-white/60 rounded-[28px] animate-pulse border border-slate-200/60" />
            ))}
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Package className="size-12 mb-3 opacity-30" />
            <p className="text-[15px] font-semibold">Sin productos encontrados</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5">
            {filteredInventory.map((item) => {
              const isSelected = selectedProductId === item.id;

              return (
                <div 
                  key={item.id}
                  onClick={() => handleSelectCard(item)}
                  className={`group relative flex flex-col justify-between p-4 rounded-[28px] border transition-all cursor-pointer select-none active:scale-[0.98] ${
                    isSelected 
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20' 
                      : 'bg-white border-slate-200/80 hover:border-slate-400 shadow-xs'
                  }`}
                >
                  {/* Top Bar inside Card: Checkbox + Category */}
                  <div className="flex items-center justify-between mb-2">
                    <div className={`size-5 rounded-full border flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-white border-white text-slate-900' : 'border-slate-300 bg-white'
                    }`}>
                      {isSelected && <Check className="size-3 stroke-[3]" />}
                    </div>

                    <span className={`text-[11px] font-bold capitalize tracking-tight ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                      {item.category}
                    </span>
                  </div>

                  {/* Central Visual Icon / Graphic */}
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDrawer(item);
                    }}
                    className="flex flex-col items-center justify-center py-3"
                  >
                    <div className="size-20 rounded-2xl bg-slate-100/70 border border-slate-200/50 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform overflow-hidden">
                      <ProductVisualIcon name={item.name} category={item.category} className="size-14" />
                    </div>
                  </div>

                  {/* Bottom Information */}
                  <div className="flex flex-col gap-1 pt-1">
                    <h3 className={`text-[15px] font-black leading-tight truncate ${isSelected ? 'text-white' : 'text-slate-950'}`}>
                      {item.name}
                    </h3>
                    <span className={`text-[13px] font-semibold ${isSelected ? 'text-slate-200' : 'text-slate-700'}`}>
                      ${item.unitValue.toLocaleString()}
                    </span>

                    {/* Stock status pill */}
                    <div className="flex items-center justify-between pt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        item.quantity > 10 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : item.quantity > 0 
                            ? 'bg-amber-100 text-amber-900' 
                            : 'bg-rose-100 text-rose-900'
                      }`}>
                        {item.quantity > 0 ? `Stock: ${item.quantity}` : "Agotado"}
                      </span>

                      {isBoss && (
                        <span className={`text-[10px] font-bold capitalize ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>
                          {item.locationType === "warehouse" ? "Bodega" : item.locationType === "store" ? "Tienda" : "Fábrica"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* FLOATING BOTTOM ACTION BAR */}
      <div className="fixed bottom-20 inset-x-4 z-20 flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3 w-full max-w-md">
          <button 
            onClick={() => setIsCreateProdOpen(true)}
            className="flex size-14 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-lg active:scale-95 transition-transform shrink-0"
            title="Nuevo producto"
          >
            <Plus className="size-6 stroke-[2.5]" />
          </button>

          <button 
            onClick={() => {
              if (activeProduct) {
                handleOpenDrawer(activeProduct);
              } else if (filteredInventory.length > 0) {
                handleOpenDrawer(filteredInventory[0]);
              }
            }}
            className="flex flex-1 items-center justify-between h-14 px-6 rounded-2xl bg-slate-900 text-white font-bold text-[15px] shadow-lg active:scale-[0.98] transition-all"
          >
            <span>{activeProduct ? `Mover "${activeProduct.name}"` : "Mover stock / Despachar"}</span>
            <ArrowRight className="size-5" />
          </button>
        </div>
      </div>

      {/* DRAWER: DETALLE / ENTRADA Y SALIDA DE STOCK */}
      <Drawer open={isDetailDrawerOpen} onOpenChange={setIsDetailDrawerOpen}>
        <DrawerContent className="bg-[#F8FAFC] border-t-0 px-5 pb-8">
          {detailProduct && (
            <div className="flex flex-col h-full max-h-[85vh]">
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-12 h-1.5 rounded-full bg-slate-300" />
              </div>

              <div className="flex flex-col items-center text-center py-4 border-b border-slate-200">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-slate-500">{detailProduct.category}</span>
                  <span className="text-slate-300 text-xs">•</span>
                  <span className="text-[11px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded-md font-bold">
                    {detailProduct.locationType === "warehouse" ? "Bodega Principal" : detailProduct.locationType === "store" ? "Tienda" : "Fábrica"}
                  </span>
                </div>

                <h2 className="text-3xl font-black text-slate-950 mb-1">{detailProduct.name}</h2>
                <span className="text-[15px] font-bold text-slate-700 mb-1">
                  ${detailProduct.unitValue.toLocaleString()} / {detailProduct.unitName || "unidad"}
                </span>

                {detailProduct.description && (
                  <p className="text-[12px] text-slate-600 max-w-xs mb-3 font-semibold bg-white/80 border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs">
                    {detailProduct.description}
                  </p>
                )}

                <div className="flex flex-col items-center mt-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">STOCK ACTUAL</span>
                  <span className="text-5xl font-black text-slate-950 mt-1">{detailProduct.quantity}</span>
                </div>

                {isBoss && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEditProduct(detailProduct)}
                    className="mt-4 rounded-xl border-slate-300 bg-white font-bold text-xs h-9 px-4 text-slate-800"
                  >
                    <Edit3 className="size-3.5 mr-1.5" /> Editar producto
                  </Button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto py-5">
                {successMsg ? (
                  <div className="flex flex-col items-center justify-center py-6 text-emerald-600 animate-in fade-in zoom-in duration-300">
                    <CheckCircle2 className="size-16 mb-2" />
                    <span className="text-xl font-black">{successMsg}</span>
                  </div>
                ) : actionType === "none" ? (
                  <div className="flex flex-col gap-3">
                    {canEditStock && (
                      <div className="grid grid-cols-2 gap-3 mb-2">
                        <button 
                          onClick={() => setActionType("in")}
                          className="flex flex-col items-center justify-center gap-1.5 bg-emerald-600 text-white p-4 rounded-2xl active:scale-95 transition-all shadow-sm font-bold text-[15px]"
                        >
                          <Plus className="size-6" />
                          <span>Entrada de Stock</span>
                        </button>
                        <button 
                          onClick={() => setActionType("out")}
                          className="flex flex-col items-center justify-center gap-1.5 bg-rose-600 text-white p-4 rounded-2xl active:scale-95 transition-all shadow-sm font-bold text-[15px]"
                        >
                          <Minus className="size-6" />
                          <span>Salida de Stock</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center animate-in slide-in-from-right-4 duration-200">
                    <h3 className={`text-lg font-black mb-6 ${actionType === "in" ? "text-emerald-600" : "text-rose-600"}`}>
                      ¿Cuántas unidades {actionType === "in" ? "entraron" : "salieron"}?
                    </h3>
                    
                    <div className="flex items-center gap-6 mb-8">
                      <button 
                        onClick={() => setActionQty(Math.max(1, actionQty - 1))}
                        className="flex size-14 items-center justify-center rounded-2xl bg-white border border-slate-200 shadow-sm active:scale-95 transition-transform"
                      >
                        <Minus className="size-6 text-slate-800" />
                      </button>
                      <span className="text-5xl font-black w-24 text-center text-slate-950">{actionQty}</span>
                      <button 
                        onClick={() => setActionQty(actionQty + 1)}
                        className="flex size-14 items-center justify-center rounded-2xl bg-white border border-slate-200 shadow-sm active:scale-95 transition-transform"
                      >
                        <Plus className="size-6 text-slate-800" />
                      </button>
                    </div>

                    <div className="flex flex-col w-full gap-2.5">
                      <Button 
                        size="lg" 
                        className={`w-full h-14 text-[16px] font-black rounded-2xl ${
                          actionType === "in" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-rose-600 hover:bg-rose-700 text-white"
                        }`}
                        onClick={handleConfirmAction}
                        disabled={isUpdating}
                      >
                        {isUpdating ? "Confirmando..." : `Confirmar ${actionType === "in" ? "entrada" : "salida"}`}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="lg"
                        className="w-full h-12 text-[14px] font-bold text-slate-500 rounded-2xl"
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

      {/* MODAL / DRAWER: CREAR PRODUCTO */}
      <Drawer open={isCreateProdOpen} onOpenChange={setIsCreateProdOpen}>
        <DrawerContent className="bg-white border-t-0 px-5 pb-8">
          <div className="flex flex-col max-h-[85vh]">
            <div className="py-4 border-b border-slate-100 mb-3 flex-shrink-0">
              <h2 className="text-xl font-black text-slate-900">Nuevo Producto</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pb-3 scrollbar-hide">
              <div>
                <label className="text-[12px] font-bold text-slate-500 ml-1 mb-1 block">Nombre *</label>
                <input 
                  type="text" 
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  placeholder="Ej. Lisos"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-[15px] outline-none focus:border-slate-900 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[12px] font-bold text-slate-500 ml-1 mb-1 block">Categoría *</label>
                  <select 
                    value={newProdCat}
                    onChange={(e) => {
                      setNewProdCat(e.target.value);
                      setNewProdSubcat("");
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-[14px] outline-none focus:border-slate-900 transition-colors appearance-none font-bold"
                  >
                    <option value="" disabled>Selecciona categoría</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[12px] font-bold text-slate-500 ml-1 mb-1 block">Subcategoría</label>
                  <select 
                    value={newProdSubcat}
                    onChange={(e) => setNewProdSubcat(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-[14px] outline-none focus:border-slate-900 transition-colors appearance-none font-bold"
                  >
                    <option value="">(Ninguna)</option>
                    {subcategories.filter(s => s.parentId === newProdCat || s.parent_id === newProdCat).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[12px] font-bold text-slate-500 ml-1 mb-1 block">Precio Venta</label>
                  <input 
                    type="number" 
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    placeholder="3400"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-[15px] outline-none focus:border-slate-900 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-slate-500 ml-1 mb-1 block">Costo Proveedor</label>
                  <input 
                    type="number" 
                    value={newProdCost}
                    onChange={(e) => setNewProdCost(e.target.value)}
                    placeholder="17000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-[15px] outline-none focus:border-slate-900 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-[12px] font-bold text-slate-500 ml-1 mb-1 block">Detalle / Balón / Bomba</label>
                <input 
                  type="text" 
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  placeholder="Balón: 255.000 | Unidad: 3.400"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-[14px] outline-none focus:border-slate-900 transition-colors"
                />
              </div>
            </div>

            <div className="pt-3 flex-shrink-0">
              <Button 
                onClick={handleCreateProduct} 
                disabled={isCreatingProduct || !newProdName.trim()}
                className="w-full h-14 rounded-2xl font-black text-[15px] bg-slate-900 text-white hover:bg-slate-800 shadow-md"
              >
                {isCreatingProduct ? "Creando..." : "Crear Producto"}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* DRAWER: EDITAR PRODUCTO */}
      <Drawer open={isEditProdOpen} onOpenChange={setIsEditProdOpen}>
        <DrawerContent className="bg-white border-t-0 px-5 pb-8">
          <div className="flex flex-col max-h-[85vh]">
            <div className="py-4 border-b border-slate-100 mb-3 flex-shrink-0">
              <h2 className="text-xl font-black text-slate-900">Editar Producto</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pb-3 scrollbar-hide">
              <div>
                <label className="text-[12px] font-bold text-slate-500 ml-1 mb-1 block">Nombre</label>
                <input 
                  type="text" 
                  value={editProdName}
                  onChange={(e) => setEditProdName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-[15px] outline-none focus:border-slate-900 transition-colors"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[12px] font-bold text-slate-500 ml-1 mb-1 block">Categoría</label>
                  <select 
                    value={editProdCat}
                    onChange={(e) => {
                      setEditProdCat(e.target.value);
                      setEditProdSubcat("");
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-[14px] outline-none focus:border-slate-900 transition-colors appearance-none font-bold"
                  >
                    <option value="" disabled>Selecciona categoría</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[12px] font-bold text-slate-500 ml-1 mb-1 block">Subcategoría</label>
                  <select 
                    value={editProdSubcat}
                    onChange={(e) => setEditProdSubcat(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-[14px] outline-none focus:border-slate-900 transition-colors appearance-none font-bold"
                  >
                    <option value="">(Ninguna)</option>
                    {subcategories.filter(s => s.parentId === editProdCat || s.parent_id === editProdCat).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[12px] font-bold text-slate-500 ml-1 mb-1 block">Precio Venta</label>
                  <input 
                    type="number" 
                    value={editProdPrice}
                    onChange={(e) => setEditProdPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-[15px] outline-none focus:border-slate-900 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-slate-500 ml-1 mb-1 block">Costo Proveedor</label>
                  <input 
                    type="number" 
                    value={editProdCost}
                    onChange={(e) => setEditProdCost(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-[15px] outline-none focus:border-slate-900 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-[12px] font-bold text-slate-500 ml-1 mb-1 block">Descripción</label>
                <input 
                  type="text" 
                  value={editProdDesc}
                  onChange={(e) => setEditProdDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-[14px] outline-none focus:border-slate-900 transition-colors"
                />
              </div>
            </div>

            <div className="pt-3 flex-shrink-0">
              <Button 
                onClick={handleSaveEditProduct} 
                disabled={isUpdatingProduct || !editProdName.trim()}
                className="w-full h-14 rounded-2xl font-black text-[15px] bg-slate-900 text-white hover:bg-slate-800"
              >
                {isUpdatingProduct ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

    </div>
  );
}
