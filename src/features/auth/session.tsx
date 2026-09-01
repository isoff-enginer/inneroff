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
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchProfile(userId: string) {
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
            await supabase.auth.signOut();
            if (mounted) {
              setUser(null);
              setIsLoading(false);
            }
            return;
          }

          if (mounted) {
            setUser({
              id: profile.id,
              fullName: profile.full_name,
              displayName: profile.display_name || undefined,
              role: profile.role as AppRole,
              avatarUrl: profile.avatar_url || undefined,
              storeId: storeUser?.store_id || undefined,
              warehouseId: warehouseUser?.warehouse_id || undefined,
              factoryId: factoryUser?.factory_id || undefined,
            });
            
            // Execute Device Registration asynchronously without blocking UI
            // import('../devices/services/DeviceRegistrationService').then(({ DeviceRegistrationService }) => {
            //   const deviceService = new DeviceRegistrationService();
            //   // Using a dummy PIN "0000" for Phase 5.1 tests as UI prompt is out of scope.
            //   deviceService.registerCurrentDevice("0000").catch(err => {
            //     console.error("Device Registration failed:", err);
            //   });
            // });
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast.error("Error al obtener el perfil.");
        if (mounted) setUser(null);
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
          if (mounted) {
            setUser(null);
            setIsLoading(false);
          }
        }
      } catch (error) {
        console.error("Error loading session:", error);
        if (mounted) {
          setUser(null);
          setIsLoading(false);
        }
      }
    }

    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT") {
          if (mounted) {
            setUser(null);
            setIsLoading(false);
          }
        } else if ((event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") && session) {
          setIsLoading(true);
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
    await supabase.auth.signOut();
  };

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      role: user?.role || null,
      isAuthenticated: !!user,
      isLoading,
      signOut,
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
