import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import type { AppRole, SessionUser } from "@/types/domain";

/**
 * Contexto de sesión de la UI.
 *
 * ETAPA 1: no hay autenticación. El usuario aquí es un placeholder visual y
 * está claramente separado de Supabase. Cuando se conecte Supabase Auth, este
 * provider debe alimentarse de `supabase.auth` + tabla `profiles`, sin cambiar
 * la API que consumen los componentes.
 */

const PLACEHOLDER_USER: SessionUser = {
  id: "placeholder",
  fullName: "Invitado",
  displayName: "Invitado",
  role: "boss",
};

interface SessionContextValue {
  user: SessionUser;
  role: AppRole;
  /** Solo para previsualizar la experiencia por rol mientras no hay auth. */
  setRole: (role: AppRole) => void;
  isAuthenticated: boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<AppRole>(PLACEHOLDER_USER.role);

  const value = useMemo<SessionContextValue>(
    () => ({
      user: { ...PLACEHOLDER_USER, role },
      role,
      setRole,
      isAuthenticated: false,
    }),
    [role],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de <SessionProvider>");
  return ctx;
}
