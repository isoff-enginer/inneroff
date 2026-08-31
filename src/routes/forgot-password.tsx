import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert, Loader2, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [{ title: "Recuperar contraseña · Reserva Operaciones" }],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Por favor, ingresa tu correo corporativo.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      setIsSuccess(true);
      toast.success("Correo de recuperación enviado.");
    } catch (err: any) {
      console.error(err);
      // Evitamos decir si el correo existe o no por seguridad, pero mostramos un mensaje genérico.
      toast.error("Ocurrió un error. Verifica que el correo sea correcto e intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <div className="surface w-full max-w-sm p-7">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary">
          <ShieldAlert className="size-5 text-primary-foreground" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-xl font-semibold tracking-tight">Recuperar contraseña</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {isSuccess
            ? "Revisa tu bandeja de entrada. Te hemos enviado un enlace para restablecer tu contraseña."
            : "Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña."}
        </p>

        {!isSuccess ? (
          <form className="mt-6 space-y-4" onSubmit={handleReset}>
            <div className="space-y-2">
              <Label htmlFor="email">Correo corporativo</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="nombre@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Enviando enlace...
                </>
              ) : (
                "Enviar enlace de recuperación"
              )}
            </Button>
          </form>
        ) : (
          <div className="mt-6">
            <Button variant="outline" className="w-full" onClick={() => setIsSuccess(false)}>
              Intentar con otro correo
            </Button>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link to="/login" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 size-4" />
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </main>
  );
}
