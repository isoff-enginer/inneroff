import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LiquidacionesView } from "@/features/liquidaciones/liquidaciones-view";
import { useSession } from "@/features/auth/session";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/liquidaciones")({
  head: () => ({
    meta: [{ title: "Liquidaciones & Cierre · Inner Off" }],
  }),
  component: LiquidacionesPage,
});

function LiquidacionesPage() {
  const { role } = useSession();
  const navigate = useNavigate();

  // "eso lo puede ver solo el jefe"
  const isBoss = role === "boss" || role === "boss_admin" || role === "operations_admin";

  if (!isBoss) {
    return (
      <div className="min-h-screen bg-[#0B0E14] text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="size-16 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
          <ShieldAlert className="size-8" />
        </div>
        <h2 className="text-xl font-black">Acceso Exclusivo para el Jefe</h2>
        <p className="text-sm text-slate-400 max-w-xs">
          Esta sección de liquidaciones, cierres diarios a medianoche y registro de gastos solo está disponible para la dirección.
        </p>
        <Button
          onClick={() => navigate({ to: "/dashboard" })}
          className="bg-[#CCFF00] text-black font-black rounded-2xl h-11 px-6"
        >
          Volver al Inicio
        </Button>
      </div>
    );
  }

  return <LiquidacionesView />;
}

