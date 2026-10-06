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
        { data: stores }
      ] = await Promise.all([
        supabase.from("factories").select("id, name").eq("is_active", true),
        supabase.from("warehouses").select("id, name").eq("is_active", true),
        supabase.from("stores").select("id, name").eq("is_active", true),
      ]);

      const locs: LocationOption[] = [];
      (factories || []).forEach(f => locs.push({ id: f.id, name: f.name, type: "factory" }));
      (warehouses || []).forEach(w => locs.push({ id: w.id, name: w.name, type: "warehouse" }));
      (stores || []).forEach(s => locs.push({ id: s.id, name: s.name, type: "store" }));

      return locs;
    }
  });

  const createDispatchMutation = useMutation({
    mutationFn: async ({
      fromLocationType,
      fromId,
      toLocationType,
      toId,
      items,
      notes,
    }: {
      fromLocationType: LocationType;
      fromId: string;
      toLocationType: LocationType;
      toId: string;
      items: { product_id: string; quantity: number; unit_value: number }[];
      notes?: string;
    }) => {
      // Try RPC first
      const { data: rpcData, error: rpcErr } = await supabase.rpc(
        // @ts-ignore
        "create_operational_dispatch",
        {
          p_from_location_type: fromLocationType,
          p_from_id: fromId,
          p_to_location_type: toLocationType,
          p_to_id: toId,
          p_items: items,
          p_notes: notes || null,
        }
      );

      if (rpcErr) {
        // Fallback standard insert
        const fromFields: any = { from_location_type: fromLocationType };
        if (fromLocationType === "factory") fromFields.from_factory_id = fromId;
        if (fromLocationType === "warehouse") fromFields.from_warehouse_id = fromId;
        if (fromLocationType === "store") fromFields.from_store_id = fromId;

        const toFields: any = { to_location_type: toLocationType };
        if (toLocationType === "factory") toFields.to_factory_id = toId;
        if (toLocationType === "warehouse") toFields.to_warehouse_id = toId;
        if (toLocationType === "store") toFields.to_store_id = toId;

        const totalVal = items.reduce((acc, it) => acc + (it.quantity * it.unit_value), 0);

        const { data: newDisp, error: dispErr } = await supabase
          .from("dispatches")
          .insert({
            ...fromFields,
            ...toFields,
            status: "dispatched",
            dispatched_at: new Date().toISOString(),
            created_by: user?.id,
            total_value: totalVal,
            notes: notes || null,
          })
          .select("id")
          .single();

        if (dispErr) throw dispErr;

        const itemsToInsert = items.map(it => ({
          dispatch_id: newDisp.id,
          product_id: it.product_id,
          quantity: it.quantity,
          unit_value: it.unit_value,
          total_value: it.quantity * it.unit_value,
        }));

        await supabase.from("dispatch_items").insert(itemsToInsert);
        return newDisp.id;
      }

      return rpcData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live_dispatches"] });
      queryClient.invalidateQueries({ queryKey: ["inventory_balances"] });
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
      // Try RPC first
      const { data: rpcData, error: rpcErr } = await supabase.rpc(
        // @ts-ignore
        "receive_and_accept_dispatch",
        {
          p_dispatch_id: dispatchId,
          p_notes: notes || null,
        }
      );

      if (rpcErr) {
        // Fallback update
        const { error: updErr } = await supabase
          .from("dispatches")
          .update({
            status: "received",
            received_at: new Date().toISOString(),
            received_by: user?.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", dispatchId);

        if (updErr) throw updErr;
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live_dispatches"] });
      queryClient.invalidateQueries({ queryKey: ["inventory_balances"] });
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
