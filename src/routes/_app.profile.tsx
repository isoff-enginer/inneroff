import { createFileRoute, useRouter } from "@tanstack/react-router";
import { LogOut, Shield, Bell, CheckCircle2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/session";
import { ROLE_LABELS } from "@/types/domain";
import { requestAndSubscribePush } from "@/lib/push-notifications";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({
    meta: [
      { title: "Perfil · Reserva Operaciones" },
      {
        name: "description",
        content: "Datos del usuario, rol operativo y configuración de notificaciones.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, role, signOut } = useSession();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.navigate({ to: "/login" });
  };

  const handleTestNotifications = async () => {
    if (user?.id) {
      const ok = await requestAndSubscribePush(user.id);
      if (ok) {
        toast.success("Notificaciones push activadas correctamente en este dispositivo.");
      } else {
        toast.error("No se pudo activar las notificaciones. Verifica los permisos de tu navegador.");
      }
    }
  };

  const fullName = user?.fullName || "Usuario";
  const displayName = user?.displayName || fullName;
  const roleLabel = role ? ROLE_LABELS[role] : "Operador";

  return (
    <div className="mx-auto max-w-md space-y-6 pb-24 pt-4">
      {/* HEADER PROFILE */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Mi Perfil</h1>
        <p className="text-xs text-gray-500 font-medium">Información de la cuenta y rol asignado en el sistema.</p>
      </div>

      {/* USER CARD */}
      <section className="bg-white rounded-[28px] p-6 border border-gray-100 shadow-xs">
        <div className="flex items-center gap-4">
          <Avatar className="size-16 rounded-2xl border-2 border-white shadow-xs">
            <AvatarImage src={user?.avatarUrl} />
            <AvatarFallback className="rounded-2xl bg-amber-100 text-amber-900 font-bold text-lg">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-lg font-black text-gray-900 leading-tight">{fullName}</h2>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                {roleLabel}
              </span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="size-3" /> Activo
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 divide-y divide-gray-100 border-t border-gray-100 pt-1">
          <div className="flex items-center justify-between py-3 text-xs">
            <span className="font-bold text-gray-400 uppercase">Nombre visible</span>
            <span className="font-bold text-gray-900">{displayName}</span>
          </div>
          <div className="flex items-center justify-between py-3 text-xs">
            <span className="font-bold text-gray-400 uppercase">Rol operativo</span>
            <span className="font-bold text-gray-900">{roleLabel}</span>
          </div>
          <div className="flex items-center justify-between py-3 text-xs">
            <span className="font-bold text-gray-400 uppercase">Seguridad</span>
            <span className="font-bold text-emerald-600 flex items-center gap-1">
              <Shield className="size-3.5" /> PBKDF2 + AES-GCM
            </span>
          </div>
        </div>
      </section>

      {/* NOTIFICATIONS ACTION */}
      <section className="bg-white rounded-[28px] p-5 border border-gray-100 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
              <Bell className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900">Notificaciones Push</h3>
              <p className="text-[11px] text-gray-500">Recibe alertas en tiempo real sobre despachos y cobros</p>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={handleTestNotifications}
          className="w-full rounded-xl text-xs font-bold border-gray-200"
        >
          Verificar / Activar Notificaciones
        </Button>
      </section>

      {/* SIGN OUT */}
      <Button
        onClick={handleLogout}
        className="w-full h-12 rounded-2xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold text-sm"
      >
        <LogOut className="size-4 mr-2" />
        Cerrar Sesión
      </Button>
    </div>
  );
}
