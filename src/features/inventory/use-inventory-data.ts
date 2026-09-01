import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/features/auth/session";

export interface InventoryProduct {
  id: string;
  productId: string;
  name: string;
  category: string;
  quantity: number;
  status: "disponible" | "poco_stock" | "agotado";
  locationType: string;
  locationId: string;
  unitValue: number;
}

export interface InventoryMovement {
  id: string;
  createdAt: string;
  type: string;
  quantity: number;
  notes?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  productCount?: number;
}

const STOCK_THRESHOLD = 10;

export function useInventoryData() {
  const { user, role } = useSession();
  const queryClient = useQueryClient();

  const inventoryQuery = useQuery({
    queryKey: ["inventory_balances", user?.id],
    queryFn: async () => {
      let query = supabase
        .from("inventory_balances")
        .select(`
          id,
          quantity,
          location_type,
          factory_id,
          store_id,
          warehouse_id,
          products (
            id,
            name,
            unit_value,
            product_categories (name)
          )
        `);

      if (role === "store" && user?.storeId) {
        query = query.eq("store_id", user.storeId);
      } else if (role === "warehouse" && user?.warehouseId) {
        query = query.eq("warehouse_id", user.warehouseId);
      } else if (role === "factory" && user?.factoryId) {
        query = query.eq("factory_id", user.factoryId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const mapped: InventoryProduct[] = (data || []).map((row: any) => {
        const qty = Number(row.quantity || 0);
        let status: "disponible" | "poco_stock" | "agotado" = "disponible";
        
        if (qty <= 0) status = "agotado";
        else if (qty <= STOCK_THRESHOLD) status = "poco_stock";

        let locId = "";
        if (row.location_type === "store") locId = row.store_id;
        if (row.location_type === "warehouse") locId = row.warehouse_id;
        if (row.location_type === "factory") locId = row.factory_id;

        return {
          id: row.id,
          productId: row.products?.id || "",
          name: row.products?.name || "Desconocido",
          category: row.products?.product_categories?.name || "General",
          quantity: qty,
          status,
          locationType: row.location_type,
          locationId: locId,
          unitValue: row.products?.unit_value || 0,
        };
      });

      return mapped.sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: !!user,
  });

  const categoriesQuery = useQuery({
    queryKey: ["product_categories"],
    queryFn: async () => {
      const { data: cats, error: catsError } = await supabase
        .from("product_categories")
        .select("id, name, description")
        .eq("is_active", true)
        .order("name");
      if (catsError) throw catsError;

      const { data: prods, error: prodsError } = await supabase
        .from("products")
        .select("category_id");
      if (prodsError) throw prodsError;

      const mapped = (cats || []).map(c => {
        const count = (prods || []).filter(p => p.category_id === c.id).length;
        return { ...c, productCount: count } as ProductCategory;
      });

      return mapped;
    }
  });

  const getMovementsQuery = (productId: string, locationType: string, locationId: string) => 
    useQuery({
      queryKey: ["inventory_movements", productId, locationId],
      queryFn: async () => {
        let query = supabase
          .from("inventory_movements")
          .select(`
            id,
            created_at,
            movement_type,
            quantity,
            notes
          `)
          .eq("product_id", productId)
          .order("created_at", { ascending: false })
          .limit(10);
        
        if (locationType === "store") {
          query = query.or(`from_store_id.eq.${locationId},to_store_id.eq.${locationId}`);
        } else if (locationType === "warehouse") {
          query = query.or(`from_warehouse_id.eq.${locationId},to_warehouse_id.eq.${locationId}`);
        } else if (locationType === "factory") {
          query = query.or(`from_factory_id.eq.${locationId},to_factory_id.eq.${locationId}`);
        }

        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map((m: any) => ({
          id: m.id,
          createdAt: m.created_at,
          type: m.movement_type,
          quantity: m.quantity,
          notes: m.notes
        })) as InventoryMovement[];
      },
      enabled: !!productId && !!locationId,
    });

  const addMovementMutation = useMutation({
    mutationFn: async ({
      productId,
      type,
      quantity,
      locationType,
      locationId,
      currentBalanceId,
      currentQuantity,
    }: {
      productId: string;
      type: "in" | "out";
      quantity: number;
      locationType: string;
      locationId: string;
      currentBalanceId: string;
      currentQuantity: number;
    }) => {
      const { data: prodData } = await supabase.from("products").select("category_id, unit_value").eq("id", productId).single();
      const categoryId = prodData?.category_id;
      const unitValue = prodData?.unit_value || 0;

      if (!categoryId) throw new Error("Producto no encontrado o sin categoría");

      const movementPayload: any = {
        product_id: productId,
        category_id: categoryId,
        movement_type: "transfer",
        quantity: quantity,
        unit_value: unitValue,
        notes: `Ajuste manual (${type === "in" ? "Entrada" : "Salida"})`,
        created_by: user?.id,
      };
      
      if (locationType === "store") {
        if (type === "in") movementPayload.to_store_id = locationId;
        else movementPayload.from_store_id = locationId;
        movementPayload[type === "in" ? "to_location_type" : "from_location_type"] = "store";
      } else if (locationType === "warehouse") {
        if (type === "in") movementPayload.to_warehouse_id = locationId;
        else movementPayload.from_warehouse_id = locationId;
        movementPayload[type === "in" ? "to_location_type" : "from_location_type"] = "warehouse";
      } else if (locationType === "factory") {
        if (type === "in") movementPayload.to_factory_id = locationId;
        else movementPayload.from_factory_id = locationId;
        movementPayload[type === "in" ? "to_location_type" : "from_location_type"] = "factory";
      }

      const { error: moveError } = await supabase.from("inventory_movements").insert(movementPayload as any);
      if (moveError) console.warn("Movement insert failed, maybe enum mismatch. Details:", moveError);

      const newQuantity = type === "in" ? currentQuantity + quantity : currentQuantity - quantity;
      
      const { error: balError } = await supabase
        .from("inventory_balances")
        .update({ quantity: newQuantity })
        .eq("id", currentBalanceId);
        
      if (balError) throw balError;
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_balances"] });
      queryClient.invalidateQueries({ queryKey: ["inventory_movements"] });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async ({ name, description }: { name: string, description?: string }) => {
      const { error } = await supabase.from("product_categories").insert({
        name,
        description: description || null,
        is_active: true
      });
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product_categories"] });
    }
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      category_id: string;
      unit_value: number;
      cost_value?: number;
      unit_name?: string;
      sku?: string;
      description?: string;
    }) => {
      const { error } = await supabase.from("products").insert({
        name: data.name,
        category_id: data.category_id,
        unit_value: data.unit_value,
        cost_value: data.cost_value || 0,
        unit_name: data.unit_name || "unidades",
        sku: data.sku || null,
        description: data.description || null,
        is_active: true,
      });
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_balances"] });
    }
  });

  return {
    inventory: inventoryQuery.data || [],
    categories: categoriesQuery.data || [],
    isLoading: inventoryQuery.isLoading || categoriesQuery.isLoading,
    error: inventoryQuery.error || categoriesQuery.error,
    getMovementsQuery,
    addMovement: addMovementMutation.mutateAsync,
    isUpdating: addMovementMutation.isPending,
    createCategory: createCategoryMutation.mutateAsync,
    isCreatingCategory: createCategoryMutation.isPending,
    createProduct: createProductMutation.mutateAsync,
    isCreatingProduct: createProductMutation.isPending,
  };
}
