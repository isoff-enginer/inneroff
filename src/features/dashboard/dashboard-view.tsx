import { Link } from "@tanstack/react-router";
import { 
  Bell, 
  MessageSquare, 
  ChevronDown, 
  ChevronUp,
  Store,
  PackageSearch,
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

  return (
    <div className="min-h-screen bg-[#f4f2ee] pb-24 text-black selection:bg-black/10">
      <div className="mx-auto max-w-md px-4 pt-6">
        
        {/* Header Superior */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-black text-white font-medium shadow-sm">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-gray-500 font-medium">Hello,</span>
              <span className="text-base font-semibold leading-none">{displayName}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex size-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200/50 transition-transform active:scale-95">
              <Bell className="size-5 text-black" />
            </button>
            <button className="flex size-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200/50 transition-transform active:scale-95">
              <MessageSquare className="size-5 text-black" />
            </button>
          </div>
        </header>

        {/* Hero Card (Ventas Totales) */}
        <section className="mb-4 flex flex-col items-center rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200/50">
          <span className="text-sm font-semibold text-gray-500 mb-2">Ventas de hoy</span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-8">
            {formatCurrency(salesToday)}
          </h1>
          
          <div className="flex w-full gap-3">
            <Link 
              to="/dispatches" 
              className="flex flex-1 items-center justify-center rounded-xl bg-black py-4 text-sm font-bold text-white transition-transform active:scale-95 shadow-md"
            >
              DESPACHOS
            </Link>
            <Link 
              to="/inventory" 
              className="flex flex-1 items-center justify-center rounded-xl border-2 border-gray-100 bg-white py-4 text-sm font-bold text-black transition-transform active:scale-95 shadow-sm"
            >
              INVENTARIO
            </Link>
          </div>
        </section>

        {/* Collapsible Section (Despachos) */}
        <section className="mb-4">
          <button 
            onClick={() => setIsDispatchesOpen(!isDispatchesOpen)}
            className="flex w-full flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200/50 transition-all active:scale-[0.99]"
          >
            <div className="flex w-full items-center justify-between p-5">
              <div className="flex items-center gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <Truck className="size-5" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-base font-bold">Despachos de la tienda</span>
                  <span className="text-sm text-gray-500">Resumen de envíos desde bodega</span>
                </div>
              </div>
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-50">
                {isDispatchesOpen ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
              </div>
            </div>
            
            {/* Expanded Content */}
            {isDispatchesOpen && (
              <div className="w-full border-t border-gray-100 bg-gray-50/50 p-5 text-left transition-all">
                <div className="grid grid-cols-3 gap-4 divide-x divide-gray-200">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <span className="text-2xl font-bold">{dispatchStats.count}</span>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Envíos</span>
                  </div>
                  <div className="flex flex-col items-center justify-center gap-1">
                    <span className="text-lg font-bold">{formatCurrency(dispatchStats.value)}</span>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Dinero</span>
                  </div>
                  <div className="flex flex-col items-center justify-center gap-1">
                    <span className="text-2xl font-bold">{dispatchStats.products}</span>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Prods</span>
                  </div>
                </div>
              </div>
            )}
          </button>
        </section>

        {/* List Section (Ventas por Tiendas) */}
        <section className="mb-8 flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200/50">
          <div className="flex items-center justify-between p-5 pb-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Ventas por tiendas</h2>
            <Link to="/stores" className="text-sm font-semibold text-black flex items-center gap-1">
              Ver todas <ArrowRight className="size-3.5" />
            </Link>
          </div>
          
          <div className="flex flex-col p-3">
            {storeSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-gray-500">
                <Store className="size-8 mb-2 opacity-20" />
                <span className="text-sm font-medium">Aún no hay ventas registradas hoy.</span>
              </div>
            ) : (
              storeSales.map((store, index) => (
                <div 
                  key={store.id} 
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors hover:bg-gray-50 ${index !== storeSales.length - 1 ? 'border-b border-gray-50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#003087] text-white">
                      {/* Simulating a brand logo like PayPal in the reference */}
                      <span className="font-bold text-lg">{store.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-black">{store.name}</span>
                      <span className="text-xs font-medium text-gray-400">Tienda Oficial</span>
                    </div>
                  </div>
                  <span className="text-base font-bold text-black">
                    +{formatCurrency(store.total)}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Floating Bottom Navigation */}
      <div className="fixed bottom-6 left-0 right-0 z-50 px-4 flex justify-center pointer-events-none">
        <nav className="flex items-center gap-1 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-black/5 pointer-events-auto">
          <button className="flex flex-col items-center justify-center rounded-xl bg-[#cbf382] px-6 py-2.5 text-black transition-colors">
            <PackageSearch className="size-5 mb-1" />
            <span className="text-[10px] font-bold tracking-wider">HOME</span>
          </button>
          <button className="flex flex-col items-center justify-center rounded-xl px-6 py-2.5 text-gray-400 hover:text-black hover:bg-gray-50 transition-colors">
            <Truck className="size-5 mb-1" />
            <span className="text-[10px] font-bold tracking-wider uppercase">Envíos</span>
          </button>
          <button className="flex flex-col items-center justify-center rounded-xl px-6 py-2.5 text-gray-400 hover:text-black hover:bg-gray-50 transition-colors">
            <Store className="size-5 mb-1" />
            <span className="text-[10px] font-bold tracking-wider uppercase">Tiendas</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
