import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getProductPackagings } from "@/features/inventory/product-presentations";
import { showLocalNotification } from "@/lib/push-notifications";
import { formatCurrency } from "@/lib/format";

export interface ProductLiquidationStatus {
  productName: string;
  category: "Blanco" | "Verde" | "Productos adicionales";
  unitPrice: number;
  totalDispatchedQty: number; // unidades enviadas a tiendas
  totalDispatchedVal: number; // valor despachado a tiendas
  factoryDispatchedQty: number; // unidades despachadas de fábrica a bodega
  factoryDispatchedVal: number; // valor total despachado de fábrica a bodega
  lastFactoryDispatchVal: number; // valor del último despacho de fábrica
  totalPaidVal: number; // total recaudado
  pendingVal: number; // saldo pendiente de recaudo
  isFullyPaid: boolean; // ¿llegó al 100% recaudado?
  isBlocked: boolean; // Bloqueado para nuevos despachos de fábrica mientras falte dinero
  saleCompletedAmount: number; // monto concretado al 100%
}

export const CANONICAL_9_NAMES = [
  "Mamitas",
  "Tornillo",
  "Lisos",
  "Largos",
  "Minis",
  "Baldes",
  "Rojas",
  "Flores",
  "Pre-roll",
];

export interface GroupAmounts {
  blanco: number;
  verde: number;
  adicionales: number;
  adicionalesBreakdown: {
    rojas: number;
    flores: number;
    baldes: number;
    preroll: number;
  };
}

export interface CompletedSalesConsolidation {
  totalVentas: number;
  totalRecaudado: number;
  totalFaltante: number;
  totalVentasCompletadas: number;
  totalVentasPendientes: number;
  totalByGroup: GroupAmounts;
  recaudadoByGroup: GroupAmounts;
  pendingByGroup: GroupAmounts;
  completedByGroup: GroupAmounts;
  completedProducts: ProductLiquidationStatus[];
  pendingProducts: ProductLiquidationStatus[];
}

export interface LiquidationFilter {
  storeId?: string; // ID específico de tienda o vacío para todas
  startDate?: string; // YYYY-MM-DD o ISO
  endDate?: string;   // YYYY-MM-DD o ISO
}

