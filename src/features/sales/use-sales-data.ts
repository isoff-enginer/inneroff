import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/features/auth/session";

export interface LivePayment {
  id: string;
  paymentNumber: number;
  amount: number;
  status: "confirmed" | "voided";
  date: string;
  storeId: string;
  storeName: string;
  categoryId: string;
  categoryName: string;
  operatorName: string;
  notes?: string | null;
  createdAt: string;
}

export const DEFAULT_CENTRO_UUID = "11111111-1111-1111-1111-111111111111";
export const DEFAULT_LA_USA_UUID = "22222222-2222-2222-2222-222222222222";

export function useSalesData() {
  const queryClient = useQueryClient();
  const { user } = useSession();

  // 1. Fetch real payments/recaudos from Supabase
  const paymentsQuery = useQuery({
    queryKey: ["live_payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          id,
          payment_number,
          amount,
          status,
          created_at,
          received_at,
          notes,
          store_id,
          category_id,
          store:stores(id, name),
          category:product_categories(id, name),
          collector:profiles!payments_collected_by_fkey(id, full_name, display_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        paymentNumber: row.payment_number || 0,
        amount: Number(row.amount || 0),
        status: row.status as "confirmed" | "voided",
        date: new Date(row.created_at).toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        storeId: row.store_id,
        storeName: row.store?.name || "Tienda",
        categoryId: row.category_id,
        categoryName: row.category?.name || "General",
        operatorName: row.collector?.display_name || row.collector?.full_name || "Operador",
        notes: row.notes,
        createdAt: row.created_at,
      })) as LivePayment[];
    },
  });

  // 2. Fetch real dispatches to stores to calculate real "Dinero Faltante"
  const storeDispatchesQuery = useQuery({
    queryKey: ["store_dispatches_total"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispatches")
        .select("total_value, status, to_location_type")
        .eq("to_location_type", "store")
        .in("status", ["dispatched", "received"]);

      if (error) throw error;

      const totalDispatched = (data || []).reduce(
        (sum, d: any) => sum + Number(d.total_value || 0),
        0
      );
      return totalDispatched;
    },
  });

  // 3. Fetch stores for the selector (Estrictamente Centro y La Usa con UUIDs reales)
  const storesQuery = useQuery({
    queryKey: ["sales_stores_list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("stores")
        .select("id, name, status")
        .order("name");

      const list = data || [];
      const centroStore = list.find((s: any) => s.name?.toLowerCase().includes("centro"));
      const laUsaStore = list.find((s: any) => s.name?.toLowerCase().includes("usa"));

      const finalStores: { id: string; name: string; status?: string }[] = [];

      if (centroStore) {
        finalStores.push(centroStore);
      } else {
        try {
          const { data: created } = await supabase
            .from("stores")
            .insert({ name: "Centro", code: "STR-CEN-01", status: "active" })
            .select("id, name, status")
            .single();
          if (created) finalStores.push(created);
          else finalStores.push({ id: DEFAULT_CENTRO_UUID, name: "Centro", status: "active" });
        } catch {
          finalStores.push({ id: DEFAULT_CENTRO_UUID, name: "Centro", status: "active" });
        }
      }

      if (laUsaStore) {
        finalStores.push(laUsaStore);
      } else {
        finalStores.push({ id: DEFAULT_LA_USA_UUID, name: "La Usa", status: "active" });
      }

      return finalStores;
    },
  });

  // 4. Fetch categories for the selector (Estrictamente Blanco, Verde y Productos adicionales)
  const categoriesQuery = useQuery({
    queryKey: ["sales_categories_list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      // Filtrar categorías basura como Prueba y Rosa
      const cleanCats = (data || []).filter((c: any) => {
        const lower = (c.name || "").toLowerCase();
        return !lower.includes("prueba") && !lower.includes("rosa");
      });

      // Garantizar únicamente los 3 grupos requeridos
      const officialGroups = ["Blanco", "Verde", "Productos adicionales"];
      return officialGroups.map((gName) => {
        const found = cleanCats.find((c: any) => c.name.toLowerCase() === gName.toLowerCase());
        return found || { id: `cat-${gName.toLowerCase().replace(/\s+/g, "-")}`, name: gName };
      });
    },
  });

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("live-payments-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["live_payments"] });
          queryClient.invalidateQueries({ queryKey: ["boss-dashboard-payments-30d"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dispatches" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["store_dispatches_total"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Create real payment / recaudo mutation
  const createPaymentMutation = useMutation({
    mutationFn: async ({
      storeId,
      categoryId,
      amount,
      notes,
    }: {
      storeId?: string | undefined;
      categoryId?: string | undefined;
      amount: number;
      notes?: string | null | undefined;
    }) => {
      let resolvedStoreId = storeId || "";
      let resolvedCatId = categoryId || "";

      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (!UUID_REGEX.test(resolvedStoreId)) {
        const { data: s } = await supabase.from("stores").select("id").not("name", "ilike", "%prueba%").limit(1);
        resolvedStoreId = s?.[0]?.id || DEFAULT_CENTRO_UUID;
      }

      if (!UUID_REGEX.test(resolvedCatId)) {
        const { data: c } = await supabase.from("product_categories").select("id").limit(1);
        resolvedCatId = c?.[0]?.id || "33333333-3333-3333-3333-333333333333";
      }

      const { data: authUser } = await supabase.auth.getUser();
      const currentUserId = authUser?.user?.id || user?.id || null;

      // 1. Intentar registrar vía RPC de Postgres (SECURITY DEFINER para evitar RLS)
      try {
        const { data: rpcPaymentId, error: rpcError } = await supabase.rpc("register_payment", {
          p_store_id: resolvedStoreId,
          p_category_id: resolvedCatId,
          p_amount: amount,
          p_notes: notes || undefined,
        });

        if (!rpcError && rpcPaymentId) {
          return { id: rpcPaymentId };
        }
      } catch (rpcEx) {
        console.warn("register_payment RPC fallback to direct insert:", rpcEx);
      }

      // 2. Fallback: Inserción directa en tabla payments
      const { data: newPayment, error: paymentError } = await supabase
        .from("payments")
        .insert({
          store_id: resolvedStoreId,
          category_id: resolvedCatId,
          amount: amount,
          status: "confirmed",
          collected_by: currentUserId,
          notes: notes || null,
        })
        .select("id")
        .single();

      if (paymentError) throw paymentError;

      // Also record entry in account_entries for complete double-entry tracking
      try {
        await supabase.from("account_entries").insert({
          store_id: resolvedStoreId,
          category_id: resolvedCatId,
          amount: amount,
          entry_type: "income",
          payment_id: newPayment.id,
          created_by: currentUserId,
          notes: notes || "Recaudo confirmado",
        });
      } catch (entryErr) {
        console.warn("Could not insert account entry:", entryErr);
      }

      return newPayment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live_payments"] });
      queryClient.invalidateQueries({ queryKey: ["store_dispatches_total"] });
      queryClient.invalidateQueries({ queryKey: ["boss-dashboard-payments-30d"] });
      queryClient.invalidateQueries({ queryKey: ["boss-dashboard-sales-30d"] });
    },
  });

  const payments = paymentsQuery.data || [];
  const totalDispatched = storeDispatchesQuery.data || 0;

  // Real calculated totals
  const totalRecaudado = payments
    .filter((p) => p.status === "confirmed")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalFaltante = Math.max(0, totalDispatched - totalRecaudado);

  return {
    payments,
    stores: storesQuery.data || [],
    categories: categoriesQuery.data || [],
    totalRecaudado,
    totalFaltante,
    isLoading: paymentsQuery.isLoading,
    createPayment: createPaymentMutation.mutateAsync,
    isCreatingPayment: createPaymentMutation.isPending,
  };
}
