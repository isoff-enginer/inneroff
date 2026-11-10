import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/features/auth/session";
import type { DispatchStatus, LocationType } from "@/types/domain";

export interface DispatchItemDetail {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitValue: number;
  totalValue: number;
  unitName?: string;
}

export interface LiveDispatch {
  id: string;
  dispatchNumber: number;
  status: DispatchStatus;
  fromLocationType: LocationType;
  fromLocationName: string;
  fromId: string;
  toLocationType: LocationType;
  toLocationName: string;
  toId: string;
  totalValue: number;
  notes?: string | null;
  createdAt: string;
  dispatchedAt?: string | null;
  receivedAt?: string | null;
  createdByName?: string;
  receivedByName?: string;
  items: DispatchItemDetail[];
}

export interface LocationOption {
  id: string;
  name: string;
  type: LocationType;
}

export function useDispatches() {
  const { user, role } = useSession();
  const queryClient = useQueryClient();

  const dispatchesQuery = useQuery({
    queryKey: ["live_dispatches", user?.id, role],
    queryFn: async () => {
      let query = supabase
        .from("dispatches")
        .select(`
          id,
          dispatch_number,
          status,
          from_location_type,
          from_factory_id,
          from_warehouse_id,
          from_store_id,
          to_location_type,
          to_factory_id,
          to_warehouse_id,
          to_store_id,
          total_value,
          notes,
          created_at,
          dispatched_at,
          received_at,
          created_by,
          received_by,
          dispatch_items (
            id,
            product_id,
            quantity,
            unit_value,
            total_value,
            products (name, unit_name)
          ),
          from_factory:factories!dispatches_from_factory_id_fkey (name),
          from_warehouse:warehouses!dispatches_from_warehouse_id_fkey (name),
          from_store:stores!dispatches_from_store_id_fkey (name),
          to_factory:factories!dispatches_to_factory_id_fkey (name),
          to_warehouse:warehouses!dispatches_to_warehouse_id_fkey (name),
          to_store:stores!dispatches_to_store_id_fkey (name),
          creator:profiles!dispatches_created_by_fkey (full_name),
          receiver:profiles!dispatches_received_by_fkey (full_name)
        `)
        .order("created_at", { ascending: false });

      // Filter by role scope if user has specific location
      if (role === "warehouse" && user?.warehouseId) {
        query = query.or(`from_warehouse_id.eq.${user.warehouseId},to_warehouse_id.eq.${user.warehouseId}`);
      } else if (role === "factory" && user?.factoryId) {
        query = query.or(`from_factory_id.eq.${user.factoryId},to_factory_id.eq.${user.factoryId}`);
      } else if (role === "store" && user?.storeId) {
        query = query.or(`from_store_id.eq.${user.storeId},to_store_id.eq.${user.storeId}`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((d: any): LiveDispatch => {
        let fromName = "Origen";
        let fromId = "";
        if (d.from_location_type === "factory") {
          fromName = d.from_factory?.name || "Fábrica";
          fromId = d.from_factory_id || "";
        } else if (d.from_location_type === "warehouse") {
          fromName = d.from_warehouse?.name || "Bodega";
          fromId = d.from_warehouse_id || "";
        } else if (d.from_location_type === "store") {
          fromName = d.from_store?.name || "Tienda";
          fromId = d.from_store_id || "";
        }

        let toName = "Destino";
        let toId = "";
        if (d.to_location_type === "factory") {
          toName = d.to_factory?.name || "Fábrica";
          toId = d.to_factory_id || "";
        } else if (d.to_location_type === "warehouse") {
          toName = d.to_warehouse?.name || "Bodega";
          toId = d.to_warehouse_id || "";
        } else if (d.to_location_type === "store") {
          toName = d.to_store?.name || "Tienda";
          toId = d.to_store_id || "";
        }

        const items: DispatchItemDetail[] = (d.dispatch_items || []).map((it: any) => ({
          id: it.id,
          productId: it.product_id,
          productName: it.products?.name || "Producto",
          quantity: Number(it.quantity || 0),
          unitValue: Number(it.unit_value || 0),
          totalValue: Number(it.total_value || 0),
          unitName: it.products?.unit_name || "unidades",
        }));

        return {
          id: d.id,
          dispatchNumber: d.dispatch_number,
          status: d.status as DispatchStatus,
          fromLocationType: d.from_location_type as LocationType,
          fromLocationName: fromName,
          fromId,
          toLocationType: d.to_location_type as LocationType,
          toLocationName: toName,
          toId,
          totalValue: Number(d.total_value || 0),
          notes: d.notes,
          createdAt: d.created_at,
          dispatchedAt: d.dispatched_at,
          receivedAt: d.received_at,
          createdByName: d.creator?.full_name,
          receivedByName: d.receiver?.full_name,
          items,
        };
      });
    },
    enabled: !!user,
  });

  const locationsQuery = useQuery({
    queryKey: ["operational_locations"],
    queryFn: async () => {
      const [
        { data: factories },
        { data: warehouses },
        storesResult
      ] = await Promise.all([
        supabase.from("factories").select("id, name").eq("is_active", true),
        supabase.from("warehouses").select("id, name").eq("is_active", true),
        supabase.from("stores").select("id, name, status").neq("status", "inactive").order("name"),
      ]);

      const locs: LocationOption[] = [];
      (factories || []).forEach(f => locs.push({ id: f.id, name: f.name, type: "factory" }));
      (warehouses || []).forEach(w => locs.push({ id: w.id, name: w.name, type: "warehouse" }));
      
      const rawStores = storesResult?.data || [];
      const centroStore = rawStores.find((s: any) => s.name?.toLowerCase().includes("centro"));
      const laUsaStore = rawStores.find((s: any) => s.name?.toLowerCase().includes("usa"));

      if (centroStore) {
        locs.push({ id: centroStore.id, name: "Centro", type: "store" });
      } else {
        locs.push({ id: "11111111-1111-1111-1111-111111111111", name: "Centro", type: "store" });
      }

      if (laUsaStore) {
        locs.push({ id: laUsaStore.id, name: "La Usa", type: "store" });
      } else {
        locs.push({ id: "22222222-2222-2222-2222-222222222222", name: "La Usa", type: "store" });
      }

      return locs;
    }
  });

  const createDispatchMutation = useMutation({
    mutationFn: async (payload: {
      fromLocationType?: LocationType | undefined;
      fromType?: LocationType | undefined;
      fromId?: string | undefined;
      toLocationType?: LocationType | undefined;
      toType?: LocationType | undefined;
      toId?: string | undefined;
      items: { product_id?: string | undefined; productId?: string | undefined; quantity: number; unit_value?: number | undefined; unitValue?: number | undefined }[];
      notes?: string | null | undefined;
    }) => {
      const fromLoc = payload.fromLocationType || payload.fromType || "warehouse";
      const toLoc = payload.toLocationType || payload.toType || "store";
      let fromId = payload.fromId || "";
      let toId = payload.toId || "";
      const notes = payload.notes || null;

      // Respaldo y validación de IDs para garantizar formato UUID estricto
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (!UUID_REGEX.test(fromId)) {
        if (fromLoc === "factory") {
          const { data: f } = await supabase.from("factories").select("id").limit(1);
          fromId = f?.[0]?.id || "33333333-3333-3333-3333-333333333333";
        } else if (fromLoc === "warehouse") {
          const { data: w } = await supabase.from("warehouses").select("id").limit(1);
          fromId = w?.[0]?.id || "44444444-4444-4444-4444-444444444444";
        } else if (fromLoc === "store") {
          const { data: s } = await supabase.from("stores").select("id").not("name", "ilike", "%prueba%").limit(1);
          fromId = s?.[0]?.id || "11111111-1111-1111-1111-111111111111";
        }
      }

      if (!UUID_REGEX.test(toId)) {
        if (toLoc === "factory") {
          const { data: f } = await supabase.from("factories").select("id").limit(1);
          toId = f?.[0]?.id || "33333333-3333-3333-3333-333333333333";
        } else if (toLoc === "warehouse") {
          const { data: w } = await supabase.from("warehouses").select("id").limit(1);
          toId = w?.[0]?.id || "44444444-4444-4444-4444-444444444444";
        } else if (toLoc === "store") {
          const { data: s } = await supabase.from("stores").select("id").not("name", "ilike", "%prueba%").limit(1);
          toId = s?.[0]?.id || "11111111-1111-1111-1111-111111111111";
        }
      }

      const normalizedItems = (payload.items || []).map(it => ({
        product_id: (it.product_id || it.productId || "") as string,
        quantity: Number(it.quantity || 0),
        unit_value: Number(it.unit_value ?? it.unitValue ?? 0),
      })).filter(it => it.product_id && it.quantity > 0);

      if (normalizedItems.length === 0) {
        throw new Error("El despacho debe contener al menos un producto válido");
      }

      // Obtener las categorías de los productos para cumplir con el esquema foreign key de category_id
      const prodIds = normalizedItems.map(it => it.product_id);
      const { data: prodsList } = await supabase
        .from("products")
        .select("id, category_id, unit_value, name")
        .in("id", prodIds);

      const prodMap = new Map((prodsList || []).map(p => [p.id, p]));
      
      // Categoría por defecto si un producto no tiene asignada
      let fallbackCatId = (prodsList || []).find(p => p.category_id)?.category_id || "";
      if (!fallbackCatId) {
        const { data: firstCat } = await supabase.from("product_categories").select("id").limit(1);
        fallbackCatId = firstCat?.[0]?.id || "";
      }

      const fromFields: any = { from_location_type: fromLoc };
      if (fromLoc === "factory" && fromId) fromFields.from_factory_id = fromId;
      if (fromLoc === "warehouse" && fromId) fromFields.from_warehouse_id = fromId;
      if (fromLoc === "store" && fromId) fromFields.from_store_id = fromId;

      const toFields: any = { to_location_type: toLoc };
      if (toLoc === "factory" && toId) toFields.to_factory_id = toId;
      if (toLoc === "warehouse" && toId) toFields.to_warehouse_id = toId;
      if (toLoc === "store" && toId) toFields.to_store_id = toId;

      const totalVal = normalizedItems.reduce((acc, it) => acc + (it.quantity * it.unit_value), 0);

      // 1. Crear registro de despacho (NO pasar total_value ya que es GENERATED ALWAYS en PostgreSQL)
      const { data: newDisp, error: dispErr } = await supabase
        .from("dispatches")
        .insert({
          ...fromFields,
          ...toFields,
          status: "dispatched",
          dispatched_at: new Date().toISOString(),
          created_by: user?.id,
          notes,
        })
        .select("id, dispatch_number")
        .single();

      if (dispErr) throw dispErr;

      // 2. Insertar items del despacho
      // NOTA CRÍTICA: NO pasar total_value porque es una columna GENERATED ALWAYS en PostgreSQL
      const itemsToInsert = normalizedItems.map(it => {
        const prod = prodMap.get(it.product_id);
        return {
          dispatch_id: newDisp.id,
          product_id: it.product_id,
          category_id: prod?.category_id || fallbackCatId,
          quantity: it.quantity,
          unit_value: it.unit_value || Number(prod?.unit_value || 0),
        };
      });

      const { error: itemsErr } = await supabase.from("dispatch_items").insert(itemsToInsert);
      if (itemsErr) throw itemsErr;

      // 3. Descontar del inventario de origen y registrar movimientos
      for (const it of normalizedItems) {
        const prod = prodMap.get(it.product_id);
        const catId = prod?.category_id || fallbackCatId;

        if (fromId) {
          let balQuery = supabase
            .from("inventory_balances")
            .select("id, quantity")
            .eq("product_id", it.product_id)
            .eq("location_type", fromLoc);

          if (fromLoc === "factory") balQuery = balQuery.eq("factory_id", fromId);
          else if (fromLoc === "warehouse") balQuery = balQuery.eq("warehouse_id", fromId);
          else if (fromLoc === "store") balQuery = balQuery.eq("store_id", fromId);

          const { data: existingBal } = await balQuery.maybeSingle();

          if (existingBal) {
            const newQty = Math.max(0, Number(existingBal.quantity || 0) - it.quantity);
            await supabase.from("inventory_balances").update({ quantity: newQty }).eq("id", existingBal.id);
          }
        }

        // Registrar movimiento de salida (sin total_value para evitar errores de columnas generadas)
        const movPayload: any = {
          product_id: it.product_id,
          category_id: catId,
          movement_type: "dispatch_out",
          quantity: it.quantity,
          unit_value: it.unit_value,
          from_location_type: fromLoc,
          to_location_type: toLoc,
          notes: `Despacho #${newDisp.dispatch_number || ""} enviado`,
          created_by: user?.id,
        };
        if (fromLoc === "factory" && fromId) movPayload.from_factory_id = fromId;
        if (fromLoc === "warehouse" && fromId) movPayload.from_warehouse_id = fromId;
        if (fromLoc === "store" && fromId) movPayload.from_store_id = fromId;
        if (toLoc === "factory" && toId) movPayload.to_factory_id = toId;
        if (toLoc === "warehouse" && toId) movPayload.to_warehouse_id = toId;
        if (toLoc === "store" && toId) movPayload.to_store_id = toId;

        try {
          await supabase.from("inventory_movements").insert(movPayload);
        } catch (movErr) {
          console.warn("Advertencia al registrar inventory_movement:", movErr);
        }
      }

      return newDisp.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live_dispatches"] });
      queryClient.invalidateQueries({ queryKey: ["inventory_balances"] });
      queryClient.invalidateQueries({ queryKey: ["inventory_movements"] });
      queryClient.invalidateQueries({ queryKey: ["boss-dashboard-dispatches-stats-30d"] });
      queryClient.invalidateQueries({ queryKey: ["store_dispatches_total"] });
    },
  });

  const receiveDispatchMutation = useMutation({
    mutationFn: async ({
      dispatchId,
      notes,
    }: {
      dispatchId: string;
      notes?: string;
    }) => {
      // 1. Obtener datos del despacho e items
      const { data: dispData, error: fetchErr } = await supabase
        .from("dispatches")
        .select(`
          id,
          dispatch_number,
          to_location_type,
          to_factory_id,
          to_warehouse_id,
          to_store_id,
          dispatch_items (product_id, quantity, unit_value, category_id)
        `)
        .eq("id", dispatchId)
        .single();

      if (fetchErr || !dispData) throw fetchErr || new Error("Despacho no encontrado");

      // 2. Actualizar estado del despacho a recibido
      const { error: updErr } = await supabase
        .from("dispatches")
        .update({
          status: "received",
          received_at: new Date().toISOString(),
          received_by: user?.id,
          updated_at: new Date().toISOString(),
          notes: notes ? notes : undefined,
        })
        .eq("id", dispatchId);

      if (updErr) throw updErr;

      // 3. Incrementar inventario en destino y registrar movimientos de entrada
      const toLoc = dispData.to_location_type;
      let destId = "";
      if (toLoc === "factory") destId = dispData.to_factory_id || "";
      if (toLoc === "warehouse") destId = dispData.to_warehouse_id || "";
      if (toLoc === "store") destId = dispData.to_store_id || "";

      // Fallback de destId si está vacío
      if (!destId) {
        if (toLoc === "warehouse") {
          const { data: w } = await supabase.from("warehouses").select("id").eq("is_active", true).limit(1);
          destId = w?.[0]?.id || "";
        } else if (toLoc === "store") {
          const { data: s } = await supabase.from("stores").select("id").neq("status", "inactive").limit(1);
          destId = s?.[0]?.id || "";
        }
      }

      for (const it of (dispData.dispatch_items || [])) {
        const prodId = it.product_id;
        const qty = Number(it.quantity || 0);
        const unitVal = Number(it.unit_value || 0);
        const catId = it.category_id;

        if (destId) {
          let balQuery = supabase
            .from("inventory_balances")
            .select("id, quantity")
            .eq("product_id", prodId)
            .eq("location_type", toLoc);

          if (toLoc === "factory") balQuery = balQuery.eq("factory_id", destId);
          else if (toLoc === "warehouse") balQuery = balQuery.eq("warehouse_id", destId);
          else if (toLoc === "store") balQuery = balQuery.eq("store_id", destId);

          const { data: existingBal } = await balQuery.maybeSingle();

          if (existingBal) {
            const newQty = Number(existingBal.quantity || 0) + qty;
            await supabase.from("inventory_balances").update({ quantity: newQty }).eq("id", existingBal.id);
          } else {
            const insertPayload: any = {
              product_id: prodId,
              location_type: toLoc,
              quantity: qty,
            };
            if (toLoc === "factory") insertPayload.factory_id = destId;
            if (toLoc === "warehouse") insertPayload.warehouse_id = destId;
            if (toLoc === "store") insertPayload.store_id = destId;

            await supabase.from("inventory_balances").insert(insertPayload);
          }
        }

        // Registrar movimiento de entrada (sin total_value)
        const movPayload: any = {
          product_id: prodId,
          category_id: catId,
          movement_type: "dispatch_in",
          quantity: qty,
          unit_value: unitVal,
          to_location_type: toLoc,
          notes: `Recepción de Despacho #${dispData.dispatch_number || ""}`,
          created_by: user?.id,
        };
        if (toLoc === "factory" && destId) movPayload.to_factory_id = destId;
        if (toLoc === "warehouse" && destId) movPayload.to_warehouse_id = destId;
        if (toLoc === "store" && destId) movPayload.to_store_id = destId;

        try {
          await supabase.from("inventory_movements").insert(movPayload);
        } catch (movErr) {
          console.warn("Advertencia al registrar recepción de inventory_movement:", movErr);
        }
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live_dispatches"] });
      queryClient.invalidateQueries({ queryKey: ["inventory_balances"] });
      queryClient.invalidateQueries({ queryKey: ["inventory_movements"] });
      queryClient.invalidateQueries({ queryKey: ["boss-dashboard-dispatches-stats-30d"] });
      queryClient.invalidateQueries({ queryKey: ["store_dispatches_total"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return {
    dispatches: dispatchesQuery.data || [],
    locations: locationsQuery.data || [],
    isLoading: dispatchesQuery.isLoading,
    createDispatch: createDispatchMutation.mutateAsync,
    isCreatingDispatch: createDispatchMutation.isPending,
    receiveDispatch: receiveDispatchMutation.mutateAsync,
    isReceivingDispatch: receiveDispatchMutation.isPending,
  };
}
