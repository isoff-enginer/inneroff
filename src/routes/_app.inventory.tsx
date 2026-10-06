import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { 
  Search, 
  Plus, 
  X, 
  SlidersHorizontal, 
  Send, 
  ArrowRight, 
  Package, 
  Check, 
  Edit3 
} from "lucide-react";
import { CATALOG_PRODUCTS, type CatalogProduct } from "@/features/inventory/product-catalog";
import { ProductCard } from "@/features/inventory/components/ProductCard";
import { useInventoryData } from "@/features/inventory/use-inventory-data";
import { useSession } from "@/features/auth/session";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/inventory")({
  head: () => ({
    meta: [
      { title: "Catálogo de Productos · Reserva" },
      { name: "description", content: "Catálogo de productos Verde y Blanco con precios derivados y control de stock." }
    ],
  }),
  component: InventoryPage,
});

type CategoryFilter = "Todos" | "Verde" | "Blanco";

function InventoryPage() {
  const navigate = useNavigate();
  const { role } = useSession();
  const { inventory, categories, createProduct, updateProduct, isCreatingProduct, isUpdatingProduct } = useInventoryData();

  const isBoss = role === "boss" || role === "boss_admin" || role === "operations_admin";

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("Todos");
  
  // Selection state for Mockup 1 (Multi-select items to quote or dispatch)
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [selectedPresentations, setSelectedPresentations] = useState<Record<string, string>>({});

  // Add / Edit Product Drawer
  const [isAddEditDrawerOpen, setIsAddEditDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null);
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<"Verde" | "Blanco">("Verde");
  const [formPrice, setFormPrice] = useState("");
  const [formStock, setFormStock] = useState("");
  const [formDesc, setFormDesc] = useState("");

  // Map real database stock to CATALOG_PRODUCTS if available
  const productsWithStock = useMemo(() => {
    return CATALOG_PRODUCTS.map(catalogProd => {
      const dbItem = inventory.find(
        i => i.name.toLowerCase().includes(catalogProd.name.toLowerCase()) ||
             catalogProd.name.toLowerCase().includes(i.name.toLowerCase())
      );
      return {
        ...catalogProd,
        stock: dbItem ? dbItem.quantity : catalogProd.stock,
      };
    });
  }, [inventory]);

  // Filter products by category and search
  const filteredProducts = useMemo(() => {
    return productsWithStock.filter(prod => {
      if (search && !prod.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (selectedCategory !== "Todos" && prod.category !== selectedCategory) return false;
      return true;
    });
  }, [productsWithStock, search, selectedCategory]);

  // Toggle selection
  const handleToggleSelect = (product: CatalogProduct) => {
    const updated = new Set(selectedProductIds);
    if (updated.has(product.id)) {
      updated.delete(product.id);
    } else {
      updated.add(product.id);
    }
    setSelectedProductIds(updated);
  };

  const handleSelectPresentation = (productId: string, presentationName: string) => {
    setSelectedPresentations(prev => ({
      ...prev,
      [productId]: presentationName,
    }));
  };

  const handleOpenCreateProduct = () => {
    setEditingProduct(null);
    setFormName("");
    setFormCategory("Verde");
    setFormPrice("");
    setFormStock("20");
    setFormDesc("");
    setIsAddEditDrawerOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!formName.trim()) {
      toast.error("Ingresa un nombre para el producto");
      return;
    }

    try {
      if (editingProduct) {
        toast.success(`Producto ${formName} actualizado`);
      } else {
        const cat = categories.find(c => c.name.toLowerCase().includes(formCategory.toLowerCase())) || categories[0];
        await createProduct({
          name: formName,
          category_id: cat?.id || "",
          unit_value: Number(formPrice) || 0,
          description: formDesc,
        });
        toast.success(`Producto ${formName} creado exitosamente`);
      }
      setIsAddEditDrawerOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Error al guardar producto");
    }
  };

  // Quick Action Dispatch from selection
  const handleProceedToDispatch = () => {
    if (selectedProductIds.size === 0) {
      toast.info("Selecciona al menos un producto para despachar");
      return;
    }
    navigate({ to: "/dispatches" });
  };

  const selectedCount = selectedProductIds.size;

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-gray-900 pb-28 selection:bg-amber-200">
      <div className="mx-auto max-w-md px-5 pt-4 space-y-4">
        
        {/* TOP BAR / TITLE */}
        <header className="flex items-center justify-between pt-1">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
              Items
            </h1>
            <span className="text-xs text-gray-500 font-medium">
              Catálogo oficial de productos & derivados
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-2xs">
              {filteredProducts.length} productos
            </span>
          </div>
        </header>

        {/* SEARCH BAR & FILTER BUTTON */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar productos, unidades..."
              className="w-full bg-white pl-10 pr-9 py-2.5 rounded-2xl border border-gray-200 text-sm font-medium outline-none focus:border-black transition-colors shadow-2xs placeholder:text-gray-400"
            />
            {search && (
              <button 
                onClick={() => setSearch("")} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white border border-gray-200 shadow-2xs text-gray-700 hover:border-gray-300 transition-colors"
          >
            <SlidersHorizontal className="size-4" />
          </button>
        </div>

        {/* CATEGORY SELECTOR PILLS (Mockup 1) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {(["Todos", "Verde", "Blanco"] as CategoryFilter[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                selectedCategory === cat
                  ? "bg-black text-white shadow-xs"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 2-COLUMN PRODUCT GRID (Mockup 1 Exact Style) */}
        {filteredProducts.length === 0 ? (
          <div className="py-20 text-center text-gray-400 flex flex-col items-center">
            <Package className="size-12 mb-2 opacity-30" />
            <p className="text-sm font-medium">No se encontraron productos con esos filtros.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5 pt-1">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isSelected={selectedProductIds.has(product.id)}
                onToggleSelect={handleToggleSelect}
                selectedPresentation={selectedPresentations[product.id] || product.presentations[0].name}
                onSelectPresentation={(presName) => handleSelectPresentation(product.id, presName)}
              />
            ))}
          </div>
        )}
      </div>

      {/* STICKY BOTTOM FLOATING ACTION BAR (Mockup 1) */}
      <aside aria-label="Acciones de catálogo" className="fixed bottom-16 inset-x-0 mx-auto max-w-md px-5 z-40">
        <div className="flex items-center gap-3">
          {/* Yellow Round '+' Button */}
          {isBoss && (
            <button
              onClick={handleOpenCreateProduct}
              className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#FEF08A] hover:bg-amber-300 border border-amber-300 shadow-lg text-black active:scale-95 transition-transform"
              title="Añadir nuevo producto"
            >
              <Plus className="size-6 stroke-[2.5]" />
            </button>
          )}

          {/* Wide Black Pill Button */}
          <button
            onClick={handleProceedToDispatch}
            className="flex-1 h-14 bg-black hover:bg-gray-900 text-white font-black rounded-full px-6 flex items-center justify-between shadow-xl active:scale-[0.98] transition-transform"
          >
            <span className="text-sm tracking-wide">
              {selectedCount > 0 ? `Despachar (${selectedCount})` : "Crear despacho"}
            </span>
            <ArrowRight className="size-5 stroke-[2.5]" />
          </button>
        </div>
      </aside>

      {/* DRAWER: NUEVO / EDITAR PRODUCTO */}
      <Drawer open={isAddEditDrawerOpen} onOpenChange={setIsAddEditDrawerOpen}>
        <DrawerContent className="bg-white border-t-0 px-5 pb-8">
          <div className="flex flex-col max-h-[85vh]">
            <div className="py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900">
                {editingProduct ? "Editar Producto" : "Nuevo Producto en Catálogo"}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 scrollbar-hide">
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase block mb-1">Nombre del producto *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej. Gordos, Mamitas, Tornillos..."
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase block mb-1">Categoría</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormCategory("Verde")}
                    className={`p-3 rounded-xl font-bold text-xs border transition-all ${
                      formCategory === "Verde" ? "bg-black text-white border-black" : "bg-gray-50 text-gray-700 border-gray-200"
                    }`}
                  >
                    Verde
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormCategory("Blanco")}
                    className={`p-3 rounded-xl font-bold text-xs border transition-all ${
                      formCategory === "Blanco" ? "bg-black text-white border-black" : "bg-gray-50 text-gray-700 border-gray-200"
                    }`}
                  >
                    Blanco
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase block mb-1">Precio Unitario Base ($ COP)</label>
                <input
                  type="number"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="Ej. 3400"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase block mb-1">Stock Inicial</label>
                <input
                  type="number"
                  value={formStock}
                  onChange={(e) => setFormStock(e.target.value)}
                  placeholder="Ej. 25"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase block mb-1">Descripción</label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Detalles sobre presentación y empaque"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none resize-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={handleSaveProduct}
                disabled={isCreatingProduct || isUpdatingProduct}
                className="w-full h-12 rounded-xl font-bold text-sm bg-black text-white"
              >
                {isCreatingProduct ? "Guardando..." : "Guardar Producto"}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
