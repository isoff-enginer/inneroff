import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole, SessionUser } from "@/types/domain";
import { toast } from "sonner";

interface SessionContextValue {
  user: SessionUser | null;
  role: AppRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  registerDevice: (pin: string) => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const SESSION_CACHE_KEY = "inneroff_session_cache_v1";

function readCachedUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.id && parsed.role) return parsed as SessionUser;
  } catch {
    // ignore
  }
  return null;
}

function writeCachedUser(u: SessionUser | null) {
  if (typeof window === "undefined") return;
  try {
    if (u) {
      window.localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(u));
    } else {
      window.localStorage.removeItem(SESSION_CACHE_KEY);
    }
  } catch {
    // ignore
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => readCachedUser());
  const [isLoading, setIsLoading] = useState<boolean>(() => !readCachedUser());

  useEffect(() => {
    let mounted = true;
    let lastFetchedUserId: string | null = null;

    async function fetchProfile(userId: string) {
      lastFetchedUserId = userId;
      try {
        const [
          { data: profile, error },
          { data: storeUser },
          { data: warehouseUser },
          { data: factoryUser },
        ] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", userId).single(),
          supabase.from("store_users").select("store_id").eq("user_id", userId).maybeSingle(),
          supabase.from("warehouse_users").select("warehouse_id").eq("user_id", userId).maybeSingle(),
          supabase.from("factory_users").select("factory_id").eq("user_id", userId).maybeSingle(),
        ]);

        if (error) throw error;

        if (profile) {
          if (profile.status !== "active") {
            toast.error("Tu cuenta no está activa.");
            writeCachedUser(null);
            await supabase.auth.signOut();
            if (mounted) {
              setUser(null);
              setIsLoading(false);
            }
            return;
          }

          if (mounted) {
            const nextUser: SessionUser = {
              id: profile.id,
              fullName: profile.full_name,
              displayName: profile.display_name || undefined,
              role: profile.role as AppRole,
              avatarUrl: profile.avatar_url || undefined,
              storeId: storeUser?.store_id || undefined,
              warehouseId: warehouseUser?.warehouse_id || undefined,
              factoryId: factoryUser?.factory_id || undefined,
            };
            setUser(nextUser);
            writeCachedUser(nextUser);
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    async function loadSession() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          writeCachedUser(null);
          if (mounted) {
            setUser(null);
            setIsLoading(false);
          }
        }
      } catch (error) {
        console.error("Error loading session:", error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT") {
          lastFetchedUserId = null;
          writeCachedUser(null);
          if (mounted) {
            setUser(null);
            setIsLoading(false);
          }
        } else if ((event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") && session) {
          // Evitar doble consulta redundante si loadSession ya consultó este mismo usuario
          if (lastFetchedUserId === session.user.id) return;
          await fetchProfile(session.user.id);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setIsLoading(true);
    writeCachedUser(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err: any) {
      console.error("[Auth] Sign out failed:", err);
      toast.error("Error al cerrar sesión.");
      setIsLoading(false);
    }
  };

  const registerDevice = async (pin: string) => {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      throw new Error("Device registration is only available in the browser.");
    }
    if (!user) {
      throw new Error("Must be logged in to register device.");
    }
    try {
      const { DeviceRegistrationService } = await import('@/features/devices/services/DeviceRegistrationService');
      const service = new DeviceRegistrationService();
      await service.registerCurrentDevice(pin, navigator.userAgent);
      toast.success("Dispositivo registrado de forma segura.");
    } catch (err) {
      console.error("Device registration failed:", err);
      toast.error("Error al registrar el dispositivo.");
      throw err;
    }
  };

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      role: user?.role || null,
      isAuthenticated: !!user,
      isLoading,
      signOut,
      registerDevice,
    }),
    [user, isLoading],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de <SessionProvider>");
  return ctx;
}
