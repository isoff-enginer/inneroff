import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Search, Wallet, CheckCircle2, TrendingUp, Calendar, User, ArrowUpRight, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/_app/sales")({
  head: () => ({
    meta: [
      { title: "Ventas y Recaudos · Reserva Operaciones" },
      {
        name: "description",
        content: "Recaudos en tiempo real por tienda, categoría y cobrador.",
      },
    ],
  }),
  component: SalesPage,
});

interface PaymentRow {
  id: string;
  amount: number;
  received_at: string;
  store_name: string;
  collector_name: string;
  notes?: string;
  status: string;
}

function SalesPage() {
  const [query, setQuery] = useState("");
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPayments() {
      try {
        const { data, error } = await supabase
          .from("payments")
          .select(`
            id,
            amount,
            received_at,
            notes,
            status,
            stores(name),
            profiles:collected_by(full_name)
          `)
          .order("received_at", { ascending: false });

        if (!error && data) {
          const mapped: PaymentRow[] = data.map((item: any) => ({
            id: item.id,
            amount: Number(item.amount),
            received_at: item.received_at,
            store_name: item.stores?.name || "Tienda Cambalache",
            collector_name: item.profiles?.full_name || "Bodega",
            notes: item.notes,
            status: item.status || "confirmed",
          }));
          setPayments(mapped);
        }
      } catch (err) {
        console.error("Error loading payments:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadPayments();
  }, []);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) =>
      `${p.store_name} ${p.collector_name} ${p.notes || ""}`
        .toLowerCase()
        .includes(query.trim().toLowerCase())
    );
  }, [payments, query]);

  const totalRecaudado = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="flex flex-col min-h-screen bg-[#231934] pb-24 text-white">
      {/* HEADER */}
      <header className="sticky top-0 z-10 bg-[#1e152d]/90 backdrop-blur-md border-b border-white/10 px-5 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-black text-white">Ventas & Recaudos</h1>
            <p className="text-xs text-[#a497be] mt-0.5">
              Control de ingresos en efectivo de tiendas
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-[#8ec97b]/15 text-[#8ec97b] border border-[#8ec97b]/30 px-3 py-1.5 rounded-2xl text-xs font-bold">
            <TrendingUp className="size-3.5" />
            <span>En vivo</span>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#a497be]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por tienda o cobrador…"
            className="w-full bg-[#2d2244] pl-10 pr-9 py-2.5 rounded-2xl border border-white/10 text-sm text-white font-medium outline-none focus:border-[#246bfd] transition-colors"
          />
          {query && (
            <button 
              onClick={() => setQuery("")} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a497be] hover:text-white"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 px-5 pt-4 max-w-md mx-auto w-full space-y-4">
        {/* TOTAL CARD */}
        <section className="bg-gradient-to-br from-[#2d2244] to-[#231934] p-5 rounded-[28px] border border-white/10 shadow-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-[#a497be] uppercase tracking-wider">Total Recaudado</span>
            <span className="text-xs font-bold text-[#8ec97b] bg-[#8ec97b]/15 px-2.5 py-0.5 rounded-full border border-[#8ec97b]/30">
              {filteredPayments.length} registros
            </span>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight">
            {formatCurrency(totalRecaudado)}
          </h2>
        </section>

        {/* PAYMENTS LIST */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-[#2d2244] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="py-20 text-center text-[#a497be]">
            <Wallet className="size-12 mb-2 opacity-30 text-[#246bfd] mx-auto" />
            <p className="text-sm font-medium">No hay recaudos registrados.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredPayments.map((p) => (
              <div
                key={p.id}
                className="bg-[#2d2244] p-4 rounded-2xl border border-white/10 shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center gap-3.5">
                  <div className="size-11 rounded-2xl bg-[#8ec97b]/15 border border-[#8ec97b]/30 flex items-center justify-center text-[#8ec97b] shrink-0">
                    <Wallet className="size-5" />
                  </div>
                  <div>
                    <span className="text-sm font-black text-white block leading-tight">{p.store_name}</span>
                    <span className="text-xs text-[#a497be] block mt-0.5">
                      Por: {p.collector_name} • {new Date(p.received_at).toLocaleDateString()}
                    </span>
                    {p.notes && (
                      <span className="text-[11px] text-white/60 italic block mt-0.5">
                        {p.notes}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-base font-black text-[#8ec97b] block tabular">
                    +{formatCurrency(p.amount)}
                  </span>
                  <span className="text-[10px] font-bold text-[#8ec97b] uppercase">
                    Confirmado
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
