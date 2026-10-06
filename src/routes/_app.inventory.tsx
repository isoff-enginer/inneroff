import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { 
  Search, 
  Plus, 
  X, 
  SlidersHorizontal, 
  ArrowRight, 
  Package
} from "lucide-react";
import { CATALOG_PRODUCTS, type CatalogProduct } from "@/features/inventory/product-catalog";
import { ProductCard } from "@/features/inventory/components/ProductCard";
import { useInventoryData } from "@/features/inventory/use-inventory-data";
import { useSession } from "@/features/auth/session";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
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
  
  // Selection state for multi-select quote / dispatch
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
    <div className="min-h-screen bg-[#231934] text-white pb-28 selection:bg-[#246bfd]/30">
      <div className="mx-auto max-w-md px-5 pt-4 space-y-4">
        
        {/* TOP BAR / TITLE */}
        <header className="flex items-center justify-between pt-1">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Catálogo
            </h1>
            <span className="text-xs text-[#a497be] font-medium">
              Productos Verde y Blanco con precios derivados
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#d3cbe2] bg-[#2d2244] px-3 py-1.5 rounded-full border border-white/10 shadow-sm">
              {filteredProducts.length} productos
            </span>
          </div>
        </header>

        {/* SEARCH BAR & FILTER BUTTON */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#a497be]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar productos, unidades..."
              className="w-full bg-[#2d2244] pl-10 pr-9 py-2.5 rounded-2xl border border-white/10 text-sm text-white font-medium outline-none focus:border-[#246bfd] transition-colors shadow-sm placeholder:text-[#a497be]"
            />
            {search && (
              <button 
                onClick={() => setSearch("")} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a497be] hover:text-white"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#2d2244] border border-white/10 shadow-sm text-[#d3cbe2] hover:border-white/20 transition-colors"
          >
            <SlidersHorizontal className="size-4" />
          </button>
        </div>

        {/* CATEGORY SELECTOR PILLS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {(["Todos", "Verde", "Blanco"] as CategoryFilter[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                selectedCategory === cat
                  ? "bg-[#246bfd] text-white shadow-md shadow-[#246bfd]/30"
                  : "bg-[#2d2244] text-[#a497be] border border-white/10 hover:border-white/20"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 2-COLUMN PRODUCT GRID */}
        {filteredProducts.length === 0 ? (
          <div className="py-20 text-center text-[#a497be] flex flex-col items-center">
            <Package className="size-12 mb-2 opacity-30 text-[#246bfd]" />
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

      {/* STICKY BOTTOM FLOATING ACTION BAR */}
      <aside aria-label="Acciones de catálogo" className="fixed bottom-16 inset-x-0 mx-auto max-w-md px-5 z-40">
        <div className="flex items-center gap-3">
          {/* Add '+' Button */}
          {isBoss && (
            <button
              onClick={handleOpenCreateProduct}
              className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#f79193] hover:bg-[#e67e80] shadow-lg shadow-[#f79193]/30 text-[#231934] active:scale-95 transition-transform font-bold"
              title="Añadir nuevo producto"
            >
              <Plus className="size-6 stroke-[2.5]" />
            </button>
          )}

          {/* Wide Action Pill Button */}
          <button
            onClick={handleProceedToDispatch}
            className="flex-1 h-14 bg-[#246bfd] hover:bg-[#1a4ec8] text-white font-black rounded-full px-6 flex items-center justify-between shadow-xl shadow-[#246bfd]/40 active:scale-[0.98] transition-transform"
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
        <DrawerContent className="bg-[#231934] border-t border-white/10 px-5 pb-8 text-white">
          <div className="flex flex-col max-h-[85vh]">
            <div className="py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-xl font-black text-white">
                {editingProduct ? "Editar Producto" : "Nuevo Producto en Catálogo"}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 scrollbar-hide">
              <div>
                <label className="text-[11px] font-bold text-[#a497be] uppercase block mb-1">Nombre del producto *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej. Gordos, Mamitas, Tornillos..."
                  className="w-full p-3.5 bg-[#2d2244] border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:border-[#246bfd]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#a497be] uppercase block mb-1">Categoría</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormCategory("Verde")}
                    className={`p-3 rounded-2xl font-bold text-xs border transition-all ${
                      formCategory === "Verde" ? "bg-[#8ec97b] text-[#14280f] border-[#8ec97b]" : "bg-[#2d2244] text-white border-white/10"
                    }`}
                  >
                    Verde
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormCategory("Blanco")}
                    className={`p-3 rounded-2xl font-bold text-xs border transition-all ${
                      formCategory === "Blanco" ? "bg-[#f79193] text-[#231934] border-[#f79193]" : "bg-[#2d2244] text-white border-white/10"
                    }`}
                  >
                    Blanco
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#a497be] uppercase block mb-1">Precio Unitario Base ($ COP)</label>
                <input
                  type="number"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="Ej. 3400"
                  className="w-full p-3.5 bg-[#2d2244] border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:border-[#246bfd]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#a497be] uppercase block mb-1">Stock Inicial</label>
                <input
                  type="number"
                  value={formStock}
                  onChange={(e) => setFormStock(e.target.value)}
                  placeholder="Ej. 25"
                  className="w-full p-3.5 bg-[#2d2244] border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:border-[#246bfd]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#a497be] uppercase block mb-1">Descripción</label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Detalles sobre presentación y empaque"
                  className="w-full p-3 bg-[#2d2244] border border-white/10 rounded-2xl text-sm text-white outline-none resize-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={handleSaveProduct}
                disabled={isCreatingProduct || isUpdatingProduct}
                className="w-full h-12 rounded-2xl font-black text-sm bg-[#246bfd] hover:bg-[#1a4ec8] text-white shadow-lg shadow-[#246bfd]/30"
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
