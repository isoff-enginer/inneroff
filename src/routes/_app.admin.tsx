import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { 
  ChevronLeft, 
  Plus, 
  Folder, 
  FolderTree, 
  Package, 
  Edit3, 
  Trash2, 
  Search, 
  Check, 
  X, 
  AlertCircle,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  Tag
} from "lucide-react";
import { useInventoryData, type ProductCategory, type CatalogProduct } from "@/features/inventory/use-inventory-data";
import { formatCurrency } from "@/lib/format";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSession } from "@/features/auth/session";

export const Route = createFileRoute("/_app/admin")({
  head: () => ({
    meta: [{ title: "Administración · Catálogo & Categorías" }],
  }),
  component: AdminPage,
});

type AdminTab = "products" | "categories" | "subcategories";

function AdminPage() {
  const navigate = useNavigate();
  const { role } = useSession();
  const {
    allProducts,
    categories,
    subcategories,
    allCategoriesRaw,
    isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
    createProduct,
    updateProduct,
    deleteProduct,
    isCreatingCategory,
    isUpdatingCategory,
    isDeletingCategory,
    isCreatingProduct,
    isUpdatingProduct,
    isDeletingProduct,
  } = useInventoryData();

  const [activeTab, setActiveTab] = useState<AdminTab>("products");
  const [search, setSearch] = useState("");
  const [filterCatId, setFilterCatId] = useState<string>("all");

  // Category Modal (Create / Edit)
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [catParentId, setCatParentId] = useState<string | null>(null);
  const [isSubcategoryMode, setIsSubcategoryMode] = useState(false);

  // Product Modal (Create / Edit)
  const [isProdModalOpen, setIsProdModalOpen] = useState(false);
  const [editingProdId, setEditingProdId] = useState<string | null>(null);
  const [prodName, setProdName] = useState("");
  const [prodCatId, setProdCatId] = useState("");
  const [prodSubcatId, setProdSubcatId] = useState<string>("");
  const [prodUnitPrice, setProdUnitPrice] = useState("");
  const [prodCostPrice, setProdCostPrice] = useState("");
  const [prodUnitName, setProdUnitName] = useState("Unidad");
  const [prodSku, setProdSku] = useState("");
  const [prodDesc, setProdDesc] = useState("");

  // Subcategories available for selected category in product modal
  const modalAvailableSubs = useMemo(() => {
    if (!prodCatId) return [];
    return subcategories.filter(s => s.parentId === prodCatId || s.parent_id === prodCatId);
  }, [subcategories, prodCatId]);

  // Open Create Main Category Modal
  const handleOpenCreateCategory = () => {
    setEditingCatId(null);
    setCatName("");
    setCatDesc("");
    setCatParentId(null);
    setIsSubcategoryMode(false);
    setIsCatModalOpen(true);
  };

  // Open Create Subcategory Modal
  const handleOpenCreateSubcategory = (preselectedParentId?: string) => {
    setEditingCatId(null);
    setCatName("");
    setCatDesc("");
    setCatParentId(preselectedParentId || categories[0]?.id || null);
    setIsSubcategoryMode(true);
    setIsCatModalOpen(true);
  };

  // Open Edit Category / Subcategory Modal
  const handleOpenEditCategory = (cat: ProductCategory) => {
    setEditingCatId(cat.id);
    setCatName(cat.name);
    setCatDesc(cat.description || "");
    setCatParentId(cat.parentId || cat.parent_id || null);
    setIsSubcategoryMode(!!(cat.parentId || cat.parent_id));
    setIsCatModalOpen(true);
  };

  // Save Category / Subcategory
  const handleSaveCategory = async () => {
    if (!catName.trim()) {
      toast.error("Ingresa el nombre");
      return;
    }
    if (isSubcategoryMode && !catParentId) {
      toast.error("Selecciona una categoría principal para la subcategoría");
      return;
    }

    try {
      if (editingCatId) {
        await updateCategory({
          id: editingCatId,
          name: catName,
          description: catDesc,
          parentId: isSubcategoryMode ? catParentId : null,
        });
        toast.success("Categoría actualizada correctamente");
      } else {
        await createCategory({
          name: catName,
          description: catDesc,
          parentId: isSubcategoryMode ? catParentId : null,
        });
        toast.success(`${isSubcategoryMode ? "Subcategoría" : "Categoría"} creada exitosamente`);
      }
      setIsCatModalOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Error al guardar categoría");
    }
  };

  // Delete Category
  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar la categoría/subcategoría "${name}"?`)) return;
    try {
      await deleteCategory(id);
      toast.success("Eliminada correctamente");
    } catch (e: any) {
      toast.error(e.message || "Error al eliminar");
    }
  };

  // Open Create Product Modal
  const handleOpenCreateProduct = () => {
    setEditingProdId(null);
    setProdName("");
    setProdCatId(categories[0]?.id || "");
    setProdSubcatId("");
    setProdUnitPrice("");
    setProdCostPrice("");
    setProdUnitName("Unidad");
    setProdSku("");
    setProdDesc("");
    setIsProdModalOpen(true);
  };

  // Open Edit Product Modal
  const handleOpenEditProduct = (prod: any) => {
    setEditingProdId(prod.id);
    setProdName(prod.name);
    setProdCatId(prod.category_id || "");
    setProdSubcatId(prod.subcategory_id || "");
    setProdUnitPrice(String(prod.unit_value || 0));
    setProdCostPrice(String(prod.cost_value || 0));
    setProdUnitName(prod.unit_name || "Unidad");
    setProdSku(prod.sku || "");
    setProdDesc(prod.description || "");
    setIsProdModalOpen(true);
  };

  // Save Product
  const handleSaveProduct = async () => {
    if (!prodName.trim()) {
      toast.error("Ingresa el nombre del producto");
      return;
    }
    if (!prodCatId) {
      toast.error("Selecciona una categoría principal");
      return;
    }

    try {
      if (editingProdId) {
        await updateProduct({
          id: editingProdId,
          name: prodName,
          category_id: prodCatId,
          subcategory_id: prodSubcatId || null,
          unit_value: Number(prodUnitPrice) || 0,
          cost_value: Number(prodCostPrice) || 0,
          unit_name: prodUnitName,
          sku: prodSku,
          description: prodDesc,
        });
        toast.success("Producto actualizado correctamente");
      } else {
        await createProduct({
          name: prodName,
          category_id: prodCatId,
          subcategory_id: prodSubcatId || null,
          unit_value: Number(prodUnitPrice) || 0,
          cost_value: Number(prodCostPrice) || 0,
          unit_name: prodUnitName,
          sku: prodSku,
          description: prodDesc,
        });
        toast.success("Producto creado exitosamente");
      }
      setIsProdModalOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Error al guardar producto");
    }
  };

  // Delete Product
  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar el producto "${name}" del catálogo?`)) return;
    try {
      await deleteProduct(id);
      toast.success("Producto eliminado del catálogo");
    } catch (e: any) {
      toast.error(e.message || "Error al eliminar producto");
    }
  };

  // Initial Seed for Verde and Blanco
  const handleSeedInitialCatalog = async () => {
    if (!confirm("¿Deseas inicializar las categorías Verde, Blanco y sus subproductos base?")) return;

    try {
      toast.info("Configurando catálogo...");
      
      // 1. Crear o buscar categoría Verde
      let catVerde = categories.find(c => c.name.toLowerCase() === "verde");
      if (!catVerde) {
        await createCategory({ name: "Verde", description: "Productos Categoría Verde" });
      }
      
      // 2. Crear o buscar categoría Blanco
      let catBlanco = categories.find(c => c.name.toLowerCase() === "blanco");
      if (!catBlanco) {
        await createCategory({ name: "Blanco", description: "Productos Categoría Blanco" });
      }

      toast.success("Categorías base listas. Ahora puedes agregar o personalizar subcategorías y productos.");
    } catch (e: any) {
      toast.error(e.message || "Error al inicializar");
    }
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return allProducts.filter((p: any) => {
      const matchesSearch = `${p.name} ${p.sku || ""} ${p.product_categories?.name || ""}`
        .toLowerCase()
        .includes(search.toLowerCase());
      if (!matchesSearch) return false;
      if (filterCatId !== "all" && p.category_id !== filterCatId) return false;
      return true;
    });
  }, [allProducts, search, filterCatId]);

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

          <div className="flex flex-col items-center">
            <h1 className="text-lg font-black tracking-tight text-stone-950">
              Panel Administrativo
            </h1>
            <span className="text-[11px] font-bold text-stone-400">Catálogo & Categorías</span>
          </div>

          <button 
            onClick={handleSeedInitialCatalog}
            className="flex size-10 items-center justify-center rounded-full bg-white border border-stone-200/80 shadow-2xs text-stone-700 active:scale-95 transition-transform"
            title="Inicializar Verde & Blanco"
          >
            <Sparkles className="size-4 text-amber-500" />
          </button>
        </header>

        {/* TABS SELECTOR */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <button
            onClick={() => setActiveTab("products")}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-black transition-all ${
              activeTab === "products" 
                ? "bg-[#FEE867] text-stone-950 shadow-xs" 
                : "text-stone-500 hover:text-stone-900"
            }`}
          >
            <Package className="size-4" />
            <span>Productos</span>
          </button>

          <button
            onClick={() => setActiveTab("categories")}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-black transition-all ${
              activeTab === "categories" 
                ? "bg-[#FEE867] text-stone-950 shadow-xs" 
                : "text-stone-500 hover:text-stone-900"
            }`}
          >
            <Folder className="size-4" />
            <span>Categorías</span>
          </button>

          <button
            onClick={() => setActiveTab("subcategories")}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-black transition-all ${
              activeTab === "subcategories" 
                ? "bg-[#FEE867] text-stone-950 shadow-xs" 
                : "text-stone-500 hover:text-stone-900"
            }`}
          >
            <FolderTree className="size-4" />
            <span>Subcategorías</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: PRODUCTOS                                         */}
        {/* ======================================================== */}
        {activeTab === "products" && (
          <div className="space-y-3">
            {/* Action Bar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  className="block w-full pl-4 pr-10 py-3 rounded-2xl bg-white border border-stone-200/80 text-[13px] text-stone-900 placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-stone-900 shadow-2xs"
                  placeholder="Buscar producto..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400">
                    <X className="size-4" />
                  </button>
                )}
              </div>

              <Button
                onClick={handleOpenCreateProduct}
                className="h-12 px-4 rounded-2xl bg-stone-950 text-white font-black text-[13px] hover:bg-stone-900 shadow-sm shrink-0"
              >
                <Plus className="size-4 mr-1 stroke-[3]" /> Crear
              </Button>
            </div>

            {/* Filter Pills by Category */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button 
                onClick={() => setFilterCatId("all")}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-[12px] font-bold transition-colors ${filterCatId === "all" ? 'bg-stone-900 text-white' : 'bg-white border border-stone-200 text-stone-600'}`}
              >
                Todos ({allProducts.length})
              </button>
              {categories.map((c) => (
                <button 
                  key={c.id}
                  onClick={() => setFilterCatId(c.id)}
                  className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-[12px] font-bold transition-colors ${filterCatId === c.id ? 'bg-[#FEE867] text-stone-950' : 'bg-white border border-stone-200 text-stone-600'}`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {/* Products List */}
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white/60 rounded-[24px] animate-pulse" />)}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-stone-400 bg-white rounded-[32px] border border-stone-200/80 p-6">
                <Package className="size-12 mb-3 opacity-30" />
                <p className="text-[15px] font-bold text-stone-700">Sin productos registrados</p>
                <p className="text-[12px] text-stone-400 text-center mt-1">Crea tu primer producto con el botón Crear superior</p>
                <Button 
                  onClick={handleOpenCreateProduct} 
                  className="mt-4 bg-[#FEE867] text-stone-950 font-black rounded-xl text-xs h-10 px-4"
                >
                  Crear Producto Ahora
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredProducts.map((p: any) => (
                  <div 
                    key={p.id}
                    className="p-4 rounded-[26px] bg-white border border-stone-200/80 shadow-2xs flex items-center justify-between"
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-black text-stone-950">{p.name}</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[#FAF7F2] border border-stone-200 text-stone-700 uppercase">
                          {p.product_categories?.name || "General"}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[12px] font-bold text-stone-600 mt-1">
                        <span className="text-stone-900">Venta: {formatCurrency(p.unit_value || 0)}</span>
                        {p.cost_value > 0 && (
                          <span className="text-stone-400 font-medium">Costo: {formatCurrency(p.cost_value)}</span>
                        )}
                        <span className="text-stone-400 text-[11px] font-medium">{p.unit_name || "unid"}</span>
                      </div>

                      {p.sku && (
                        <span className="text-[10px] text-stone-400 font-mono mt-0.5">SKU: {p.sku}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => handleOpenEditProduct(p)}
                        className="size-9 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-center text-stone-700 hover:bg-stone-100 active:scale-95"
                        title="Editar Producto"
                      >
                        <Edit3 className="size-4" />
                      </button>

                      <button 
                        onClick={() => handleDeleteProduct(p.id, p.name)}
                        className="size-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 hover:bg-rose-100 active:scale-95"
                        title="Eliminar Producto"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: CATEGORÍAS PRINCIPALES                           */}
        {/* ======================================================== */}
        {activeTab === "categories" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-black text-stone-950">Categorías Principales</h2>
                <p className="text-[12px] text-stone-500">Ejemplo: Verde, Blanco, etc.</p>
              </div>

              <Button
                onClick={handleOpenCreateCategory}
                className="h-11 px-4 rounded-2xl bg-stone-950 text-white font-black text-[13px] hover:bg-stone-900 shadow-sm"
              >
                <Plus className="size-4 mr-1 stroke-[3]" /> Nueva Categoría
              </Button>
            </div>

            {categories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-[32px] border border-stone-200/80 p-6 text-stone-400">
                <Folder className="size-12 mb-3 opacity-30" />
                <p className="text-[15px] font-bold text-stone-700">Sin categorías creadas</p>
                <p className="text-[12px] text-stone-400 text-center mt-1">Crea categorías para organizar tus productos</p>
                <Button 
                  onClick={handleOpenCreateCategory} 
                  className="mt-4 bg-[#FEE867] text-stone-950 font-black rounded-xl text-xs h-10 px-4"
                >
                  Crear Categoría
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {categories.map((c) => (
                  <div 
                    key={c.id}
                    className="p-4 rounded-[26px] bg-white border border-stone-200/80 shadow-2xs flex items-center justify-between"
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <Folder className="size-4 text-[#F28C57]" />
                        <span className="text-[16px] font-black text-stone-950">{c.name}</span>
                      </div>
                      {c.description && (
                        <span className="text-[12px] text-stone-500 mt-0.5">{c.description}</span>
                      )}
                      <span className="text-[11px] font-bold text-stone-400 mt-1">
                        {(c.subcategories || []).length} subcategorías • {c.productCount || 0} productos
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => handleOpenCreateSubcategory(c.id)}
                        className="size-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 hover:bg-amber-100 active:scale-95"
                        title="Añadir Subcategoría a esta categoría"
                      >
                        <Plus className="size-4" />
                      </button>

                      <button 
                        onClick={() => handleOpenEditCategory(c)}
                        className="size-9 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-center text-stone-700 hover:bg-stone-100 active:scale-95"
                        title="Editar Categoría"
                      >
                        <Edit3 className="size-4" />
                      </button>

                      <button 
                        onClick={() => handleDeleteCategory(c.id, c.name)}
                        className="size-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 hover:bg-rose-100 active:scale-95"
                        title="Eliminar Categoría"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: SUBCATEGORÍAS                                    */}
        {/* ======================================================== */}
        {activeTab === "subcategories" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-black text-stone-950">Subcategorías</h2>
                <p className="text-[12px] text-stone-500">Ejemplo: Gordos, Largos, Minis, Mamita...</p>
              </div>

              <Button
                onClick={() => handleOpenCreateSubcategory()}
                className="h-11 px-4 rounded-2xl bg-stone-950 text-white font-black text-[13px] hover:bg-stone-900 shadow-sm"
              >
                <Plus className="size-4 mr-1 stroke-[3]" /> Nueva Subcategoría
              </Button>
            </div>

            {subcategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-[32px] border border-stone-200/80 p-6 text-stone-400">
                <FolderTree className="size-12 mb-3 opacity-30" />
                <p className="text-[15px] font-bold text-stone-700">Sin subcategorías creadas</p>
                <p className="text-[12px] text-stone-400 text-center mt-1">Crea subcategorías vinculadas a una categoría principal</p>
                <Button 
                  onClick={() => handleOpenCreateSubcategory()} 
                  className="mt-4 bg-[#FEE867] text-stone-950 font-black rounded-xl text-xs h-10 px-4"
                >
                  Crear Subcategoría
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {subcategories.map((s) => {
                  const parentName = categories.find(c => c.id === (s.parentId || s.parent_id))?.name || "Sin Categoría";
                  return (
                    <div 
                      key={s.id}
                      className="p-4 rounded-[26px] bg-white border border-stone-200/80 shadow-2xs flex items-center justify-between"
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-[15px] font-black text-stone-950">{s.name}</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-50 text-amber-900 border border-amber-200/60 uppercase">
                            Padre: {parentName}
                          </span>
                        </div>
                        {s.description && (
                          <span className="text-[12px] text-stone-500 mt-0.5">{s.description}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => handleOpenEditCategory(s)}
                          className="size-9 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-center text-stone-700 hover:bg-stone-100 active:scale-95"
                          title="Editar Subcategoría"
                        >
                          <Edit3 className="size-4" />
                        </button>

                        <button 
                          onClick={() => handleDeleteCategory(s.id, s.name)}
                          className="size-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 hover:bg-rose-100 active:scale-95"
                          title="Eliminar Subcategoría"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* DRAWER: CREAR / EDITAR CATEGORÍA O SUBCATEGORÍA */}
      <Drawer open={isCatModalOpen} onOpenChange={setIsCatModalOpen}>
        <DrawerContent className="bg-white border-t-0 px-5 pb-8">
          <div className="flex flex-col">
            <div className="py-3 border-b border-stone-100 mb-3 flex items-center justify-between">
              <h2 className="text-xl font-black text-stone-900">
                {editingCatId ? "Editar" : "Crear"} {isSubcategoryMode ? "Subcategoría" : "Categoría"}
              </h2>
              <button onClick={() => setIsCatModalOpen(false)} className="text-stone-400">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              {isSubcategoryMode && (
                <div>
                  <label className="text-[12px] font-bold text-stone-500 block mb-1">Categoría Principal Padre *</label>
                  <select 
                    value={catParentId || ""} 
                    onChange={(e) => setCatParentId(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-3.5 text-[14px] font-bold text-stone-900 outline-none"
                  >
                    <option value="">Selecciona categoría principal</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[12px] font-bold text-stone-500 block mb-1">Nombre *</label>
                <input 
                  type="text" 
                  value={catName} 
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder={isSubcategoryMode ? "Ej. Gordos, Minis, Mamita..." : "Ej. Verde, Blanco..."}
                  className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-3.5 text-[14px] font-bold text-stone-900 outline-none"
                />
              </div>

              <div>
                <label className="text-[12px] font-bold text-stone-500 block mb-1">Descripción (Opcional)</label>
                <input 
                  type="text" 
                  value={catDesc} 
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Descripción corta..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-3.5 text-[14px] font-medium text-stone-900 outline-none"
                />
              </div>

              <Button 
                onClick={handleSaveCategory}
                disabled={isCreatingCategory || isUpdatingCategory}
                className="w-full h-14 rounded-2xl font-black text-[15px] bg-[#FEE867] text-stone-950 hover:bg-[#FEE867]/90 mt-2"
              >
                {isCreatingCategory || isUpdatingCategory ? "Guardando..." : "Guardar Categoría"}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* DRAWER: CREAR / EDITAR PRODUCTO */}
      <Drawer open={isProdModalOpen} onOpenChange={setIsProdModalOpen}>
        <DrawerContent className="bg-white border-t-0 px-5 pb-8 max-h-[90vh] overflow-y-auto">
          <div className="flex flex-col">
            <div className="py-3 border-b border-stone-100 mb-3 flex items-center justify-between">
              <h2 className="text-xl font-black text-stone-900">
                {editingProdId ? "Editar Producto" : "Nuevo Producto"}
              </h2>
              <button onClick={() => setIsProdModalOpen(false)} className="text-stone-400">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[12px] font-bold text-stone-500 block mb-1">Nombre del Producto *</label>
                <input 
                  type="text" 
                  value={prodName} 
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="Ej. Balón Gordo, Mamita, Tornillo..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-3.5 text-[14px] font-bold text-stone-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[12px] font-bold text-stone-500 block mb-1">Categoría Principal *</label>
                  <select 
                    value={prodCatId} 
                    onChange={(e) => {
                      setProdCatId(e.target.value);
                      setProdSubcatId("");
                    }}
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-3.5 text-[13px] font-bold text-stone-900 outline-none"
                  >
                    <option value="">Seleccionar</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[12px] font-bold text-stone-500 block mb-1">Subcategoría</label>
                  <select 
                    value={prodSubcatId} 
                    onChange={(e) => setProdSubcatId(e.target.value)}
                    disabled={modalAvailableSubs.length === 0}
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-3.5 text-[13px] font-bold text-stone-900 outline-none disabled:opacity-50"
                  >
                    <option value="">(Ninguna)</option>
                    {modalAvailableSubs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[12px] font-bold text-stone-500 block mb-1">Precio Venta Unitario ($) *</label>
                  <input 
                    type="number" 
                    value={prodUnitPrice} 
                    onChange={(e) => setProdUnitPrice(e.target.value)}
                    placeholder="Ej. 3400"
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-3.5 text-[14px] font-bold text-stone-900 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[12px] font-bold text-stone-500 block mb-1">Costo Proveedor ($)</label>
                  <input 
                    type="number" 
                    value={prodCostPrice} 
                    onChange={(e) => setProdCostPrice(e.target.value)}
                    placeholder="Ej. 17000"
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-3.5 text-[14px] font-bold text-stone-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[12px] font-bold text-stone-500 block mb-1">Tipo de Unidad</label>
                  <select 
                    value={prodUnitName} 
                    onChange={(e) => setProdUnitName(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-3.5 text-[13px] font-bold text-stone-900 outline-none"
                  >
                    <option value="Unidad">Unidad</option>
                    <option value="Balón">Balón</option>
                    <option value="Bomba">Bomba</option>
                    <option value="Balde">Balde</option>
                    <option value="Paquete">Paquete</option>
                    <option value="Caja">Caja</option>
                  </select>
                </div>

                <div>
                  <label className="text-[12px] font-bold text-stone-500 block mb-1">SKU / Código</label>
                  <input 
                    type="text" 
                    value={prodSku} 
                    onChange={(e) => setProdSku(e.target.value)}
                    placeholder="Ej. BAL-GOR-01"
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-3.5 text-[13px] font-bold text-stone-900 outline-none uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-[12px] font-bold text-stone-500 block mb-1">Descripción</label>
                <input 
                  type="text" 
                  value={prodDesc} 
                  onChange={(e) => setProdDesc(e.target.value)}
                  placeholder="Detalles adicionales..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-3.5 text-[13px] font-medium text-stone-900 outline-none"
                />
              </div>

              <Button 
                onClick={handleSaveProduct}
                disabled={isCreatingProduct || isUpdatingProduct}
                className="w-full h-14 rounded-2xl font-black text-[15px] bg-[#FEE867] text-stone-950 hover:bg-[#FEE867]/90 mt-2"
              >
                {isCreatingProduct || isUpdatingProduct ? "Guardando..." : "Guardar Producto"}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

    </div>
  );
}