export function useProductLiquidation(filter?: LiquidationFilter) {
  const query = useQuery({
    queryKey: ["product_liquidation_and_locks", filter?.storeId, filter?.startDate, filter?.endDate],
    queryFn: async () => {
      // 1 & 2. Obtener en paralelo todos los despachos (fábrica a bodega y bodega a tiendas) y pagos confirmados
      const [
        { data: dispatchesData, error: dispError },
        { data: paymentsData, error: payError },
      ] = await Promise.all([
        supabase
          .from("dispatches")
          .select(`
            id,
            status,
            created_at,
            from_location_type,
            to_location_type,
            to_store_id,
            dispatch_items (
              product_id,
              quantity,
              unit_value,
              total_value,
              products (name)
            )
          `)
          .in("status", ["dispatched", "received"])
          .order("created_at", { ascending: false }),
        supabase
          .from("payments")
          .select(`
            id,
            amount,
            status,
            notes,
            category_id,
            store_id,
            created_at,
            product_categories (name)
          `)
          .eq("status", "confirmed"),
      ]);

      if (dispError) throw dispError;
      if (payError) throw payError;

      // Estructura base para los 9 productos
      const statusMap: Record<string, ProductLiquidationStatus> = {};

      CANONICAL_9_NAMES.forEach((name) => {
        const details = getProductPackagings(name);
        statusMap[name] = {
          productName: name,
          category: details.groupLabel,
          unitPrice: details.unitPrice,
          totalDispatchedQty: 0,
          totalDispatchedVal: 0,
          factoryDispatchedQty: 0,
          factoryDispatchedVal: 0,
          lastFactoryDispatchVal: 0,
          totalPaidVal: 0,
          pendingVal: 0,
          isFullyPaid: true,
          isBlocked: false,
          saleCompletedAmount: 0,
        };
      });

      // Filtrar según sede y rango de fecha si se proveyeron
      const filteredDispatches = (dispatchesData || []).filter((d: any) => {
        if (filter?.storeId && d.to_location_type === "store" && d.to_store_id !== filter.storeId) {
          return false;
        }
        if (filter?.startDate) {
          const createdAt = new Date(d.created_at).getTime();
          const start = new Date(filter.startDate).getTime();
          if (createdAt < start) return false;
        }
        if (filter?.endDate) {
          const createdAt = new Date(d.created_at).getTime();
          const end = new Date(filter.endDate).getTime();
          if (createdAt > end) return false;
        }
        return true;
      });

      const filteredPayments = (paymentsData || []).filter((p: any) => {
        if (filter?.storeId && p.store_id !== filter.storeId) {
          return false;
        }
        if (filter?.startDate) {
          const createdAt = new Date(p.created_at).getTime();
          const start = new Date(filter.startDate).getTime();
          if (createdAt < start) return false;
        }
        if (filter?.endDate) {
          const createdAt = new Date(p.created_at).getTime();
          const end = new Date(filter.endDate).getTime();
          if (createdAt > end) return false;
        }
        return true;
      });

      // Acumular valores despachados tanto por Fábrica a Bodega como por Bodega a Tiendas
      filteredDispatches.forEach((d: any) => {
        const isFromFactoryToWarehouse = d.from_location_type === "factory" && d.to_location_type === "warehouse";
        const isToStore = d.to_location_type === "store";

        (d.dispatch_items || []).forEach((it: any) => {
          const rawName = it.products?.name || "";
          const details = getProductPackagings(rawName);
          const canonName = details.name;
          const target = statusMap[canonName];

          if (target) {
            const qty = Number(it.quantity || 0);
            const val = Number(it.total_value || (qty * (it.unit_value || details.unitPrice)));

            if (isFromFactoryToWarehouse) {
              target.factoryDispatchedQty += qty;
              target.factoryDispatchedVal += val;
              if (target.lastFactoryDispatchVal === 0) {
                target.lastFactoryDispatchVal = val;
              }
            }

            if (isToStore) {
              target.totalDispatchedQty += qty;
              target.totalDispatchedVal += val;
            }
          }
        });
      });

      // Acumular pagos por producto individual o distribuir pagos por categoría
      const categoryGeneralPaid: Record<string, number> = {
        "Blanco": 0,
        "Verde": 0,
        "Productos adicionales": 0,
      };

      filteredPayments.forEach((p: any) => {
        const amount = Number(p.amount || 0);
        const notes = (p.notes || "").toLowerCase();
        const catName = p.product_categories?.name || "";

        // Revisar si el pago fue por producto individual
        let matchedProduct = false;
        for (const name of CANONICAL_9_NAMES) {
          const itemStatus = statusMap[name];
          if (itemStatus && notes.includes(name.toLowerCase())) {
            itemStatus.totalPaidVal += amount;
            matchedProduct = true;
            break;
          }
        }

        // Si fue pago general de categoría
        if (!matchedProduct) {
          if (catName.toLowerCase().includes("blanco") || notes.includes("blanco")) {
            categoryGeneralPaid["Blanco"] = (categoryGeneralPaid["Blanco"] || 0) + amount;
          } else if (catName.toLowerCase().includes("verde") || notes.includes("verde")) {
            categoryGeneralPaid["Verde"] = (categoryGeneralPaid["Verde"] || 0) + amount;
          } else {
            categoryGeneralPaid["Productos adicionales"] = (categoryGeneralPaid["Productos adicionales"] || 0) + amount;
          }
        }
      });

      // Distribuir pagos generales de categoría entre los productos de esa categoría que tengan deuda
      Object.keys(categoryGeneralPaid).forEach((catGroup) => {
        let remainingGeneral = categoryGeneralPaid[catGroup] || 0;
        if (remainingGeneral <= 0) return;

        const prodsInCat = Object.values(statusMap).filter((p) => p.category === catGroup);
        for (const p of prodsInCat) {
          const targetValue = Math.max(p.factoryDispatchedVal, p.totalDispatchedVal);
          const debt = Math.max(0, targetValue - p.totalPaidVal);
          if (debt > 0) {
            const deduction = Math.min(debt, remainingGeneral);
            p.totalPaidVal += deduction;
            remainingGeneral -= deduction;
            if (remainingGeneral <= 0) break;
          }
        }
      });

      // REGLA CRÍTICA DE NEGOCIO:
      // Cuando Bodega no termine de recaudar todo el dinero de cierto producto que mandó Fábrica (o tiendas),
      // Fábrica TIENE BLOQUEADO despachar ese producto a Bodega.
      // Se desbloquea cuando los recaudos de dinero lleguen al 100%.
      // Al llegar al 100%, se registra la venta/liquidación del monto despachado.
      Object.values(statusMap).forEach((p) => {
        const targetValue = Math.max(p.factoryDispatchedVal, p.totalDispatchedVal);
        p.pendingVal = Math.max(0, targetValue - p.totalPaidVal);
        p.isFullyPaid = targetValue > 0 ? p.pendingVal === 0 : true;
        p.isBlocked = targetValue > 0 && p.pendingVal > 0;
        p.saleCompletedAmount = p.isFullyPaid && targetValue > 0
          ? (p.factoryDispatchedVal > 0 ? p.factoryDispatchedVal : p.totalDispatchedVal)
          : 0;
      });

      // CONSOLIDACIÓN DE VENTAS COMPLETADAS (100% LIQUIDADAS) VS PENDIENTES
      let totalVentas = 0;
      let totalRecaudado = 0;
      let totalVentasCompletadas = 0;

      const createGroupAmounts = (): GroupAmounts => ({
        blanco: 0,
        verde: 0,
        adicionales: 0,
        adicionalesBreakdown: {
          rojas: 0,
          flores: 0,
          baldes: 0,
          preroll: 0,
        },
      });

      const totalByGroup = createGroupAmounts();
      const recaudadoByGroup = createGroupAmounts();
      const pendingByGroup = createGroupAmounts();
      const completedByGroup = createGroupAmounts();

      const addToGroup = (g: GroupAmounts, cat: string, name: string, amount: number) => {
        if (cat === "Blanco") {
          g.blanco += amount;
        } else if (cat === "Verde") {
          g.verde += amount;
        } else {
          g.adicionales += amount;
          const n = name.toLowerCase();
          if (n.includes("roja")) g.adicionalesBreakdown.rojas += amount;
          else if (n.includes("flor")) g.adicionalesBreakdown.flores += amount;
          else if (n.includes("balde")) g.adicionalesBreakdown.baldes += amount;
          else if (n.includes("roll")) g.adicionalesBreakdown.preroll += amount;
        }
      };

      const completedProducts: ProductLiquidationStatus[] = [];
      const pendingProducts: ProductLiquidationStatus[] = [];

      Object.values(statusMap).forEach((p) => {
        const effectiveVal = Math.max(p.factoryDispatchedVal, p.totalDispatchedVal);
        totalVentas += effectiveVal;
        totalRecaudado += p.totalPaidVal;

        addToGroup(totalByGroup, p.category, p.productName, effectiveVal);
        addToGroup(recaudadoByGroup, p.category, p.productName, p.totalPaidVal);
        addToGroup(pendingByGroup, p.category, p.productName, p.pendingVal);

        if (p.isFullyPaid && effectiveVal > 0) {
          totalVentasCompletadas += p.saleCompletedAmount;
          completedProducts.push(p);
          addToGroup(completedByGroup, p.category, p.productName, p.saleCompletedAmount);
        } else if (p.pendingVal > 0) {
          pendingProducts.push(p);
        }
      });

      const totalFaltante = Math.max(0, totalVentas - totalRecaudado);
      const totalVentasPendientes = Math.max(0, totalVentas - totalVentasCompletadas);

      const consolidation: CompletedSalesConsolidation = {
        totalVentas,
        totalRecaudado,
        totalFaltante,
        totalVentasCompletadas,
        totalVentasPendientes,
        totalByGroup,
        recaudadoByGroup,
        pendingByGroup,
        completedByGroup,
        completedProducts,
        pendingProducts,
      };

      return {
        statusMap,
        consolidation,
      };
    },
  });

  const emptyGroup = (): GroupAmounts => ({
    blanco: 0,
    verde: 0,
    adicionales: 0,
    adicionalesBreakdown: { rojas: 0, flores: 0, baldes: 0, preroll: 0 },
  });

  const data = query.data || {
    statusMap: {} as Record<string, ProductLiquidationStatus>,
    consolidation: {
      totalVentas: 0,
      totalRecaudado: 0,
      totalFaltante: 0,
      totalVentasCompletadas: 0,
      totalVentasPendientes: 0,
      totalByGroup: emptyGroup(),
      recaudadoByGroup: emptyGroup(),
      pendingByGroup: emptyGroup(),
      completedByGroup: emptyGroup(),
      completedProducts: [],
      pendingProducts: [],
    } as CompletedSalesConsolidation,
  };

  /**
   * Emite notificación en base de datos y notificación push en el dispositivo
   * cuando un producto alcanza el 100% del dinero recaudado de su último despacho de fábrica
   */
  const triggerCompletedSaleNotification = async (productName: string, amount: number, userId?: string) => {
    const title = "Venta Concretada al 100%";
    const body = `Bodega recaudó todo el dinero del último despacho de fábrica: Venta de ${formatCurrency(amount)} concretada (${productName}).`;

    // 1. Mostrar notificación push nativa en el dispositivo
    showLocalNotification(title, {
      body,
      url: "/liquidaciones",
    });

    // 2. Guardar en base de datos en tabla notifications si hay usuario
    if (userId) {
      try {
        await supabase.from("notifications").insert({
          user_id: userId,
          title,
          body,
          type: "sale_completed",
          reference_type: "liquidation",
          is_read: false,
        });
      } catch (err) {
        console.warn("Could not insert notification in table:", err);
      }
    }
  };

  return {
    liquidationMap: data.statusMap,
    consolidation: data.consolidation,
    isLoading: query.isLoading,
    refetch: query.refetch,
    triggerCompletedSaleNotification,
  };
}

