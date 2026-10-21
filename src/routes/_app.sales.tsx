import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { 
  ChevronLeft, 
  Search, 
  X, 
  CircleDollarSign, 
  Plus, 
  TrendingUp, 
  Store,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Wallet
} from "lucide-react";

import { formatCurrency } from "@/lib/format";
import { useSalesData } from "@/features/sales/use-sales-data";
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

  const [query, setQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("todos");
  
  // Recaudo Drawer State
  const [isNewRecaudoOpen, setIsNewRecaudoOpen] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
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

  const handleRegisterRecaudo = async () => {
    const effectiveStoreId = selectedStoreId || stores[0]?.id;
    const effectiveCategoryId = selectedCategoryId || categories[0]?.id;

    if (!effectiveStoreId) {
      toast.error("Debes seleccionar una tienda");
      return;
    }
    if (!effectiveCategoryId) {
      toast.error("Debes seleccionar una categoría");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }

    try {
      await createPayment({
        storeId: effectiveStoreId,
        categoryId: effectiveCategoryId,
        amount: Number(amount),
        notes: notes.trim() || undefined,
      });

      toast.success(`Recaudo de ${formatCurrency(Number(amount))} registrado con éxito`);
      setIsNewRecaudoOpen(false);
      setAmount("");
      setNotes("");
    } catch (err: any) {
      toast.error(err.message || "Error al registrar recaudo");
    }
  };

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

          <h1 className="text-lg font-black tracking-tight text-stone-950">
            Ventas & Recaudos
          </h1>

          <button 
            onClick={() => setIsNewRecaudoOpen(true)}
            className="flex size-10 items-center justify-center rounded-full bg-[#FEE867] border border-stone-900/10 shadow-2xs text-stone-950 active:scale-95 transition-transform"
            title="Nuevo Recaudo"
          >
            <Plus className="size-5 stroke-[2.5]" />
          </button>
        </header>

        {/* HERO CARD DE RECAUDOS (AMARILLO SOLEADO) */}
        <div className="rounded-[32px] bg-[#FEE867] p-5 text-stone-950 shadow-sm">
          <span className="text-[12px] font-extrabold uppercase tracking-wider text-stone-800">
            Resumen General de Dinero
          </span>

          <div className="grid grid-cols-2 gap-3 my-3">
            <div className="p-3.5 rounded-2xl bg-white/70 border border-black/5">
              <span className="text-[11px] font-bold text-stone-600 uppercase">Dinero Recaudado</span>
              <p className="text-2xl font-black text-stone-950 mt-0.5">
                {formatCurrency(totalRecaudado)}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/70 border border-black/5">
              <span className="text-[11px] font-bold text-rose-800 uppercase">Dinero Faltante</span>
              <p className="text-2xl font-black text-rose-950 mt-0.5">
                {formatCurrency(totalFaltante)}
              </p>
            </div>
          </div>

          <Button 
            onClick={() => setIsNewRecaudoOpen(true)}
            className="w-full h-12 rounded-2xl bg-stone-950 text-white font-black text-[13px] hover:bg-stone-900 shadow-sm"
          >
            <CircleDollarSign className="size-4 mr-1.5" /> Registrar Nuevo Recaudo
          </Button>
        </div>

        {/* SEARCH & FILTERS */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1">
            <input 
              type="text" 
              className="block w-full pl-4 pr-10 py-3 rounded-2xl bg-white border border-stone-200/80 text-[14px] text-stone-900 placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-stone-900 shadow-2xs"
              placeholder="Buscar tienda, operador, #..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400">
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* DYNAMIC CATEGORY FILTER PILLS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button 
            onClick={() => setFilterCategory("todos")}
            className={`whitespace-nowrap px-4 py-2 rounded-2xl text-[13px] font-bold transition-colors ${filterCategory === "todos" ? 'bg-[#FEE867] text-stone-950 shadow-2xs' : 'bg-white border border-stone-200/80 text-stone-600'}`}
          >
            Todos ({payments.length})
          </button>
          {categories.map((cat) => (
            <button 
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-2xl text-[13px] font-bold transition-colors ${filterCategory === cat.id ? 'bg-[#FEE867] text-stone-950 shadow-2xs' : 'bg-white border border-stone-200/80 text-stone-600'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* SALES / PAYMENTS LIST */}
        {isLoading ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-white/60 rounded-[28px] animate-pulse border border-stone-200/60" />
            ))}
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-stone-400">
            <Wallet className="size-12 mb-3 opacity-30" />
            <p className="text-[15px] font-semibold">Sin recaudos registrados todavía</p>
            <p className="text-[12px] text-stone-400 mt-1">Registra tu primer recaudo con el botón superior</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredPayments.map((r) => (
              <div 
                key={r.id}
                className="p-4 rounded-[28px] bg-white border border-stone-200/80 shadow-2xs flex items-center justify-between"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[14px] font-black text-stone-900">{r.storeName}</span>
                  <div className="flex items-center gap-2 text-[12px] text-stone-500 font-semibold">
                    <span>{r.categoryName}</span>
                    <span>•</span>
                    <span>{r.date}</span>
                    {r.operatorName && (
                      <>
                        <span>•</span>
                        <span className="text-stone-400">{r.operatorName}</span>
                      </>
                    )}
                  </div>
                  {r.notes && (
                    <span className="text-[11px] text-stone-400 italic">{r.notes}</span>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="text-[16px] font-black text-stone-950">
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

      {/* DRAWER: NUEVO RECAUDO REAL A SUPABASE */}
      <Drawer open={isNewRecaudoOpen} onOpenChange={setIsNewRecaudoOpen}>
        <DrawerContent className="bg-white border-t-0 px-5 pb-8">
          <div className="flex flex-col">
            <div className="py-3 border-b border-stone-100 mb-3">
              <h2 className="text-xl font-black text-stone-900">Registrar Recaudo</h2>
              <p className="text-xs text-stone-400">Guarda el cobro directamente en la base de datos</p>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-[12px] font-bold text-stone-500 block mb-1">Tienda *</label>
                <select 
                  value={selectedStoreId} 
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-3.5 text-[14px] font-bold text-stone-900 outline-none"
                >
                  <option value="">Selecciona la tienda</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[12px] font-bold text-stone-500 block mb-1">Categoría *</label>
                <select 
                  value={selectedCategoryId} 
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-3.5 text-[14px] font-bold text-stone-900 outline-none"
                >
                  <option value="">Selecciona la categoría</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[12px] font-bold text-stone-500 block mb-1">Monto Recaudado ($) *</label>
                <input 
                  type="number" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Ej. 120000"
                  className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-3.5 text-[15px] font-bold text-stone-900 outline-none"
                />
              </div>

              <div>
                <label className="text-[12px] font-bold text-stone-500 block mb-1">Notas / Referencia (Opcional)</label>
                <input 
                  type="text" 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej. Pago en efectivo turno tarde"
                  className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-3.5 text-[14px] outline-none"
                />
              </div>

              <Button 
                onClick={handleRegisterRecaudo}
                disabled={isCreatingPayment}
                className="w-full h-14 rounded-2xl font-black text-[15px] bg-[#FEE867] text-stone-950 hover:bg-[#FEE867]/90 mt-2 shadow-md"
              >
                {isCreatingPayment ? "Guardando en Supabase..." : "Guardar Recaudo"}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

    </div>
  );
}
