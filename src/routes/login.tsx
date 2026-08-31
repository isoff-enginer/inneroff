import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión · Reserva Operaciones" },
      {
        name: "description",
        content: "Acceso restringido al panel interno de operación de fábrica, bodegas y tiendas.",
      },
      { property: "og:title", content: "Iniciar sesión · Reserva Operaciones" },
      {
        property: "og:description",
        content: "Acceso restringido al panel interno de operación.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <div className="surface w-full max-w-sm p-7">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary">
          <ShieldCheck className="size-5 text-primary-foreground" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-xl font-semibold tracking-tight">Acceso al sistema</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Pantalla visual. La autenticación se conectará con Supabase Auth.
        </p>

        <form className="mt-6 space-y-4" onSubmit={(event) => event.preventDefault()}>
          <div className="space-y-2">
            <Label htmlFor="email">Correo corporativo</Label>
            <Input id="email" type="email" autoComplete="email" placeholder="nombre@empresa.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" autoComplete="current-password" />
          </div>
          <Button type="submit" className="w-full" disabled>
            Ingresar
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/" className="underline underline-offset-4 hover:text-foreground">
            Ver el panel de demostración
          </Link>
        </p>
      </div>
    </main>
  );
}
