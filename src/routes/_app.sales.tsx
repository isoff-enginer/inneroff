import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { 
  ChevronLeft, 
  Search, 
  X, 
  CircleDollarSign, 
  Plus, 
  Minus,
  Wallet
} from "lucide-react";

import { formatCurrency } from "@/lib/format";
import { useSalesData } from "@/features/sales/use-sales-data";
import { useInventoryData } from "@/features/inventory/use-inventory-data";
import { getProductPackagings } from "@/features/inventory/product-presentations";
import { useProductLiquidation } from "@/features/sales/use-product-liquidation";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/sales")({
  head: () => ({
    meta: [
      { title: "Ventas & Recaudos · Operaciones" },
    ],
  }),
  component: SalesPage,
});

function SalesPage() {
  const navigate = useNavigate();
  const { 
    payments, 
    stores, 
    categories, 
    totalRecaudado, 
    totalFaltante, 
    isLoading, 
    createPayment, 
    isCreatingPayment 
  } = useSalesData();
  const { allProducts } = useInventoryData();
  const { consolidation, liquidationMap, triggerCompletedSaleNotification } = useProductLiquidation();

  const [query, setQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("todos");
  
  // Recaudo Drawer State
  const [isNewRecaudoOpen, setIsNewRecaudoOpen] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [recaudoMode, setRecaudoMode] = useState<"category" | "product">("category");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedProdId, setSelectedProdId] = useState("");
  const [selectedPkgId, setSelectedPkgId] = useState("");
  const [pkgCount, setPkgCount] = useState(1);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const filteredPayments = useMemo(() => {
    return payments.filter((row) => {
      const matchesText = `${row.storeName} ${row.operatorName} ${row.categoryName} ${row.paymentNumber}`
        .toLowerCase()
        .includes(query.trim().toLowerCase());
      if (!matchesText) return false;
      if (filterCategory !== "todos" && row.categoryId !== filterCategory && row.categoryName.toLowerCase() !== filterCategory.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [payments, query, filterCategory]);

  const handleSelectProduct = (prodId: string) => {
    setSelectedProdId(prodId);
    const prod = allProducts.find(p => p.id === prodId);
    if (prod) {
      const details = getProductPackagings(prod.name);
      const firstPkg = details.packagings[0];
      if (firstPkg) {
        setSelectedPkgId(firstPkg.id);
        setPkgCount(1);
        setAmount(String(firstPkg.packagePrice));
      }
    }
  };

  const handleSelectPkg = (pkgId: string) => {
    setSelectedPkgId(pkgId);
    const prod = allProducts.find(p => p.id === selectedProdId) || allProducts[0];
    if (prod) {
      const details = getProductPackagings(prod.name);
      const pkg = details.packagings.find(pk => pk.id === pkgId);
      if (pkg) {
        setAmount(String(pkg.packagePrice * pkgCount));
      }
    }
  };

  const handleUpdatePkgCount = (delta: number) => {
    const newCount = Math.max(1, pkgCount + delta);
    setPkgCount(newCount);
    const prod = allProducts.find(p => p.id === selectedProdId) || allProducts[0];
    if (prod) {
      const details = getProductPackagings(prod.name);
      const pkg = details.packagings.find(pk => pk.id === selectedPkgId) || details.packagings[0];
      if (pkg) {
        setAmount(String(pkg.packagePrice * newCount));
      }
    }
  };

  const handleRegisterRecaudo = async () => {
    const effectiveStoreId = selectedStoreId || stores[0]?.id;
    let effectiveCategoryId = selectedCategoryId || categories[0]?.id;
    let autoNotes = notes.trim();

    if (!effectiveStoreId) {
      toast.error("Debes seleccionar una tienda oficial (Centro o La Usa)");
      return;
    }

    if (recaudoMode === "product") {
      const prod = allProducts.find(p => p.id === selectedProdId) || allProducts[0];
      if (prod) {
        effectiveCategoryId = prod.category_id || effectiveCategoryId;
        const details = getProductPackagings(prod.name);
        const pkg = details.packagings.find(pk => pk.id === selectedPkgId) || details.packagings[0];
        autoNotes = `Recaudo Producto: ${details.name} (${pkgCount}x ${pkg?.label || "Unidad"})${notes ? ` - ${notes}` : ""}`;
      }
    } else {
      const catObj = categories.find(c => c.id === effectiveCategoryId);
      autoNotes = `Recaudo General de Categoría: ${catObj?.name || "General"}${notes ? ` - ${notes}` : ""}`;
    }

    if (!amount || Number(amount) <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }

    try {
      const payVal = Number(amount);
      await createPayment({
        storeId: effectiveStoreId,
        categoryId: effectiveCategoryId,
        amount: payVal,
        notes: autoNotes || undefined,
      });

      // Verificar si el recaudo completa el 100% de la venta para disparar la notificación requerida
      let targetItemName = "";
      if (recaudoMode === "product") {
        const prod = allProducts.find(p => p.id === selectedProdId) || allProducts[0];
        targetItemName = prod ? getProductPackagings(prod.name).name : "";
      } else {
        const catObj = categories.find(c => c.id === effectiveCategoryId);
        targetItemName = catObj?.name || "";
      }

      if (targetItemName) {
        const lock = liquidationMap[targetItemName];
        if (lock && (lock.pendingVal - payVal <= 0)) {
          const completedAmount = lock.factoryDispatchedVal > 0 ? lock.factoryDispatchedVal : (lock.totalDispatchedVal > 0 ? lock.totalDispatchedVal : payVal);
          await triggerCompletedSaleNotification(targetItemName, completedAmount, user?.id);
        }
      }

      toast.success(`Recaudo de ${formatCurrency(payVal)} registrado con éxito`);
      setIsNewRecaudoOpen(false);
      setAmount("");
      setNotes("");
      setPkgCount(1);
    } catch (err: any) {
      toast.error(err.message || "Error al registrar recaudo");
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white pb-36 font-sans">
      <div className="mx-auto max-w-md px-5 pt-3 space-y-4">
        
        {/* HEADER */}
        <header className="flex items-center justify-between py-2">
          <button 
            onClick={() => navigate({ to: "/dashboard" })}
            className="flex size-10 items-center justify-center rounded-full bg-[#161922] border border-white/10 shadow-xs text-white active:scale-95 transition-transform"
          >
            <ChevronLeft className="size-5" />
          </button>

          <h1 className="text-lg font-black tracking-tight text-white">
            Ventas & Recaudos
          </h1>

          <button 
            onClick={() => setIsNewRecaudoOpen(true)}
            className="flex size-10 items-center justify-center rounded-full bg-[#CCFF00] text-black font-black shadow-md active:scale-95 transition-transform"
            title="Nuevo Recaudo"
          >
            <Plus className="size-5 stroke-[3]" />
          </button>
        </header>

        {/* HERO CARD DE RECAUDOS (OBSIDIAN & NEON MINIMALISTA) */}
        <div className="rounded-[32px] bg-[#161922] border border-white/10 p-5 text-white shadow-xl space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-extrabold uppercase tracking-wider text-slate-400">
              Resumen General de Dinero
            </span>
            <span className="text-[10px] font-black bg-[#CCFF00]/15 text-[#CCFF00] px-2.5 py-0.5 rounded-full border border-[#CCFF00]/30">
              ✓ {consolidation.completedProducts.length} Ventas Completadas
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 my-2">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Dinero Recaudado</span>
              <p className="text-2xl font-black text-[#CCFF00] mt-0.5">
                {formatCurrency(totalRecaudado)}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Dinero Faltante</span>
              <p className="text-2xl font-black text-rose-400 mt-0.5">
                {formatCurrency(totalFaltante)}
              </p>
            </div>
          </div>

          {/* Consolidación de Ventas Completadas al 100% con Montos Exactos */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#CCFF00] uppercase block">Ventas Consolidadas al 100%</span>
                <span className="text-[9px] text-slate-400">Total liquidado y cobrado en su totalidad</span>
              </div>
              <span className="text-[18px] font-black text-[#CCFF00]">{formatCurrency(consolidation.totalVentasCompletadas)}</span>
            </div>

            {/* 3 Grupos Principales con Montos Exactos */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-center text-[10px]">
              <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                <span className="text-slate-400 block uppercase font-bold">Blanco</span>
                <span className="text-[12px] font-black text-white">{formatCurrency(consolidation.completedByGroup.blanco)}</span>
              </div>
              <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                <span className="text-slate-400 block uppercase font-bold">Verde</span>
                <span className="text-[12px] font-black text-blue-300">{formatCurrency(consolidation.completedByGroup.verde)}</span>
              </div>
              <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                <span className="text-slate-400 block uppercase font-bold">Adicionales</span>
                <span className="text-[12px] font-black text-rose-300">{formatCurrency(consolidation.completedByGroup.adicionales)}</span>
              </div>
            </div>

            {/* Desglose individual en montos de Productos Adicionales */}
            <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-white/10 text-[10px]">
              <div className="flex justify-between px-2 py-1 rounded-lg bg-white/5 text-slate-300">
                <span>Rojas:</span>
                <span className="font-bold text-white">{formatCurrency(consolidation.completedByGroup.adicionalesBreakdown.rojas)}</span>
              </div>
              <div className="flex justify-between px-2 py-1 rounded-lg bg-white/5 text-slate-300">
                <span>Flores:</span>
                <span className="font-bold text-white">{formatCurrency(consolidation.completedByGroup.adicionalesBreakdown.flores)}</span>
              </div>
              <div className="flex justify-between px-2 py-1 rounded-lg bg-white/5 text-slate-300">
                <span>Baldes:</span>
                <span className="font-bold text-white">{formatCurrency(consolidation.completedByGroup.adicionalesBreakdown.baldes)}</span>
              </div>
              <div className="flex justify-between px-2 py-1 rounded-lg bg-white/5 text-slate-300">
                <span>Pre-roll:</span>
                <span className="font-bold text-white">{formatCurrency(consolidation.completedByGroup.adicionalesBreakdown.preroll)}</span>
              </div>
            </div>
          </div>

          <Button 
            onClick={() => setIsNewRecaudoOpen(true)}
            className="w-full h-12 rounded-2xl bg-[#CCFF00] text-black font-black text-[13px] hover:bg-[#b8e600] shadow-md active:scale-95 transition-transform"
          >
            <CircleDollarSign className="size-4 mr-1.5" /> Registrar Nuevo Recaudo
          </Button>
        </div>

        {/* SEARCH & FILTERS */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1">
            <input 
              type="text" 
              className="block w-full pl-4 pr-10 py-3 rounded-2xl bg-white border border-slate-200/80 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-900 shadow-xs"
              placeholder="Buscar tienda, operador, #..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* DYNAMIC CATEGORY FILTER PILLS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button 
            onClick={() => setFilterCategory("todos")}
            className={`whitespace-nowrap px-4 py-2 rounded-2xl text-[13px] font-bold transition-colors ${filterCategory === "todos" ? 'bg-slate-900 text-white shadow-xs' : 'bg-white border border-slate-200/80 text-slate-600'}`}
          >
            Todos ({payments.length})
          </button>
          {categories.map((cat) => (
            <button 
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-2xl text-[13px] font-bold transition-colors ${filterCategory === cat.id ? 'bg-slate-900 text-white shadow-xs' : 'bg-white border border-slate-200/80 text-slate-600'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* SALES / PAYMENTS LIST */}
        {isLoading ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-white/60 rounded-[28px] animate-pulse border border-slate-200/60" />
            ))}
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Wallet className="size-12 mb-3 opacity-30" />
            <p className="text-[15px] font-semibold">Sin recaudos registrados todavía</p>
            <p className="text-[12px] text-slate-400 mt-1">Registra tu primer recaudo con el botón superior</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredPayments.map((r) => (
              <div 
                key={r.id}
                className="p-4 rounded-[28px] bg-white border border-slate-200/80 shadow-xs flex items-center justify-between"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[14px] font-black text-slate-900">{r.storeName}</span>
                  <div className="flex items-center gap-2 text-[12px] text-slate-500 font-semibold">
                    <span>{r.categoryName}</span>
                    <span>•</span>
                    <span>{r.date}</span>
                    {r.operatorName && (
                      <>
                        <span>•</span>
                        <span className="text-slate-400">{r.operatorName}</span>
                      </>
                    )}
                  </div>
                  {r.notes && (
                    <span className="text-[11px] text-slate-400 italic">{r.notes}</span>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="text-[16px] font-black text-slate-950">
                    {formatCurrency(r.amount)}
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    r.status === "confirmed" 
                      ? "bg-emerald-100 text-emerald-800" 
                      : "bg-rose-100 text-rose-800"
                  }`}>
                    {r.status === "confirmed" ? "Confirmado" : "Anulado"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* DRAWER: NUEVO RECAUDO INTELIGENTE (CATEGORÍA O PRODUCTO) */}
      <Drawer open={isNewRecaudoOpen} onOpenChange={setIsNewRecaudoOpen}>
        <DrawerContent className="bg-white border-t-0 px-5 pb-8 max-h-[90vh]">
          <div className="flex flex-col">
            <div className="py-3 border-b border-slate-100 mb-3">
              <h2 className="text-xl font-black text-slate-900">Registrar Recaudo</h2>
              <p className="text-xs text-slate-400">Recauda dinero en general de la categoría o por producto / presentación</p>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-[12px] font-bold text-slate-500 block mb-1">Tienda Oficial *</label>
                <select 
                  value={selectedStoreId} 
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-[14px] font-bold text-slate-900 outline-none"
                >
                  <option value="">Selecciona tienda (Centro o La Usa)</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {/* Selector de Modo: Por Categoría General vs Por Producto */}
              <div>
                <label className="text-[12px] font-bold text-slate-500 block mb-1">Tipo de Recaudo</label>
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-100">
                  <button
                    type="button"
                    onClick={() => setRecaudoMode("category")}
                    className={`py-2 rounded-xl text-[12px] font-black transition-all ${
                      recaudoMode === "category" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Por Categoría General
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRecaudoMode("product");
                      if (!selectedProdId && allProducts.length > 0) {
                        handleSelectProduct(allProducts[0].id);
                      }
                    }}
                    className={`py-2 rounded-xl text-[12px] font-black transition-all ${
                      recaudoMode === "product" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Por Producto / Presentación
                  </button>
                </div>
              </div>

              {recaudoMode === "category" ? (
                <div>
                  <label className="text-[12px] font-bold text-slate-500 block mb-1">Categoría General *</label>
                  <select 
                    value={selectedCategoryId} 
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-[14px] font-bold text-slate-900 outline-none"
                  >
                    <option value="">Selecciona la categoría</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div>
                    <label className="text-[12px] font-bold text-slate-500 block mb-1">Producto *</label>
                    <select
                      value={selectedProdId}
                      onChange={(e) => handleSelectProduct(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-[14px] font-bold text-slate-900 outline-none"
                    >
                      <option value="">Selecciona el producto</option>
                      {allProducts.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {selectedProdId && (
                    <>
                      <div>
                        <label className="text-[12px] font-bold text-slate-500 block mb-1">Presentación / Empaque</label>
                        <div className="flex flex-wrap gap-1.5">
                          {getProductPackagings(allProducts.find(p => p.id === selectedProdId)?.name || "").packagings.map(pkg => (
                            <button
                              key={pkg.id}
                              type="button"
                              onClick={() => handleSelectPkg(pkg.id)}
                              className={`px-3 py-1.5 rounded-xl text-[12px] font-bold transition-colors ${
                                selectedPkgId === pkg.id 
                                  ? "bg-slate-900 text-white" 
                                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              {pkg.label} (${pkg.packagePrice.toLocaleString()})
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                        <span className="text-[13px] font-bold text-slate-600">Cantidad cobrada:</span>
                        <div className="flex items-center gap-3">
                          <button 
                            type="button"
                            onClick={() => handleUpdatePkgCount(-1)}
                            className="size-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-800"
                          >
                            <Minus className="size-3.5" />
                          </button>
                          <span className="text-base font-black w-6 text-center">{pkgCount}</span>
                          <button 
                            type="button"
                            onClick={() => handleUpdatePkgCount(1)}
                            className="size-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-800"
                          >
                            <Plus className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div>
                <label className="text-[12px] font-bold text-slate-500 block mb-1">Monto a Recaudar ($) *</label>
                <input 
                  type="number" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Ej. 120000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-[15px] font-bold text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="text-[12px] font-bold text-slate-500 block mb-1">Notas / Referencia (Opcional)</label>
                <input 
                  type="text" 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej. Pago en efectivo turno tarde"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-[14px] outline-none"
                />
              </div>

              <Button 
                onClick={handleRegisterRecaudo}
                disabled={isCreatingPayment}
                className="w-full h-14 rounded-2xl font-black text-[15px] bg-slate-900 text-white hover:bg-slate-800 mt-2 shadow-md"
              >
                {isCreatingPayment ? "Guardando en Supabase..." : "Confirmar Recaudo"}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

    </div>
  );
}
