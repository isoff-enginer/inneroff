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
  ArrowUpRight
} from "lucide-react";

import { formatCurrency } from "@/lib/format";
import { MOCK_SALES } from "@/features/sales/mock-data";
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
  const [query, setQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<"todos" | "Verde" | "Blanco">("todos");
  
  // Recaudo Drawer
  const [isNewRecaudoOpen, setIsNewRecaudoOpen] = useState(false);
  const [storeName, setStoreName] = useState("Tienda Centro");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<"Verde" | "Blanco">("Verde");

  const [salesList, setSalesList] = useState(MOCK_SALES);

  const rows = useMemo(() => {
    return salesList.filter((row) => {
      const matchesText = `${row.store} ${row.operator} ${row.category}`
        .toLowerCase()
        .includes(query.trim().toLowerCase());
      if (!matchesText) return false;
      if (filterCategory !== "todos" && !row.category.toLowerCase().includes(filterCategory.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [salesList, query, filterCategory]);

  const totalRecaudado = useMemo(() => {
    return salesList
      .filter((r) => r.status === "confirmed")
      .reduce((sum, r) => sum + r.amount, 0);
  }, [salesList]);

  const totalFaltante = 1420000; // Total pendiente de cobro de despachos

  const handleRegisterRecaudo = () => {
    if (!amount || Number(amount) <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }

    const newRecaudo = {
      id: `s-${Date.now()}`,
      date: "Hoy",
      store: storeName,
      operator: "Operador",
      category: `Categoría ${category}`,
      amount: Number(amount),
      status: "confirmed" as const,
    };

    setSalesList(prev => [newRecaudo, ...prev]);
    toast.success(`Recaudo de ${formatCurrency(Number(amount))} registrado exitosamente`);
    setIsNewRecaudoOpen(false);
    setAmount("");
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
              placeholder="Buscar tienda, operador..."
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

        {/* CATEGORY FILTER PILLS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button 
            onClick={() => setFilterCategory("todos")}
            className={`whitespace-nowrap px-4 py-2 rounded-2xl text-[13px] font-bold transition-colors ${filterCategory === "todos" ? 'bg-[#FEE867] text-stone-950 shadow-2xs' : 'bg-white border border-stone-200/80 text-stone-600'}`}
          >
            Todos ({salesList.length})
          </button>
          <button 
            onClick={() => setFilterCategory("Verde")}
            className={`whitespace-nowrap px-4 py-2 rounded-2xl text-[13px] font-bold transition-colors ${filterCategory === "Verde" ? 'bg-[#FEE867] text-stone-950 shadow-2xs' : 'bg-white border border-stone-200/80 text-stone-600'}`}
          >
            Categoría Verde
          </button>
          <button 
            onClick={() => setFilterCategory("Blanco")}
            className={`whitespace-nowrap px-4 py-2 rounded-2xl text-[13px] font-bold transition-colors ${filterCategory === "Blanco" ? 'bg-[#FEE867] text-stone-950 shadow-2xs' : 'bg-white border border-stone-200/80 text-stone-600'}`}
          >
            Categoría Blanco
          </button>
        </div>

        {/* SALES LIST */}
        <div className="space-y-2.5">
          {rows.map((r) => (
            <div 
              key={r.id}
              className="p-4 rounded-[28px] bg-white border border-stone-200/80 shadow-2xs flex items-center justify-between"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-[14px] font-black text-stone-900">{r.store}</span>
                <div className="flex items-center gap-2 text-[12px] text-stone-500 font-semibold">
                  <span>{r.category}</span>
                  <span>•</span>
                  <span>{r.date}</span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span className="text-[16px] font-black text-stone-950">
                  {formatCurrency(r.amount)}
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Confirmado
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* DRAWER: NUEVO RECAUDO */}
      <Drawer open={isNewRecaudoOpen} onOpenChange={setIsNewRecaudoOpen}>
        <DrawerContent className="bg-white border-t-0 px-5 pb-8">
          <div className="flex flex-col">
            <div className="py-3 border-b border-stone-100 mb-3">
              <h2 className="text-xl font-black text-stone-900">Registrar Pago / Recaudo</h2>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-[12px] font-bold text-stone-500 block mb-1">Tienda</label>
                <select 
                  value={storeName} 
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-3.5 text-[14px] font-bold text-stone-900 outline-none"
                >
                  <option value="Tienda Centro">Tienda Centro</option>
                  <option value="Tienda Norte">Tienda Norte</option>
                  <option value="Tienda Sur">Tienda Sur</option>
                </select>
              </div>

              <div>
                <label className="text-[12px] font-bold text-stone-500 block mb-1">Monto Recaudado ($) *</label>
                <input 
                  type="number" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Ej. 1240000"
                  className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-3.5 text-[15px] font-bold text-stone-900 outline-none"
                />
              </div>

              <div>
                <label className="text-[12px] font-bold text-stone-500 block mb-1">Categoría</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setCategory("Verde")}
                    className={`p-3 rounded-xl text-[13px] font-bold border transition-colors ${category === "Verde" ? "bg-[#FEE867] border-stone-900 text-stone-950" : "bg-stone-50 border-stone-200 text-stone-600"}`}
                  >
                    Categoría Verde
                  </button>
                  <button 
                    onClick={() => setCategory("Blanco")}
                    className={`p-3 rounded-xl text-[13px] font-bold border transition-colors ${category === "Blanco" ? "bg-[#FEE867] border-stone-900 text-stone-950" : "bg-stone-50 border-stone-200 text-stone-600"}`}
                  >
                    Categoría Blanco
                  </button>
                </div>
              </div>

              <Button 
                onClick={handleRegisterRecaudo}
                className="w-full h-14 rounded-2xl font-black text-[15px] bg-[#FEE867] text-stone-950 hover:bg-[#FEE867]/90 mt-2 shadow-md"
              >
                Guardar Recaudo
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

    </div>
  );
}
