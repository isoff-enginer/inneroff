import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/common/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSession } from "@/features/auth/session";
import { ROLE_LABELS } from "@/types/domain";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({
    meta: [
      { title: "Perfil · Reserva Operaciones" },
      {
        name: "description",
        content: "Datos del usuario, rol asignado y dispositivos autorizados en la operación.",
      },
      { property: "og:title", content: "Perfil · Reserva Operaciones" },
      {
        property: "og:description",
        content: "Datos del usuario, rol asignado y dispositivos autorizados.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, role } = useSession();

  const fields = [
    ["Nombre completo", user.fullName],
    ["Nombre visible", user.displayName ?? user.fullName],
    ["Rol", ROLE_LABELS[role]],
    ["Estado", "Activo"],
  ] as const;

  return (
    <>
      <PageHeader title="Perfil" description="Datos de sesión de demostración." />

      <section className="surface max-w-2xl p-6">
        <div className="flex items-center gap-4">
          <Avatar className="size-14">
            <AvatarFallback>{(user.displayName ?? user.fullName).slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-base font-semibold">{user.fullName}</p>
            <p className="text-sm text-muted-foreground">{ROLE_LABELS[role]}</p>
          </div>
        </div>

        <dl className="mt-6 divide-y divide-border border-t border-border">
          {fields.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 py-3">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="text-sm font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
