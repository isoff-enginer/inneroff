import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useBossDashboardData() {
  const queryClient = useQueryClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const salesQuery = useQuery({
    queryKey: ["boss-dashboard-sales-30d"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("account_entries")
        .select(`
          amount,
          created_at,
          store_id,
          category:product_categories(name),
          store:stores(name)
        `)
        .eq("entry_type", "income")
        .gte("created_at", thirtyDaysAgo.toISOString());
      
      if (error) throw error;
      return data;
    },
  });

  const paymentsQuery = useQuery({
    queryKey: ["boss-dashboard-payments-30d"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("amount, created_at")
        .gte("created_at", thirtyDaysAgo.toISOString());
      
      if (error) throw error;
      return data;
    },
  });

  const dispatchesStatsQuery = useQuery({
    queryKey: ["boss-dashboard-dispatches-stats-30d"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispatches")
        .select(`
          id, created_at, status, total_value, from_location_type,
          dispatch_items(quantity)
        `)
        .gte("created_at", thirtyDaysAgo.toISOString());
      
      if (error) throw error;
      return data;
    },
  });

  const inventoryQuery = useQuery({
    queryKey: ["boss-dashboard-inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_balances")
        .select(`
          quantity,
          products ( id, name, unit_value )
        `);
      if (error) throw error;
      return data;
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
        timestamp: new Date(d.created_at).getTime(),
      }));
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("boss-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "dispatches" }, () => {
        queryClient.invalidateQueries({ queryKey: ["boss-dashboard-dispatches-stats-30d"] });
        queryClient.invalidateQueries({ queryKey: ["boss-dashboard-recent-dispatches"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "account_entries" }, () => {
        queryClient.invalidateQueries({ queryKey: ["boss-dashboard-sales-30d"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => {
        queryClient.invalidateQueries({ queryKey: ["boss-dashboard-payments-30d"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_balances" }, () => {
        queryClient.invalidateQueries({ queryKey: ["boss-dashboard-inventory"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Procesamiento de métricas
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;

  // Ventas
  const salesData = salesQuery.data || [];
  let salesToday = 0;
  let salesYesterday = 0;
  
  // Agrupar ventas por día (últimos 30) para la gráfica
  const salesByDayMap = new Map<string, number>();
  
  // Categorías de ventas para el Pie Chart
  const salesByCategoryMap = new Map<string, number>();

  salesData.forEach((entry: any) => {
    const time = new Date(entry.created_at).getTime();
    const amount = Number(entry.amount);
    
    if (time >= startOfToday) {
      salesToday += amount;
    } else if (time >= startOfYesterday && time < startOfToday) {
      salesYesterday += amount;
    }

    // Chart de días
    const dateStr = new Date(entry.created_at).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    salesByDayMap.set(dateStr, (salesByDayMap.get(dateStr) || 0) + amount);

    // Donut de categorías (solo consideramos los últimos 30 días en general)
    const catName = entry.category?.name || 'Otros';
    salesByCategoryMap.set(catName, (salesByCategoryMap.get(catName) || 0) + amount);
  });

  // Rellenar días vacíos para el chart
  const salesChartData = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    salesChartData.push({
      date: dateStr,
      timestamp: d.getTime(),
      ventas: salesByDayMap.get(dateStr) || 0
    });
  }

  const categoryChartData = Array.from(salesByCategoryMap.entries()).map(([name, value]) => ({
    name,
    value
  })).sort((a, b) => b.value - a.value);

  const salesTrend = salesYesterday > 0 ? ((salesToday - salesYesterday) / salesYesterday) * 100 : 0;

  // Pagos (Recaudo)
  const paymentsData = paymentsQuery.data || [];
  let paymentsToday = 0;
  let paymentsYesterday = 0;
  paymentsData.forEach((entry: any) => {
    const time = new Date(entry.created_at).getTime();
    const amount = Number(entry.amount);
    if (time >= startOfToday) paymentsToday += amount;
    else if (time >= startOfYesterday && time < startOfToday) paymentsYesterday += amount;
  });
  const paymentsTrend = paymentsYesterday > 0 ? ((paymentsToday - paymentsYesterday) / paymentsYesterday) * 100 : 0;

  // Despachos (Pedidos)
  const dispatchesData = dispatchesStatsQuery.data || [];
  let dispatchesToday = 0;
  let dispatchesYesterday = 0;
  let warehouseDispatchCount = 0;
  let warehouseDispatchValue = 0;
  let warehouseDispatchProducts = 0;

  dispatchesData.forEach((entry: any) => {
    const time = new Date(entry.created_at).getTime();
    if (time >= startOfToday) {
      dispatchesToday++;
      // Contar despachos que salen de bodega hacia tiendas
      if (entry.from_location_type === 'warehouse') {
        warehouseDispatchCount++;
        warehouseDispatchValue += Number(entry.total_value || 0);
        
        // Sumar productos si los items vienen populados
        if (entry.dispatch_items && Array.isArray(entry.dispatch_items)) {
          entry.dispatch_items.forEach((item: any) => {
            warehouseDispatchProducts += Number(item.quantity || 0);
          });
        }
      }
    } else if (time >= startOfYesterday && time < startOfToday) {
      dispatchesYesterday++;
    }
  });
  const dispatchesTrend = dispatchesYesterday > 0 ? ((dispatchesToday - dispatchesYesterday) / dispatchesYesterday) * 100 : 0;
  
  const dispatchStats = {
    count: warehouseDispatchCount,
    value: warehouseDispatchValue,
    products: warehouseDispatchProducts,
  };

  // Inventario
  const rawInventory = inventoryQuery.data || [];
  let totalInventoryValue = 0;
  const criticalItemsMap = new Map<string, { id: string; name: string; quantity: number }>();

  rawInventory.forEach((row: any) => {
    const qty = Number(row.quantity);
    const product = row.products && typeof row.products === "object" ? row.products : null;
    const val = product && "unit_value" in product ? Number((product as any).unit_value) : 0;
    
    totalInventoryValue += qty * val;

    if (product && qty < 10) {
      const pid = (product as any).id;
      const existing = criticalItemsMap.get(pid);
      if (existing) {
        existing.quantity += qty;
      } else {
        criticalItemsMap.set(pid, {
          id: pid,
          name: (product as any).name || "Producto sin nombre",
          quantity: qty
        });
      }
    }
  });

  const criticalInventoryItems = Array.from(criticalItemsMap.values())
    .filter(item => item.quantity < 10)
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, 5);

  // Mezclar actividad reciente (Despachos y Ventas de hoy)
  let recentActivity: any[] = [];
  const recentDisps = recentDispatchesQuery.data || [];
  recentActivity = [...recentDisps.map((d: any) => ({ ...d, type: 'dispatch' }))];
  
  // Agregar hasta 5 ventas recientes
  const recentSales = salesData.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
  recentSales.forEach((s: any) => {
    recentActivity.push({
      id: `sale-${s.created_at}`,
      type: 'sale',
      amount: s.amount,
      category: s.category?.name || 'Venta',
      timestamp: new Date(s.created_at).getTime(),
      date: new Date(s.created_at).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })
    });
  });

  recentActivity.sort((a, b) => b.timestamp - a.timestamp);
  recentActivity = recentActivity.slice(0, 8); // top 8 activities

  // Agrupar ventas por tienda (solo hoy para la lista estilo "PAYMENTS")
  const storeSalesMap = new Map<string, { id: string; name: string; total: number }>();
  salesData.forEach((entry: any) => {
    const time = new Date(entry.created_at).getTime();
    if (time >= startOfToday && entry.store_id) {
      const storeName = entry.store?.name || 'Tienda Desconocida';
      const amount = Number(entry.amount);
      const existing = storeSalesMap.get(entry.store_id);
      if (existing) {
        existing.total += amount;
      } else {
        storeSalesMap.set(entry.store_id, { id: entry.store_id, name: storeName, total: amount });
      }
    }
  });
  const storeSales = Array.from(storeSalesMap.values()).sort((a, b) => b.total - a.total);

  return {
    salesToday,
    salesYesterday,
    salesTrend,
    paymentsToday,
    paymentsTrend,
    dispatchesToday,
    dispatchesTrend,
    dispatchStats,
    storeSales,
    totalInventoryValue,
    criticalInventoryItems,
    salesChartData,
    categoryChartData,
    recentActivity,
    isLoading:
      salesQuery.isLoading ||
      paymentsQuery.isLoading ||
      dispatchesStatsQuery.isLoading ||
      inventoryQuery.isLoading ||
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
