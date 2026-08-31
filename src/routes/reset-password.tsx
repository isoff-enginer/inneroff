import { createFileRoute, useRouter } from "@tanstack/react-router";
import { KeyRound, Loader2, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/features/auth/session";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [{ title: "Restablecer contraseña · Reserva Operaciones" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: sessionLoading, signOut } = useSession();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Si la sesión ya cargó y no está autenticado (y no es un recovery redirect), no debería estar aquí.
    // Supabase automáticamente establece la sesión al entrar con un link de recovery.
    // Damos un tiempo de gracia mientras Supabase parsea el hash.
    const timer = setTimeout(() => {
      if (!sessionLoading && !isAuthenticated) {
        toast.error("El enlace de recuperación es inválido o ha expirado.");
        router.navigate({ to: "/login" });
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, sessionLoading, router]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        throw error;
      }

      toast.success("Contraseña actualizada exitosamente. Inicia sesión nuevamente.");
      await signOut(); // Cerramos sesión para que ingrese manualmente con la nueva clave.
      router.navigate({ to: "/login" });
    } catch (err: any) {
      console.error(err);
      toast.error("Ocurrió un error al actualizar la contraseña.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sessionLoading || !isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/40">
        <Loader2 className="size-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <div className="surface w-full max-w-sm p-7">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary">
          <KeyRound className="size-5 text-primary-foreground" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-xl font-semibold tracking-tight">Crear nueva contraseña</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Ingresa tu nueva contraseña para acceder al sistema.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleUpdatePassword}>
          <div className="space-y-2">
            <Label htmlFor="password">Nueva contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                required
                minLength={6}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSubmitting}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
            <Input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isSubmitting}
              required
              minLength={6}
            />
          </div>

          <Button type="submit" className="w-full mt-2" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Actualizando...
              </>
            ) : (
              "Actualizar contraseña"
            )}
          </Button>
        </form>
      </div>
    </main>
  );
}
