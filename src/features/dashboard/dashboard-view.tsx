import { Link } from "@tanstack/react-router";
import { 
  ChevronDown, 
  ChevronUp,
  Store,
  Truck,
  ArrowRight
} from "lucide-react";
import { useState } from "react";

import { useSession } from "@/features/auth/session";
import { useBossDashboardData } from "@/features/dashboard/use-dashboard-data";
import { formatCurrency } from "@/lib/format";

export function BossDashboard() {
  const { user } = useSession();
  const { 
    salesToday, 
    storeSales,
    dispatchStats,
    isLoading 
  } = useBossDashboardData();

  const [isDispatchesOpen, setIsDispatchesOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-[#f4f2ee]">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <div className="size-6 animate-spin rounded-full border-2 border-black border-t-transparent" />
        </div>
      </div>
    );
  }

  // Helper para extraer un nombre o usar "Usuario"
  const displayName = user?.displayName ?? user?.fullName ?? "Usuario";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[#f4f2ee] text-black selection:bg-black/10">
      <div className="mx-auto max-w-md px-4 pt-4 pb-12">
        
        {/* Saludo Integrado (Sin duplicar iconos de notificaciones) */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex size-11 items-center justify-center rounded-full bg-black text-white font-semibold shadow-sm">
            {initials}
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] text-gray-500 font-medium leading-tight">Hello,</span>
            <span className="text-[15px] font-bold leading-tight">{displayName}</span>
          </div>
        </div>

        {/* Hero Card (Ventas Totales) */}
        <section className="mb-4 flex flex-col items-center rounded-2xl bg-[#e5e3db] p-8 shadow-sm">
          <span className="text-[13px] font-semibold text-gray-600 mb-1">Ventas de hoy</span>
          <h1 className="text-[40px] font-black tracking-tight mb-8">
            {formatCurrency(salesToday)}
          </h1>
          
          <div className="flex w-full gap-3">
            <Link 
              to="/dispatches" 
              className="flex flex-1 items-center justify-center rounded-full bg-black py-3.5 text-[13px] font-bold text-white transition-transform active:scale-95 shadow-md"
            >
              DESPACHOS
            </Link>
            <Link 
              to="/inventory" 
              className="flex flex-1 items-center justify-center rounded-full border border-gray-300/60 bg-transparent py-3.5 text-[13px] font-bold text-black transition-transform active:scale-95"
            >
              INVENTARIO
            </Link>
          </div>
        </section>

        {/* Collapsible Section (Despachos) */}
        <section className="mb-4">
          <button 
            onClick={() => setIsDispatchesOpen(!isDispatchesOpen)}
            className="flex w-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition-all active:scale-[0.99]"
          >
            <div className="flex w-full items-center justify-between px-5 py-4">
              <div className="flex items-center gap-4">
                {/* Loader icon style from reference */}
                <div className="relative flex size-9 shrink-0 items-center justify-center rounded-full border-[3px] border-gray-100">
                  <svg className="absolute -left-[3px] -top-[3px] size-9 -rotate-90 text-emerald-400" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray="25, 100"
                    />
                  </svg>
                  <span className="text-[10px] font-bold">1/4</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-[15px] font-bold">Despachos de la tienda</span>
                  <span className="text-[13px] text-gray-500 font-medium">Resumen de envíos desde bodega</span>
                </div>
              </div>
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-600">
                {isDispatchesOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </div>
            </div>
            
            {/* Expanded Content */}
            {isDispatchesOpen && (
              <div className="w-full border-t border-gray-100 bg-gray-50/50 p-5 text-left transition-all">
                <div className="grid grid-cols-3 gap-4 divide-x divide-gray-200">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <span className="text-xl font-black">{dispatchStats.count}</span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Envíos</span>
                  </div>
                  <div className="flex flex-col items-center justify-center gap-1">
                    <span className="text-sm font-black">{formatCurrency(dispatchStats.value)}</span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Dinero</span>
                  </div>
                  <div className="flex flex-col items-center justify-center gap-1">
                    <span className="text-xl font-black">{dispatchStats.products}</span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Prods</span>
                  </div>
                </div>
              </div>
            )}
          </button>
        </section>

        {/* List Section (Ventas por Tiendas) */}
        <section className="mb-6 flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="text-[15px] font-black uppercase tracking-tight text-black">Ventas por tiendas</h2>
            <Link to="/stores" className="text-[13px] font-semibold text-gray-600 flex items-center gap-1 hover:text-black">
              Ver todas <ArrowRight className="size-3.5" />
            </Link>
          </div>
          
          <div className="flex flex-col px-3 pb-3">
            {storeSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-gray-500">
                <Store className="size-8 mb-2 opacity-20" />
                <span className="text-sm font-medium">Aún no hay ventas registradas hoy.</span>
              </div>
            ) : (
              storeSales.map((store, index) => (
                <div 
                  key={store.id} 
                  className={`flex items-center justify-between p-3 rounded-xl transition-colors hover:bg-gray-50 ${index !== storeSales.length - 1 ? 'border-b border-gray-50' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#003087] text-white shadow-sm">
                      <span className="font-bold text-lg">{store.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[15px] font-bold text-black leading-none">{store.name}</span>
                      <span className="text-[13px] font-medium text-gray-400">Tienda Oficial</span>
                    </div>
                  </div>
                  <span className="text-[15px] font-medium text-gray-600">
                    +{formatCurrency(store.total)}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
