import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useBossDashboardData() {
  const queryClient = useQueryClient();

  const salesQuery = useQuery({
    queryKey: ["boss-dashboard-sales"],
    queryFn: async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("account_entries")
        .select("amount")
        .gte("created_at", startOfDay.toISOString());
      if (error) throw error;
      return data.reduce((sum, row) => sum + Number(row.amount), 0);
    },
  });

  const inventoryQuery = useQuery({
    queryKey: ["boss-dashboard-inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_balances")
        .select(`
          quantity,
          products ( unit_value )
        `);
      if (error) throw error;
      return data.reduce((sum, row) => {
        const val =
          row.products && typeof row.products === "object" && "unit_value" in row.products
            ? Number((row.products as any).unit_value)
            : 0;
        return sum + Number(row.quantity) * val;
      }, 0);
    },
  });

  const dispatchesQuery = useQuery({
    queryKey: ["boss-dashboard-dispatches"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("dispatches")
        .select("*", { count: "exact", head: true })
        .in("status", ["pending", "dispatched"]);
      if (error) throw error;
      return count || 0;
    },
  });

  const recentDispatchesQuery = useQuery({
    queryKey: ["boss-dashboard-recent-dispatches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispatches")
        .select(`
          id, dispatch_number, status, total_value, created_at,
          from_location_type, to_location_type,
          from_factory:factories!dispatches_from_factory_id_fkey(name),
          from_store:stores!dispatches_from_store_id_fkey(name),
          from_warehouse:warehouses!dispatches_from_warehouse_id_fkey(name),
          to_factory:factories!dispatches_to_factory_id_fkey(name),
          to_store:stores!dispatches_to_store_id_fkey(name),
          to_warehouse:warehouses!dispatches_to_warehouse_id_fkey(name)
        `)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      return data.map((d: any) => ({
        id: d.id,
        number: d.dispatch_number,
        status: d.status,
        fromName: d.from_factory?.name || d.from_store?.name || d.from_warehouse?.name || "Desconocido",
        fromType: d.from_location_type,
        toName: d.to_factory?.name || d.to_store?.name || d.to_warehouse?.name || "Desconocido",
        toType: d.to_location_type,
        totalValue: d.total_value,
        date: new Date(d.created_at).toLocaleString("es-ES", {
          dateStyle: "short",
          timeStyle: "short",
        }),
      }));
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("boss-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "dispatches" }, () => {
        queryClient.invalidateQueries({ queryKey: ["boss-dashboard-dispatches"] });
        queryClient.invalidateQueries({ queryKey: ["boss-dashboard-recent-dispatches"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "account_entries" }, () => {
        queryClient.invalidateQueries({ queryKey: ["boss-dashboard-sales"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_balances" }, () => {
        queryClient.invalidateQueries({ queryKey: ["boss-dashboard-inventory"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    sales: salesQuery.data || 0,
    inventory: inventoryQuery.data || 0,
    activeDispatches: dispatchesQuery.data || 0,
    recentDispatches: recentDispatchesQuery.data || [],
    isLoading:
      salesQuery.isLoading ||
      inventoryQuery.isLoading ||
      dispatchesQuery.isLoading ||
      recentDispatchesQuery.isLoading,
  };
}

export function useStoreDashboardData(storeId?: string) {
  const queryClient = useQueryClient();

  const inventoryQuery = useQuery({
    queryKey: ["store-inventory", storeId],
    queryFn: async () => {
      if (!storeId) return 0;
      const { data, error } = await supabase
        .from("inventory_balances")
        .select(`quantity, products ( unit_value )`)
        .eq("store_id", storeId);
      if (error) throw error;
      return data.reduce((sum, row) => {
        const val =
          row.products && typeof row.products === "object" && "unit_value" in row.products
            ? Number((row.products as any).unit_value)
            : 0;
        return sum + Number(row.quantity) * val;
      }, 0);
    },
    enabled: !!storeId,
  });

  const salesQuery = useQuery({
    queryKey: ["store-sales", storeId],
    queryFn: async () => {
      if (!storeId) return 0;
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("account_entries")
        .select("amount")
        .eq("store_id", storeId)
        .gte("created_at", startOfDay.toISOString());
      if (error) throw error;
      return data.reduce((sum, row) => sum + Number(row.amount), 0);
    },
    enabled: !!storeId,
  });

  return {
    inventory: inventoryQuery.data || 0,
    sales: salesQuery.data || 0,
    isLoading: inventoryQuery.isLoading || salesQuery.isLoading,
  };
}

export function useWarehouseDashboardData(warehouseId?: string) {
  const queryClient = useQueryClient();

  const inventoryQuery = useQuery({
    queryKey: ["warehouse-inventory", warehouseId],
    queryFn: async () => {
      if (!warehouseId) return 0;
      const { data, error } = await supabase
        .from("inventory_balances")
        .select(`quantity, products ( unit_value )`)
        .eq("warehouse_id", warehouseId);
      if (error) throw error;
      return data.reduce((sum, row) => {
        const val =
          row.products && typeof row.products === "object" && "unit_value" in row.products
            ? Number((row.products as any).unit_value)
            : 0;
        return sum + Number(row.quantity) * val;
      }, 0);
    },
    enabled: !!warehouseId,
  });

  return {
    inventory: inventoryQuery.data || 0,
    isLoading: inventoryQuery.isLoading,
  };
}

export function useFactoryDashboardData(factoryId?: string) {
  const queryClient = useQueryClient();

  const inventoryQuery = useQuery({
    queryKey: ["factory-inventory", factoryId],
    queryFn: async () => {
      if (!factoryId) return 0;
      const { data, error } = await supabase
        .from("inventory_balances")
        .select(`quantity, products ( unit_value )`)
        .eq("factory_id", factoryId);
      if (error) throw error;
      return data.reduce((sum, row) => {
        const val =
          row.products && typeof row.products === "object" && "unit_value" in row.products
            ? Number((row.products as any).unit_value)
            : 0;
        return sum + Number(row.quantity) * val;
      }, 0);
    },
    enabled: !!factoryId,
  });

  return {
    inventory: inventoryQuery.data || 0,
    isLoading: inventoryQuery.isLoading,
  };
}
