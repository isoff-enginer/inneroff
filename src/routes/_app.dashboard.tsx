import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useSession } from "@/features/auth/session";
import { InventoryDashboardView } from "@/features/dashboard/components/InventoryDashboardView";
import { WarehouseDispatchCollectorView } from "@/features/dashboard/components/WarehouseDispatchCollectorView";
import { FactoryDispatchView } from "@/features/dashboard/components/FactoryDispatchView";
import { Building2, Factory, Store, ShieldCheck } from "lucide-react";

function DynamicDashboardRouter() {
  const { user, role, isLoading } = useSession();
  const [activeRoleViewOverride, setActiveRoleViewOverride] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5]">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-3 border-black border-t-transparent" />
          <span className="text-xs font-bold text-gray-500">Cargando panel...</span>
        </div>
      </div>
    );
  }

  // Determine effective role view
  const isBoss = role === "boss" || role === "boss_admin" || role === "operations_admin" || !role;
  const isWarehouse = role === "warehouse" || (!role && user?.warehouseId);
  const isFactory = role === "factory" || (!role && user?.factoryId);

  const activeView = activeRoleViewOverride || (isWarehouse ? "warehouse" : isFactory ? "factory" : "boss");

  return (
    <div className="relative">
      {/* Top Dev/Admin Quick Role Switcher (Available for Boss to preview/simulate other roles) */}
      {isBoss && (
        <aside aria-label="Simulador de roles" className="bg-black/90 text-white px-4 py-2 flex items-center justify-between text-xs sticky top-0 z-50 backdrop-blur-md">
          <div className="flex items-center gap-2 font-bold">
            <ShieldCheck className="size-4 text-amber-400" />
            <span className="hidden sm:inline">Vista de Rol:</span>
          </div>

          <div className="flex items-center gap-1.5 bg-white/10 p-1 rounded-full text-[11px] font-bold">
            <button
              onClick={() => setActiveRoleViewOverride("boss")}
              className={`px-3 py-1 rounded-full transition-all ${
                activeView === "boss" ? "bg-amber-400 text-black shadow-xs font-black" : "text-gray-300 hover:text-white"
              }`}
            >
              👑 Jefe
            </button>
            <button
              onClick={() => setActiveRoleViewOverride("warehouse")}
              className={`px-3 py-1 rounded-full transition-all ${
                activeView === "warehouse" ? "bg-amber-400 text-black shadow-xs font-black" : "text-gray-300 hover:text-white"
              }`}
            >
              📦 Bodega
            </button>
            <button
              onClick={() => setActiveRoleViewOverride("factory")}
              className={`px-3 py-1 rounded-full transition-all ${
                activeView === "factory" ? "bg-amber-400 text-black shadow-xs font-black" : "text-gray-300 hover:text-white"
              }`}
            >
              🏭 Fábrica
            </button>
          </div>
        </aside>
      )}

      {/* Render role-specific dashboard */}
      {activeView === "warehouse" ? (
        <WarehouseDispatchCollectorView />
      ) : activeView === "factory" ? (
        <FactoryDispatchView />
      ) : (
        <InventoryDashboardView />
      )}
    </div>
  );
}

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · Operaciones & Inventario" },
      {
        name: "description",
        content: "Panel de control de inventario, despachos con derivadas y recaudos.",
      },
      { property: "og:title", content: "Dashboard · Operaciones & Inventario" },
    ],
  }),
  component: DynamicDashboardRouter,
});
