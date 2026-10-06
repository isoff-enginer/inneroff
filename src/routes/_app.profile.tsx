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
    <div className="mx-auto max-w-md space-y-6 pb-24 pt-4 px-5 text-white">
      {/* HEADER PROFILE */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Mi Perfil</h1>
        <p className="text-xs text-[#a497be] font-medium">Información de la cuenta y rol asignado en el sistema.</p>
      </div>

      {/* USER CARD */}
      <section className="bg-[#2d2244] rounded-[28px] p-6 border border-white/10 shadow-lg">
        <div className="flex items-center gap-4">
          <Avatar className="size-16 rounded-2xl border border-white/15 shadow-sm">
            <AvatarImage src={user?.avatarUrl} />
            <AvatarFallback className="rounded-2xl bg-gradient-to-br from-[#246bfd] to-[#1a4ec8] text-white font-bold text-lg">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-lg font-black text-white leading-tight">{fullName}</h2>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs font-bold text-[#246bfd] bg-[#246bfd]/15 px-2.5 py-0.5 rounded-full border border-[#246bfd]/30">
                {roleLabel}
              </span>
              <span className="text-xs font-bold text-[#8ec97b] bg-[#8ec97b]/15 px-2 py-0.5 rounded-full border border-[#8ec97b]/30 flex items-center gap-1">
                <CheckCircle2 className="size-3" /> Activo
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 divide-y divide-white/10 border-t border-white/10 pt-1">
          <div className="flex items-center justify-between py-3 text-xs">
            <span className="font-bold text-[#a497be] uppercase">Nombre visible</span>
            <span className="font-bold text-white">{displayName}</span>
          </div>
          <div className="flex items-center justify-between py-3 text-xs">
            <span className="font-bold text-[#a497be] uppercase">Rol operativo</span>
            <span className="font-bold text-white">{roleLabel}</span>
          </div>
          <div className="flex items-center justify-between py-3 text-xs">
            <span className="font-bold text-[#a497be] uppercase">Seguridad</span>
            <span className="font-bold text-[#8ec97b] flex items-center gap-1">
              <Shield className="size-3.5" /> PBKDF2 + AES-GCM
            </span>
          </div>
        </div>
      </section>

      {/* NOTIFICATIONS ACTION */}
      <section className="bg-[#2d2244] rounded-[28px] p-5 border border-white/10 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-[#246bfd]/20 text-[#246bfd] flex items-center justify-center border border-[#246bfd]/30">
              <Bell className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Notificaciones Push</h3>
              <p className="text-[11px] text-[#a497be]">Recibe alertas en tiempo real sobre despachos y cobros</p>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={handleTestNotifications}
          className="w-full rounded-2xl text-xs font-bold border-white/10 bg-[#231934] text-white hover:bg-[#1e152d]"
        >
          Verificar / Activar Notificaciones
        </Button>
      </section>

      {/* SIGN OUT */}
      <Button
        onClick={handleLogout}
        className="w-full h-12 rounded-2xl bg-[#f75555]/15 text-[#f75555] hover:bg-[#f75555]/25 border border-[#f75555]/30 font-bold text-sm"
      >
        <LogOut className="size-4 mr-2" />
        Cerrar Sesión
      </Button>
    </div>
  );
}
