import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getProductPackagings } from "@/features/inventory/product-presentations";

export interface ProductLiquidationStatus {
  productName: string;
  category: "Blanco" | "Verde" | "Productos adicionales";
  unitPrice: number;
  totalDispatchedQty: number;
  totalDispatchedVal: number;
  totalPaidVal: number;
  pendingVal: number;
  isFullyPaid: boolean;
  isBlocked: boolean; // Si falta dinero por recaudar en tienda, está bloqueado para nuevos despachos
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

export function useProductLiquidation() {
  const query = useQuery({
    queryKey: ["product_liquidation_and_locks"],
    queryFn: async () => {
      // 1. Obtener todos los despachos a tiendas
      const { data: dispatchesData, error: dispError } = await supabase
        .from("dispatches")
        .select(`
          id,
          status,
          to_location_type,
          dispatch_items (
            product_id,
            quantity,
            unit_value,
            total_value,
            products (name)
          )
        `)
        .eq("to_location_type", "store")
        .in("status", ["dispatched", "received"]);

      if (dispError) throw dispError;

      // 2. Obtener todos los pagos confirmados
      const { data: paymentsData, error: payError } = await supabase
        .from("payments")
        .select(`
          id,
          amount,
          status,
          notes,
          category_id,
          product_categories (name)
        `)
        .eq("status", "confirmed");

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
          totalPaidVal: 0,
          pendingVal: 0,
          isFullyPaid: true,
          isBlocked: false,
        };
      });

      // Acumular valores despachados por producto
      (dispatchesData || []).forEach((d: any) => {
        (d.dispatch_items || []).forEach((it: any) => {
          const rawName = it.products?.name || "";
          const details = getProductPackagings(rawName);
          const canonName = details.name;

          if (statusMap[canonName]) {
            const qty = Number(it.quantity || 0);
            const val = Number(it.total_value || (qty * (it.unit_value || details.unitPrice)));
            statusMap[canonName].totalDispatchedQty += qty;
            statusMap[canonName].totalDispatchedVal += val;
          }
        });
      });

      // Acumular pagos por producto individual o distribuir pagos por categoría
      const categoryGeneralPaid: Record<string, number> = {
        "Blanco": 0,
        "Verde": 0,
        "Productos adicionales": 0,
      };

      (paymentsData || []).forEach((p: any) => {
        const amount = Number(p.amount || 0);
        const notes = (p.notes || "").toLowerCase();
        const catName = p.product_categories?.name || "";

        // Revisar si el pago fue por producto individual
        let matchedProduct = false;
        for (const name of CANONICAL_9_NAMES) {
          if (notes.includes(name.toLowerCase())) {
            statusMap[name].totalPaidVal += amount;
            matchedProduct = true;
            break;
          }
        }

        // Si fue pago general de categoría
        if (!matchedProduct) {
          if (catName.toLowerCase().includes("blanco") || notes.includes("blanco")) {
            categoryGeneralPaid["Blanco"] += amount;
          } else if (catName.toLowerCase().includes("verde") || notes.includes("verde")) {
            categoryGeneralPaid["Verde"] += amount;
          } else {
            categoryGeneralPaid["Productos adicionales"] += amount;
          }
        }
      });

      // Distribuir pagos generales de categoría entre los productos de esa categoría que tengan deuda
      Object.keys(categoryGeneralPaid).forEach((catGroup) => {
        let remainingGeneral = categoryGeneralPaid[catGroup];
        if (remainingGeneral <= 0) return;

        const prodsInCat = Object.values(statusMap).filter((p) => p.category === catGroup);
        for (const p of prodsInCat) {
          const debt = Math.max(0, p.totalDispatchedVal - p.totalPaidVal);
          if (debt > 0) {
            const deduction = Math.min(debt, remainingGeneral);
            p.totalPaidVal += deduction;
            remainingGeneral -= deduction;
            if (remainingGeneral <= 0) break;
          }
        }
      });

      // Calcular estado final de liquidación y bloqueo por producto
      // REGLA FUNDAMENTAL: Si hay deuda pendiente de recaudo (> 0), el producto está BLOQUEADO para despachos de Fábrica a Bodega
      Object.values(statusMap).forEach((p) => {
        p.pendingVal = Math.max(0, p.totalDispatchedVal - p.totalPaidVal);
        p.isFullyPaid = p.pendingVal === 0;
        p.isBlocked = p.pendingVal > 0;
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
        totalVentas += p.totalDispatchedVal;
        totalRecaudado += p.totalPaidVal;

        addToGroup(totalByGroup, p.category, p.productName, p.totalDispatchedVal);
        addToGroup(recaudadoByGroup, p.category, p.productName, p.totalPaidVal);
        addToGroup(pendingByGroup, p.category, p.productName, p.pendingVal);

        if (p.isFullyPaid && p.totalDispatchedVal > 0) {
          totalVentasCompletadas += p.totalDispatchedVal;
          completedProducts.push(p);
          addToGroup(completedByGroup, p.category, p.productName, p.totalDispatchedVal);
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

  return {
    liquidationMap: data.statusMap,
    consolidation: data.consolidation,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

