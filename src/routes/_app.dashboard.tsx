import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useSession } from "@/features/auth/session";
import { InventoryDashboardView } from "@/features/dashboard/components/InventoryDashboardView";
import { WarehouseDispatchCollectorView } from "@/features/dashboard/components/WarehouseDispatchCollectorView";
import { FactoryDispatchView } from "@/features/dashboard/components/FactoryDispatchView";
import { ShieldCheck } from "lucide-react";

function DynamicDashboardRouter() {
  const { user, role, isLoading } = useSession();
  const [activeRoleViewOverride, setActiveRoleViewOverride] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#231934]">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-3 border-[#246bfd] border-t-transparent" />
          <span className="text-xs font-bold text-[#a497be]">Cargando panel...</span>
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
    <div className="relative bg-[#231934] min-h-screen">
      {/* Top Dev/Admin Role Switcher */}
      {isBoss && (
        <aside aria-label="Simulador de roles" className="bg-[#1e152d] text-white px-4 py-2 flex items-center justify-between text-xs sticky top-0 z-50 border-b border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-2 font-bold text-[#a497be]">
            <ShieldCheck className="size-4 text-[#246bfd]" />
            <span className="hidden sm:inline">Modo de Rol:</span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#2d2244] p-1 rounded-full text-[11px] font-bold border border-white/10">
            <button
              onClick={() => setActiveRoleViewOverride("boss")}
              className={`px-3 py-1 rounded-full transition-all ${
                activeView === "boss" ? "bg-[#246bfd] text-white shadow-md shadow-[#246bfd]/30 font-black" : "text-[#a497be] hover:text-white"
              }`}
            >
              👑 Jefe
            </button>
            <button
              onClick={() => setActiveRoleViewOverride("warehouse")}
              className={`px-3 py-1 rounded-full transition-all ${
                activeView === "warehouse" ? "bg-[#246bfd] text-white shadow-md shadow-[#246bfd]/30 font-black" : "text-[#a497be] hover:text-white"
              }`}
            >
              📦 Bodega
            </button>
            <button
              onClick={() => setActiveRoleViewOverride("factory")}
              className={`px-3 py-1 rounded-full transition-all ${
                activeView === "factory" ? "bg-[#246bfd] text-white shadow-md shadow-[#246bfd]/30 font-black" : "text-[#a497be] hover:text-white"
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
