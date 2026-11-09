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

  // 3. Fetch stores for the selector (Centro y La Usa)
  const storesQuery = useQuery({
    queryKey: ["sales_stores_list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, status")
        .neq("status", "inactive")
        .order("name");
      if (error || !data || data.length === 0) {
        return [
          { id: "store-centro", name: "Centro" },
          { id: "store-la-usa", name: "La Usa" },
        ];
      }
      return data;
    },
  });

  // 4. Fetch categories for the selector
  const categoriesQuery = useQuery({
    queryKey: ["sales_categories_list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
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
      storeId?: string;
      categoryId?: string;
      amount: number;
      notes?: string;
    }) => {
      let resolvedStoreId = storeId || "";
      let resolvedCatId = categoryId || "";

      if (!resolvedStoreId) {
        const { data: s } = await supabase.from("stores").select("id").neq("status", "inactive").limit(1);
        resolvedStoreId = s?.[0]?.id || "";
      }

      if (!resolvedCatId) {
        const { data: c } = await supabase.from("product_categories").select("id").limit(1);
        resolvedCatId = c?.[0]?.id || "";
      }

      const { data: authUser } = await supabase.auth.getUser();
      const currentUserId = authUser?.user?.id || user?.id || null;

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
