import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/features/auth/session";
import { DEFAULT_CENTRO_UUID, DEFAULT_LA_USA_UUID } from "@/features/sales/use-sales-data";

export interface DailyExpenseItem {
  id: string;
  amount: number;
  notes: string;
  createdAt: string;
  storeId?: string;
  storeName?: string;
}

export interface DailyPaymentItem {
  id: string;
  amount: number;
  notes?: string | null;
  createdAt: string;
  storeId?: string;
  storeName?: string;
}

export interface DayLiquidation {
  dateKey: string; // YYYY-MM-DD
  dateDisplay: string; // e.g. "Hoy, 10 Nov" o "9 Nov 2026"
  isToday: boolean;
  totalRecaudado: number;
  lastRecaudoAt: string | null; // e.g. "11:45 PM"
  lastRecaudoTimestamp: string | null;
  totalGastos: number;
  gananciaNeta: number; // totalRecaudado - totalGastos
  paymentsCount: number;
  expensesCount: number;
  payments: DailyPaymentItem[];
  expenses: DailyExpenseItem[];
}

export function useLiquidacionesData() {
  const queryClient = useQueryClient();
  const { user } = useSession();

  // 1. Consultar todos los pagos confirmados
  const paymentsQuery = useQuery({
    queryKey: ["liquidaciones_payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          id,
          amount,
          status,
          notes,
          created_at,
          store_id,
          stores (id, name)
        `)
        .eq("status", "confirmed")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        amount: Number(row.amount || 0),
        notes: row.notes,
        createdAt: row.created_at,
        storeId: row.store_id,
        storeName: row.stores?.name || "Tienda",
      })) as DailyPaymentItem[];
    },
  });

  // 2. Consultar todos los gastos registrados en account_entries (entry_type = 'expense')
  const expensesQuery = useQuery({
    queryKey: ["liquidaciones_expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("account_entries")
        .select(`
          id,
          amount,
          notes,
          created_at,
          store_id,
          stores (id, name)
        `)
        .eq("entry_type", "expense")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Error fetching account_entries expenses:", error);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        amount: Number(row.amount || 0),
        notes: row.notes || "Gasto general",
        createdAt: row.created_at,
        storeId: row.store_id,
        storeName: row.stores?.name || "General",
      })) as DailyExpenseItem[];
    },
  });

  // 3. Consultar tiendas para asignación de gastos
  const storesQuery = useQuery({
    queryKey: ["liquidaciones_stores"],
    queryFn: async () => {
      const { data } = await supabase
        .from("stores")
        .select("id, name, status")
        .eq("status", "active")
        .order("name");
      const list = data || [];
      if (list.length > 0) return list;
      return [
        { id: DEFAULT_CENTRO_UUID, name: "Centro" },
        { id: DEFAULT_LA_USA_UUID, name: "La Usa" },
      ];
    },
  });

  // Suscripción en tiempo real a pagos y gastos
  useEffect(() => {
    const channel = supabase
      .channel("liquidaciones_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["liquidaciones_payments"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "account_entries" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["liquidaciones_expenses"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // 4. Mutación para agregar un gasto diario
  const addExpenseMutation = useMutation({
    mutationFn: async ({
      amount,
      notes,
      storeId,
      date,
    }: {
      amount: number;
      notes: string;
      storeId?: string;
      date?: string; // YYYY-MM-DD
    }) => {
      // Resolver categoría fallback para cumplir la foreign key
      const { data: cats } = await supabase
        .from("product_categories")
        .select("id")
        .limit(1);
      const fallbackCatId = cats?.[0]?.id || "33333333-3333-3333-3333-333333333333";

      let targetStoreId = storeId;
      if (!targetStoreId) {
        const { data: s } = await supabase
          .from("stores")
          .select("id")
          .not("name", "ilike", "%prueba%")
          .limit(1);
        targetStoreId = s?.[0]?.id || DEFAULT_CENTRO_UUID;
      }

      // Si se especificó una fecha, creamos el timestamp con la hora actual en esa fecha
      let createdAtTimestamp = new Date().toISOString();
      if (date) {
        const now = new Date();
        const [year, month, day] = date.split("-").map(Number);
        const customDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
        createdAtTimestamp = customDate.toISOString();
      }

      const { data: authUser } = await supabase.auth.getUser();
      const currentUserId = authUser?.user?.id || user?.id || null;

      const { data, error } = await supabase
        .from("account_entries")
        .insert({
          store_id: targetStoreId,
          category_id: fallbackCatId,
          entry_type: "expense",
          amount: Math.abs(amount),
          notes: notes.trim() || "Gasto operativo",
          created_by: currentUserId,
          created_at: createdAtTimestamp,
        })
        .select("id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["liquidaciones_expenses"] });
    },
  });

  // 5. Mutación para eliminar un gasto
  const deleteExpenseMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      const { error } = await supabase
        .from("account_entries")
        .delete()
        .eq("id", expenseId)
        .eq("entry_type", "expense");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["liquidaciones_expenses"] });
    },
  });

  // 6. Agrupación por día (de más reciente a más antiguo)
  const dailyLiquidaciones = useMemo(() => {
    const payments = paymentsQuery.data || [];
    const expenses = expensesQuery.data || [];

    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);

    const mapByDate: Record<
      string,
      {
        payments: DailyPaymentItem[];
        expenses: DailyExpenseItem[];
        lastPaymentTime: string | null;
      }
    > = {};

    // Asegurar que hoy siempre exista en el mapa
    mapByDate[todayKey] = {
      payments: [],
      expenses: [],
      lastPaymentTime: null,
    };

    // Agrupar pagos por fecha
    payments.forEach((p) => {
      const dateKey = p.createdAt.slice(0, 10);
      if (!mapByDate[dateKey]) {
        mapByDate[dateKey] = { payments: [], expenses: [], lastPaymentTime: null };
      }
      mapByDate[dateKey].payments.push(p);

      // El último recaudo de ese día (el más tardío / hacia la medianoche)
      if (
        !mapByDate[dateKey].lastPaymentTime ||
        new Date(p.createdAt) > new Date(mapByDate[dateKey].lastPaymentTime!)
      ) {
        mapByDate[dateKey].lastPaymentTime = p.createdAt;
      }
    });

    // Agrupar gastos por fecha
    expenses.forEach((e) => {
      const dateKey = e.createdAt.slice(0, 10);
      if (!mapByDate[dateKey]) {
        mapByDate[dateKey] = { payments: [], expenses: [], lastPaymentTime: null };
      }
      mapByDate[dateKey].expenses.push(e);
    });

    // Convertir a array ordenado descendente por fecha
    const sortedKeys = Object.keys(mapByDate).sort((a, b) => b.localeCompare(a));

    return sortedKeys.map((dateKey) => {
      const entry = mapByDate[dateKey];
      const isToday = dateKey === todayKey;

      const dateObj = new Date(dateKey + "T12:00:00");
      const dateDisplay = isToday
        ? "Hoy"
        : dateObj.toLocaleDateString("es-ES", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
          });

      const totalRecaudado = entry.payments.reduce((sum, p) => sum + p.amount, 0);
      const totalGastos = entry.expenses.reduce((sum, e) => sum + e.amount, 0);
      const gananciaNeta = totalRecaudado - totalGastos;

      let lastRecaudoAt: string | null = null;
      if (entry.lastPaymentTime) {
        const timeObj = new Date(entry.lastPaymentTime);
        lastRecaudoAt = timeObj.toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      }

      return {
        dateKey,
        dateDisplay,
        isToday,
        totalRecaudado,
        lastRecaudoAt,
        lastRecaudoTimestamp: entry.lastPaymentTime,
        totalGastos,
        gananciaNeta,
        paymentsCount: entry.payments.length,
        expensesCount: entry.expenses.length,
        payments: entry.payments,
        expenses: entry.expenses,
      } as DayLiquidation;
    });
  }, [paymentsQuery.data, expensesQuery.data]);

  // Totales acumulados
  const summaryTotals = useMemo(() => {
    let grandRecaudado = 0;
    let grandGastos = 0;

    dailyLiquidaciones.forEach((d) => {
      grandRecaudado += d.totalRecaudado;
      grandGastos += d.totalGastos;
    });

    const grandGananciaNeta = grandRecaudado - grandGastos;

    return {
      grandRecaudado,
      grandGastos,
      grandGananciaNeta,
    };
  }, [dailyLiquidaciones]);

  return {
    dailyLiquidaciones,
    summaryTotals,
    stores: storesQuery.data || [],
    isLoading: paymentsQuery.isLoading || expensesQuery.isLoading,
    addExpense: addExpenseMutation.mutateAsync,
    isAddingExpense: addExpenseMutation.isPending,
    deleteExpense: deleteExpenseMutation.mutateAsync,
    isDeletingExpense: deleteExpenseMutation.isPending,
  };
}

