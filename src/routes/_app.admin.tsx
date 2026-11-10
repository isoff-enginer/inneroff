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
  X, 
  Sparkles,
  Layers
} from "lucide-react";
import { useInventoryData } from "@/features/inventory/use-inventory-data";
import { formatCurrency } from "@/lib/format";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSession } from "@/features/auth/session";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_app/admin")({
  head: () => ({
    meta: [{ title: "Administración · Catálogo & Categorías" }],
  }),
  component: AdminPage,
});

type AdminTab = "products" | "categories" | "subcategories";

function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { role } = useSession();
  const {
    allProducts,
    categories,
    subcategories,
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

  const modalAvailableSubs = useMemo(() => {
    if (!prodCatId) return [];
    return subcategories.filter(s => s.parentId === prodCatId || s.parent_id === prodCatId);
  }, [subcategories, prodCatId]);

  const handleOpenCreateCategory = () => {
    setEditingCatId(null);
    setCatName("");
    setCatDesc("");
    setCatParentId(null);
    setIsSubcategoryMode(false);
    setIsCatModalOpen(true);
  };

  const handleOpenCreateSubcategory = (parentId?: string) => {
    setEditingCatId(null);
    setCatName("");
    setCatDesc("");
    setCatParentId(parentId || categories[0]?.id || null);
    setIsSubcategoryMode(true);
    setIsCatModalOpen(true);
  };

  const handleOpenEditCategory = (cat: any) => {
    setEditingCatId(cat.id);
    setCatName(cat.name);
    setCatDesc(cat.description || "");
    setCatParentId(cat.parentId || cat.parent_id || null);
    setIsSubcategoryMode(!!(cat.parentId || cat.parent_id));
    setIsCatModalOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!catName.trim()) {
      toast.error("El nombre no puede estar vacío");
      return;
    }

    try {
      if (editingCatId) {
        await updateCategory({
          id: editingCatId,
          name: catName.trim(),
          description: catDesc.trim() || null,
          parent_id: isSubcategoryMode ? catParentId : null,
        });
        toast.success("Categoría actualizada con éxito");
      } else {
        await createCategory({
          name: catName.trim(),
          description: catDesc.trim() || null,
          parent_id: isSubcategoryMode ? catParentId : null,
        });
        toast.success("Categoría creada con éxito");
      }
      setIsCatModalOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Error al guardar categoría");
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar la categoría "${name}"?`)) return;
    try {
      await deleteCategory(id);
      toast.success("Categoría eliminada con éxito");
    } catch (e: any) {
      toast.error(e.message || "Error al eliminar categoría");
    }
  };

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

  const handleSaveProduct = async () => {
    if (!prodName.trim()) {
      toast.error("El nombre del producto es requerido");
      return;
    }
    if (!prodCatId) {
      toast.error("Debes seleccionar una categoría");
      return;
    }

    try {
      if (editingProdId) {
        await updateProduct({
          id: editingProdId,
          name: prodName.trim(),
          category_id: prodCatId,
          subcategory_id: prodSubcatId || null,
          unit_value: Number(prodUnitPrice) || 0,
          cost_value: Number(prodCostPrice) || 0,
          unit_name: prodUnitName,
          sku: prodSku.trim() || undefined,
          description: prodDesc.trim() || undefined,
        });
        toast.success("Producto actualizado");
      } else {
        await createProduct({
          name: prodName.trim(),
          category_id: prodCatId,
          subcategory_id: prodSubcatId || null,
          unit_value: Number(prodUnitPrice) || 0,
          cost_value: Number(prodCostPrice) || 0,
          unit_name: prodUnitName,
          sku: prodSku.trim() || undefined,
          description: prodDesc.trim() || undefined,
        });
        toast.success("Producto creado exitosamente");
      }
      setIsProdModalOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Error al guardar producto");
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar el producto "${name}" del catálogo?`)) return;
    try {
      await deleteProduct(id);
      toast.success("Producto eliminado del catálogo");
    } catch (e: any) {
      toast.error(e.message || "Error al eliminar producto");
    }
  };

  const handleSeedInitialCatalog = async () => {
    if (!confirm("¿Deseas depurar duplicados y sincronizar los 9 productos exactos (Blanco, Verde, Productos adicionales a $8.000) y las tiendas Centro y La Usa?")) return;

    try {
      toast.info("Depurando duplicados y sincronizando catálogo...");
      
      // 1. Obtener categorías principales
      const { data: allCats } = await supabase.from("product_categories").select("id, name");
      let catBlancoId = (allCats || []).find(c => c.name.toLowerCase() === "blanco")?.id;
      let catVerdeId = (allCats || []).find(c => c.name.toLowerCase() === "verde")?.id;
      let catAdicId = (allCats || []).find(c => c.name.toLowerCase().includes("adicional"))?.id;

      if (!catBlancoId) {
        const { data: cb } = await supabase.from("product_categories").insert({ name: "Blanco", description: "Categoría Blanco", is_active: true }).select("id").single();
        catBlancoId = cb?.id;
      }
      if (!catVerdeId) {
        const { data: cv } = await supabase.from("product_categories").insert({ name: "Verde", description: "Categoría Verde", is_active: true }).select("id").single();
        catVerdeId = cv?.id;
      }
      if (!catAdicId) {
        const { data: ca } = await supabase.from("product_categories").insert({ name: "Productos adicionales", description: "Categoría Productos adicionales", is_active: true }).select("id").single();
        catAdicId = ca?.id;
      }

      // 2. Traer todos los productos actuales
      const { data: prods } = await supabase.from("products").select("id, name, category_id, is_active");

      // 3. Normalizar y resolver duplicados
      for (const p of (prods || [])) {
        const n = p.name.trim().toLowerCase();

        // Si es Balde o Baldes
        if (n === "balde" || n === "baldes") {
          await supabase.from("products").update({
            name: "Baldes",
            category_id: catAdicId,
            unit_value: 8000,
            unit_name: "Unidad",
            is_active: true,
          }).eq("id", p.id);
        }
        // Si es Gordos o Lisos
        else if (n === "gordo" || n === "gordos" || n === "liso" || n === "lisos") {
          await supabase.from("products").update({
            name: "Lisos",
            category_id: catVerdeId,
            unit_value: 3400,
            unit_name: "Unidad",
            is_active: true,
          }).eq("id", p.id);
        }
        // Si es Mamita o Mamitas
        else if (n === "mamita" || n === "mamitas") {
          await supabase.from("products").update({
            name: "Mamitas",
            category_id: catBlancoId,
            unit_value: 4400,
            unit_name: "Unidad",
            is_active: true,
          }).eq("id", p.id);
        }
        // Si es Tornillo o Tornillos
        else if (n === "tornillo" || n === "tornillos") {
          await supabase.from("products").update({
            name: "Tornillo",
            category_id: catBlancoId,
            unit_value: 5142,
            unit_name: "Unidad",
            is_active: true,
          }).eq("id", p.id);
        }
        // Si es Largos
        else if (n === "largo" || n === "largos") {
          await supabase.from("products").update({
            name: "Largos",
            category_id: catVerdeId,
            unit_value: 4000,
            unit_name: "Unidad",
            is_active: true,
          }).eq("id", p.id);
        }
        // Si es Minis
        else if (n === "mini" || n === "minis") {
          await supabase.from("products").update({
            name: "Minis",
            category_id: catVerdeId,
            unit_value: 1571,
            unit_name: "Unidad",
            is_active: true,
          }).eq("id", p.id);
        }
        // Si es Rojas
        else if (n === "roja" || n === "rojas" || n === "baldes rojas") {
          await supabase.from("products").update({
            name: "Rojas",
            category_id: catAdicId,
            unit_value: 8000,
            unit_name: "Unidad",
            is_active: true,
          }).eq("id", p.id);
        }
        // Si es Flores
        else if (n === "flor" || n === "flores") {
          await supabase.from("products").update({
            name: "Flores",
            category_id: catAdicId,
            unit_value: 8000,
            unit_name: "Unidad",
            is_active: true,
          }).eq("id", p.id);
        }
        // Si es Pre-roll
        else if (n.includes("roll")) {
          await supabase.from("products").update({
            name: "Pre-roll",
            category_id: catAdicId,
            unit_value: 8000,
            unit_name: "Unidad",
            is_active: true,
          }).eq("id", p.id);
        }
      }

      // Asegurar que existan los 9 productos canónicos si no existían:
      const { data: updatedProds } = await supabase.from("products").select("id, name");
      const namesSet = new Set((updatedProds || []).map(p => p.name.trim().toLowerCase()));

      const ensureCanonical = async (name: string, catId: string, price: number, sku: string) => {
        if (!namesSet.has(name.toLowerCase())) {
          await supabase.from("products").insert({
            name,
            category_id: catId,
            unit_value: price,
            cost_value: 0,
            sku,
            unit_name: "Unidad",
            is_active: true,
          });
        }
      };

      if (catBlancoId) {
        await ensureCanonical("Mamitas", catBlancoId, 4400, "BLA-MAM-01");
        await ensureCanonical("Tornillo", catBlancoId, 5142, "BLA-TOR-01");
      }
      if (catVerdeId) {
        await ensureCanonical("Lisos", catVerdeId, 3400, "VER-LIS-01");
        await ensureCanonical("Largos", catVerdeId, 4000, "VER-LAR-01");
        await ensureCanonical("Minis", catVerdeId, 1571, "VER-MIN-01");
      }
      if (catAdicId) {
        await ensureCanonical("Baldes", catAdicId, 8000, "ADI-BAL-01");
        await ensureCanonical("Rojas", catAdicId, 8000, "ADI-ROJ-01");
        await ensureCanonical("Flores", catAdicId, 8000, "ADI-FLO-01");
        await ensureCanonical("Pre-roll", catAdicId, 8000, "ADI-PRE-01");
      }

      // Desactivar duplicados si hay más de 1 producto con el mismo nombre
      const { data: finalProds } = await supabase.from("products").select("id, name").eq("is_active", true);
      const seenNames = new Set<string>();
      for (const fp of (finalProds || [])) {
        const lower = fp.name.trim().toLowerCase();
        if (seenNames.has(lower)) {
          await supabase.from("products").update({ is_active: false }).eq("id", fp.id);
        } else {
          seenNames.add(lower);
        }
      }

      // 4. Asegurar tiendas únicas: Centro y La Usa
      const { data: existingStores } = await supabase.from("stores").select("id, name");
      const hasCentro = (existingStores || []).some((s: any) => s.name?.toLowerCase() === "centro");
      const hasLaUsa = (existingStores || []).some((s: any) => s.name?.toLowerCase().includes("usa"));

      if (!hasCentro) {
        await supabase.from("stores").insert({
          name: "Centro",
          code: "STR-CEN-01",
          status: "active",
          notes: "Tienda Centro"
        });
      }
      if (!hasLaUsa) {
        await supabase.from("stores").insert({
          name: "La Usa",
          code: "STR-USA-01",
          status: "active",
          notes: "Tienda La Usa"
        });
      }

      // Inactivar tiendas diferentes de Centro y La Usa
      await supabase.from("stores").update({ status: "inactive" }).not("name", "ilike", "%centro%").not("name", "ilike", "%usa%");

      queryClient.invalidateQueries({ queryKey: ["product_categories_hierarchical"] });
      queryClient.invalidateQueries({ queryKey: ["all_products_catalog"] });
      queryClient.invalidateQueries({ queryKey: ["inventory_balances"] });
      queryClient.invalidateQueries({ queryKey: ["sales_stores_list"] });
      queryClient.invalidateQueries({ queryKey: ["operational_locations"] });
      queryClient.invalidateQueries({ queryKey: ["live_dispatches"] });
      toast.success("¡Catálogo y tiendas depurados! Quedaron únicamente los 9 productos oficiales y las tiendas Centro y La Usa.");
    } catch (e: any) {
      toast.error(e.message || "Error al inicializar");
    }
  };

  const handleClearFictitiousSales = async () => {
    if (!confirm("¿Deseas realizar una LIMPIEZA TOTAL? Se eliminarán todos los despachos ficticios, ventas/recaudos de prueba, se inactivará Tienda Prueba y se dejarán únicamente las tiendas oficiales Centro y La Usa.")) return;

    try {
      toast.info("Limpiando despachos, ventas y tienda de prueba...");

      // 1. Borrar items de despacho y despachos de prueba
      try {
        await supabase.from("dispatch_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        await supabase.from("dispatches").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      } catch (dispErr) {
        console.warn("Could not wipe dispatches:", dispErr);
      }

      // 2. Borrar pagos y asientos ficticios
      try {
        await supabase.from("payment_allocations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      } catch (paErr) {
        console.warn("Could not wipe payment_allocations:", paErr);
      }
      await supabase.from("payments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("account_entries").delete().eq("entry_type", "income");

      // 3. Inactivar Tienda Prueba y cualquier sede que no sea Centro ni La Usa
      await supabase
        .from("stores")
        .update({ status: "inactive" })
        .not("name", "ilike", "%centro%")
        .not("name", "ilike", "%usa%");

      // 4. Asegurar que Centro y La Usa estén activas
      await supabase.from("stores").update({ status: "active" }).ilike("name", "%centro%");
      await supabase.from("stores").update({ status: "active" }).ilike("name", "%usa%");

      queryClient.invalidateQueries({ queryKey: ["boss-dashboard-sales-30d"] });
      queryClient.invalidateQueries({ queryKey: ["boss-dashboard-payments-30d"] });
      queryClient.invalidateQueries({ queryKey: ["live_payments"] });
      queryClient.invalidateQueries({ queryKey: ["store_dispatches_total"] });
      queryClient.invalidateQueries({ queryKey: ["live_dispatches"] });
      queryClient.invalidateQueries({ queryKey: ["sales_stores_list"] });
      queryClient.invalidateQueries({ queryKey: ["operational_locations"] });

      toast.success("¡Limpieza total completada! Despachos borrados, Tienda Prueba desactivada y dashboard reiniciado a $0.");
    } catch (e: any) {
      toast.error(e.message || "Error al borrar datos de prueba");
    }
  };

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

          <div className="flex flex-col items-center">
            <h1 className="text-lg font-black tracking-tight text-slate-950">
              Panel Administrativo
            </h1>
            <span className="text-[11px] font-bold text-slate-400">Catálogo & Categorías</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button 
              onClick={handleClearFictitiousSales}
              className="flex size-10 items-center justify-center rounded-full bg-rose-50 border border-rose-200 shadow-xs text-rose-600 active:scale-95 transition-transform"
              title="Borrar ventas ficticias (Reiniciar a $0)"
            >
              <Trash2 className="size-4" />
            </button>

            <button 
              onClick={handleSeedInitialCatalog}
              className="flex size-10 items-center justify-center rounded-full bg-white border border-slate-200/80 shadow-xs text-slate-700 active:scale-95 transition-transform"
              title="Inicializar Blanco, Verde y Productos adicionales"
            >
              <Sparkles className="size-4 text-slate-800" />
            </button>
          </div>
        </header>

        {/* TABS SELECTOR */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <button
            onClick={() => setActiveTab("products")}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-black transition-all ${
              activeTab === "products" 
                ? "bg-slate-900 text-white shadow-xs" 
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Package className="size-4" />
            <span>Productos</span>
          </button>

          <button
            onClick={() => setActiveTab("categories")}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-black transition-all ${
              activeTab === "categories" 
                ? "bg-slate-900 text-white shadow-xs" 
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Folder className="size-4" />
            <span>Categorías</span>
          </button>

          <button
            onClick={() => setActiveTab("subcategories")}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-black transition-all ${
              activeTab === "subcategories" 
                ? "bg-slate-900 text-white shadow-xs" 
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <FolderTree className="size-4" />
            <span>Subcategorías</span>
          </button>
        </div>

        {/* TAB 1: PRODUCTOS */}
        {activeTab === "products" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  className="block w-full pl-4 pr-10 py-3 rounded-2xl bg-white border border-slate-200/80 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-900 shadow-xs"
                  placeholder="Buscar producto..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
                    <X className="size-4" />
                  </button>
                )}
              </div>

              <Button
                onClick={handleOpenCreateProduct}
                className="h-12 px-4 rounded-2xl bg-slate-900 text-white font-black text-[13px] hover:bg-slate-800 shadow-sm shrink-0"
              >
                <Plus className="size-4 mr-1 stroke-[3]" /> Crear
              </Button>
            </div>

            {/* Filter Pills by Category */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button 
                onClick={() => setFilterCatId("all")}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-[12px] font-bold transition-colors ${filterCatId === "all" ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
              >
                Todos ({allProducts.length})
              </button>
              {categories.map((c) => (
                <button 
                  key={c.id}
                  onClick={() => setFilterCatId(c.id)}
                  className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-[12px] font-bold transition-colors ${filterCatId === c.id ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white/60 rounded-[24px] animate-pulse" />)}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white rounded-[32px] border border-slate-200/80 p-6">
                <Package className="size-12 mb-3 opacity-30" />
                <p className="text-[15px] font-bold text-slate-700">Sin productos registrados</p>
                <Button 
                  onClick={handleOpenCreateProduct} 
                  className="mt-4 bg-slate-900 text-white font-black rounded-xl text-xs h-10 px-4 hover:bg-slate-800"
                >
                  Crear Producto Ahora
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredProducts.map((p: any) => (
                  <div 
                    key={p.id}
                    className="p-4 rounded-[26px] bg-white border border-slate-200/80 shadow-xs flex items-center justify-between"
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-black text-slate-950">{p.name}</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 border border-slate-200 text-slate-700 uppercase">
                          {p.product_categories?.name || "General"}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[12px] font-bold text-slate-600 mt-1">
                        <span className="text-slate-900">Venta: {formatCurrency(p.unit_value || 0)}</span>
                        {p.cost_value > 0 && (
                          <span className="text-slate-400 font-medium">Costo: {formatCurrency(p.cost_value)}</span>
                        )}
                        <span className="text-slate-400 text-[11px] font-medium">{p.unit_name || "unid"}</span>
                      </div>

                      {p.sku && (
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5">SKU: {p.sku}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => handleOpenEditProduct(p)}
                        className="size-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 active:scale-95"
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

        {/* TAB 2: CATEGORÍAS PRINCIPALES */}
        {activeTab === "categories" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-black text-slate-950">Categorías Principales</h2>
                <p className="text-[12px] text-slate-500">Blanco, Verde y Productos adicionales</p>
              </div>

              <Button
                onClick={handleOpenCreateCategory}
                className="h-11 px-4 rounded-2xl bg-slate-900 text-white font-black text-[13px] hover:bg-slate-800 shadow-sm"
              >
                <Plus className="size-4 mr-1 stroke-[3]" /> Nueva Categoría
              </Button>
            </div>

            {categories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-[32px] border border-slate-200/80 p-6 text-slate-400">
                <Folder className="size-12 mb-3 opacity-30" />
                <p className="text-[15px] font-bold text-slate-700">Sin categorías creadas</p>
                <Button 
                  onClick={handleOpenCreateCategory} 
                  className="mt-4 bg-slate-900 text-white font-black rounded-xl text-xs h-10 px-4"
                >
                  Crear Categoría
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {categories.map((c) => (
                  <div 
                    key={c.id}
                    className="p-4 rounded-[26px] bg-white border border-slate-200/80 shadow-xs flex items-center justify-between"
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <Folder className="size-4 text-slate-700" />
                        <span className="text-[16px] font-black text-slate-950">{c.name}</span>
                      </div>
                      {c.description && (
                        <span className="text-[12px] text-slate-500 mt-0.5">{c.description}</span>
                      )}
                      <span className="text-[11px] font-bold text-slate-400 mt-1">
                        {(c.subcategories || []).length} subcategorías • {c.productCount || 0} productos
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => handleOpenCreateSubcategory(c.id)}
                        className="size-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 hover:bg-slate-200 active:scale-95"
                        title="Añadir Subcategoría a esta categoría"
                      >
                        <Plus className="size-4" />
                      </button>

                      <button 
                        onClick={() => handleOpenEditCategory(c)}
                        className="size-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 active:scale-95"
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

        {/* TAB 3: SUBCATEGORÍAS */}
        {activeTab === "subcategories" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-black text-slate-950">Subcategorías</h2>
                <p className="text-[12px] text-slate-500">Mamitas, Tornillo, Lisos, Largos, Minis, etc.</p>
              </div>

              <Button
                onClick={() => handleOpenCreateSubcategory()}
                className="h-11 px-4 rounded-2xl bg-slate-900 text-white font-black text-[13px] hover:bg-slate-800 shadow-sm"
              >
                <Plus className="size-4 mr-1 stroke-[3]" /> Nueva Subcategoría
              </Button>
            </div>

            {subcategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-[32px] border border-slate-200/80 p-6 text-slate-400">
                <FolderTree className="size-12 mb-3 opacity-30" />
                <p className="text-[15px] font-bold text-slate-700">Sin subcategorías creadas</p>
                <Button 
                  onClick={() => handleOpenCreateSubcategory()} 
                  className="mt-4 bg-slate-900 text-white font-black rounded-xl text-xs h-10 px-4"
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
                      className="p-4 rounded-[26px] bg-white border border-slate-200/80 shadow-xs flex items-center justify-between"
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-[15px] font-black text-slate-950">{s.name}</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 text-slate-800 border border-slate-200 uppercase">
                            Padre: {parentName}
                          </span>
                        </div>
                        {s.description && (
                          <span className="text-[12px] text-slate-500 mt-0.5">{s.description}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => handleOpenEditCategory(s)}
                          className="size-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 active:scale-95"
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
            <div className="py-3 border-b border-slate-100 mb-3 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900">
                {editingCatId ? "Editar" : "Crear"} {isSubcategoryMode ? "Subcategoría" : "Categoría"}
              </h2>
              <button onClick={() => setIsCatModalOpen(false)} className="text-slate-400">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              {isSubcategoryMode && (
                <div>
                  <label className="text-[12px] font-bold text-slate-500 block mb-1">Categoría Principal Padre *</label>
                  <select 
                    value={catParentId || ""} 
                    onChange={(e) => setCatParentId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-[14px] font-bold text-slate-900 outline-none"
                  >
                    <option value="">Selecciona categoría principal</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[12px] font-bold text-slate-500 block mb-1">Nombre *</label>
                <input 
                  type="text" 
                  value={catName} 
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder={isSubcategoryMode ? "Ej. Mamitas, Tornillo, Lisos..." : "Ej. Blanco, Verde, Productos adicionales..."}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-[14px] font-bold text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="text-[12px] font-bold text-slate-500 block mb-1">Descripción (Opcional)</label>
                <input 
                  type="text" 
                  value={catDesc} 
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Descripción corta..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-[14px] font-medium text-slate-900 outline-none"
                />
              </div>

              <Button 
                onClick={handleSaveCategory}
                disabled={isCreatingCategory || isUpdatingCategory}
                className="w-full h-14 rounded-2xl font-black text-[15px] bg-slate-900 text-white hover:bg-slate-800 mt-2"
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
            <div className="py-3 border-b border-slate-100 mb-3 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900">
                {editingProdId ? "Editar Producto" : "Nuevo Producto"}
              </h2>
              <button onClick={() => setIsProdModalOpen(false)} className="text-slate-400">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[12px] font-bold text-slate-500 block mb-1">Nombre del Producto *</label>
                <input 
                  type="text" 
                  value={prodName} 
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="Ej. Mamitas, Tornillo, Lisos..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-[14px] font-bold text-slate-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[12px] font-bold text-slate-500 block mb-1">Categoría Principal *</label>
                  <select 
                    value={prodCatId} 
                    onChange={(e) => {
                      setProdCatId(e.target.value);
                      setProdSubcatId("");
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-[13px] font-bold text-slate-900 outline-none"
                  >
                    <option value="">Seleccionar</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[12px] font-bold text-slate-500 block mb-1">Subcategoría</label>
                  <select 
                    value={prodSubcatId} 
                    onChange={(e) => setProdSubcatId(e.target.value)}
                    disabled={modalAvailableSubs.length === 0}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-[13px] font-bold text-slate-900 outline-none disabled:opacity-50"
                  >
                    <option value="">(Ninguna)</option>
                    {modalAvailableSubs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[12px] font-bold text-slate-500 block mb-1">Precio Venta Unitario ($) *</label>
                  <input 
                    type="number" 
                    value={prodUnitPrice} 
                    onChange={(e) => setProdUnitPrice(e.target.value)}
                    placeholder="Ej. 3400"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-[14px] font-bold text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[12px] font-bold text-slate-500 block mb-1">Costo Proveedor ($)</label>
                  <input 
                    type="number" 
                    value={prodCostPrice} 
                    onChange={(e) => setProdCostPrice(e.target.value)}
                    placeholder="Ej. 17000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-[14px] font-bold text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[12px] font-bold text-slate-500 block mb-1">Tipo de Unidad</label>
                  <select 
                    value={prodUnitName} 
                    onChange={(e) => setProdUnitName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-[13px] font-bold text-slate-900 outline-none"
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
                  <label className="text-[12px] font-bold text-slate-500 block mb-1">SKU / Código</label>
                  <input 
                    type="text" 
                    value={prodSku} 
                    onChange={(e) => setProdSku(e.target.value)}
                    placeholder="Ej. VER-LIS-01"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-[13px] font-bold text-slate-900 outline-none uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-[12px] font-bold text-slate-500 block mb-1">Descripción</label>
                <input 
                  type="text" 
                  value={prodDesc} 
                  onChange={(e) => setProdDesc(e.target.value)}
                  placeholder="Detalles adicionales..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-[13px] font-medium text-slate-900 outline-none"
                />
              </div>

              <Button 
                onClick={handleSaveProduct}
                disabled={isCreatingProduct || isUpdatingProduct}
                className="w-full h-14 rounded-2xl font-black text-[15px] bg-slate-900 text-white hover:bg-slate-800 mt-2"
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
