import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ShieldCheck, Eye, EyeOff, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/features/auth/session";
import { checkClientRateLimit, sanitizeInput } from "@/lib/security";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión · Reserva Operaciones" },
      {
        name: "description",
        content: "Acceso seguro al sistema de operaciones, inventario y despachos.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { isAuthenticated, isLoading: sessionLoading } = useSession();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.navigate({ to: "/dashboard" });
    }
  }, [isAuthenticated, router]);

  if (sessionLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#231934]">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-3 border-[#246bfd] border-t-transparent" />
          <span className="text-xs font-bold text-[#a497be]">Cargando sesión...</span>
        </div>
      </main>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = sanitizeInput(email);
    if (!cleanEmail || !password) {
      toast.error("Por favor, ingresa correo y contraseña.");
      return;
    }

    // Anti brute-force client rate limit (5 attempts per 30s)
    const rateCheck = checkClientRateLimit(`auth_attempt_${cleanEmail}`, 5, 30000);
    if (!rateCheck.allowed) {
      toast.error("Demasiados intentos. Por seguridad espera 30 segundos.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Credenciales incorrectas.");
        } else {
          toast.error(error.message || "Ocurrió un error al iniciar sesión.");
        }
      } else {
        toast.success("Bienvenido al sistema");
      }
    } catch (err) {
      toast.error("Error de conexión. Intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#231934] px-5 py-12 selection:bg-[#246bfd]/30 text-white">
      <div className="w-full max-w-sm rounded-[32px] bg-[#2d2244] p-8 shadow-2xl border border-white/10">
        
        {/* Hourglass Icon Logo */}
        <div className="flex size-14 items-center justify-center rounded-2xl bg-[#246bfd] text-white shadow-lg shadow-[#246bfd]/30 mb-6">
          <span className="text-2xl">⏳</span>
        </div>

        <h1 className="text-2xl font-black tracking-tight text-white">
          Iniciar Sesión
        </h1>
        <p className="mt-1 text-xs font-medium text-[#a497be]">
          Acceso corporativo directo de Supabase Auth.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleLogin}>
          <div>
            <label className="text-[11px] font-bold text-[#a497be] uppercase tracking-wider block mb-1.5" htmlFor="email">
              Correo Corporativo
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="tu@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              required
              className="w-full bg-[#231934] border border-white/10 rounded-2xl p-3.5 text-sm font-medium text-white outline-none focus:border-[#246bfd] transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-[#a497be] uppercase tracking-wider" htmlFor="password">
                Contraseña
              </label>
              <Link to="/forgot-password" className="text-xs font-bold text-[#a497be] hover:text-white transition-colors">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                required
                className="w-full bg-[#231934] border border-white/10 rounded-2xl p-3.5 pr-11 text-sm font-medium text-white outline-none focus:border-[#246bfd] transition-colors"
              />
              <button
                type="button"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#a497be] hover:text-white"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSubmitting}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <Button 
              type="submit" 
              className="w-full h-13 rounded-2xl bg-[#246bfd] hover:bg-[#1a4ec8] text-white font-black text-sm tracking-wide shadow-lg shadow-[#246bfd]/30 active:scale-95 transition-transform" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Iniciando...
                </span>
              ) : (
                "Ingresar al Sistema →"
              )}
            </Button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-center gap-1.5 text-[11px] font-bold text-[#a497be]">
          <ShieldCheck className="size-4 text-[#8ec97b]" />
          <span>Conexión cifrada & autenticada</span>
        </div>
      </div>
    </main>
  );
}
