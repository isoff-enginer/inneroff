import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/features/auth/session";

export interface InventoryProduct {
  id: string;
  productId: string;
  name: string;
  category: string;
  categoryId?: string;
  subcategoryId?: string | null;
  subcategoryName?: string | null;
  quantity: number;
  status: "disponible" | "poco_stock" | "agotado";
  locationType: string;
  locationId: string;
  unitValue: number;
  costValue?: number;
  sku?: string | null;
  unitName?: string | null;
  description?: string | null;
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
  parentId?: string | null;
  parent_id?: string | null;
  productCount?: number;
  subcategories?: ProductCategory[];
}

export interface CatalogProduct {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  subcategoryId?: string | null;
  subcategoryName?: string | null;
  unitValue: number;
  costValue: number;
  sku?: string | null;
  unitName: string;
  description?: string | null;
  isActive: boolean;
}

const STOCK_THRESHOLD = 10;

export function useInventoryData() {
  const { user, role } = useSession();
  const queryClient = useQueryClient();

  // 1. Balances de Inventario
  const inventoryQuery = useQuery({
    queryKey: ["inventory_balances", user?.id, role],
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
            category_id,
            unit_value,
            cost_value,
            sku,
            unit_name,
            description,
            product_categories (id, name)
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
          categoryId: row.products?.category_id,
          subcategoryId: row.products?.subcategory_id || null,
          quantity: qty,
          status,
          locationType: row.location_type,
          locationId: locId,
          unitValue: row.products?.unit_value || 0,
          costValue: row.products?.cost_value || 0,
          sku: row.products?.sku || null,
          unitName: row.products?.unit_name || "unidades",
          description: row.products?.description || null,
        };
      });

      return mapped.sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: !!user,
  });

  // 2. Categorías y Subcategorías
  const categoriesQuery = useQuery({
    queryKey: ["product_categories_hierarchical"],
    queryFn: async () => {
      // Intento leer con parent_id
      let cats: any[] = [];
      const { data: rawCats, error: catsError } = await supabase
        .from("product_categories")
        .select("id, name, description, is_active, parent_id")
        .eq("is_active", true)
        .order("name");

      if (catsError) {
        // Fallback si la columna parent_id no existe aún en la base de datos
        const { data: fallbackCats, error: fbError } = await supabase
          .from("product_categories")
          .select("id, name, description, is_active")
          .eq("is_active", true)
          .order("name");
        if (fbError) throw fbError;
        cats = (fallbackCats || []).map(c => ({ ...c, parent_id: null }));
      } else {
        cats = rawCats || [];
      }

      // Conteo de productos asociados
      const { data: prods } = await supabase
        .from("products")
        .select("id, category_id, is_active")
        .eq("is_active", true);

      const allCats: ProductCategory[] = cats.map(c => {
        const count = (prods || []).filter(p => p.category_id === c.id).length;
        return {
          id: c.id,
          name: c.name,
          description: c.description || "",
          parentId: c.parent_id || null,
          parent_id: c.parent_id || null,
          productCount: count,
          subcategories: [],
        };
      });

      // Agrupar en categorías principales y sus subcategorías
      const mainCategories: ProductCategory[] = [];
      const subcategories: ProductCategory[] = [];

      allCats.forEach(c => {
        if (!c.parentId) {
          mainCategories.push(c);
        } else {
          subcategories.push(c);
        }
      });

      // Asignar subcategorías a su categoría padre
      mainCategories.forEach(main => {
        main.subcategories = subcategories.filter(sub => sub.parentId === main.id);
      });

      return {
        all: allCats,
        main: mainCategories,
        subs: subcategories,
      };
    }
  });

  // 3. Catálogo Completo de Productos
  const allProductsQuery = useQuery({
    queryKey: ["all_products_catalog"],
    queryFn: async () => {
      let data: any[] = [];
      const { data: prodsData, error: prodsError } = await supabase
        .from("products")
        .select(`
          id,
          name,
          category_id,
          subcategory_id,
          unit_value,
          cost_value,
          sku,
          unit_name,
          description,
          is_active,
          product_categories (id, name)
        `)
        .eq("is_active", true)
        .order("name");

      if (prodsError) {
        // Fallback si subcategory_id no existe
        const { data: fbData, error: fbErr } = await supabase
          .from("products")
          .select(`
            id,
            name,
            category_id,
            unit_value,
            cost_value,
            sku,
            unit_name,
            description,
            is_active,
            product_categories (id, name)
          `)
          .eq("is_active", true)
          .order("name");
        if (fbErr) throw fbErr;
        data = (fbData || []).map(p => ({ ...p, subcategory_id: null }));
      } else {
        data = prodsData || [];
      }

      return data;
    },
    enabled: !!user,
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

  // Movimiento manual de inventario (Entrada / Salida)
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
        movement_type: "adjustment",
        quantity: quantity,
        unit_value: unitValue,
        total_value: quantity * unitValue,
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

      await supabase.from("inventory_movements").insert(movementPayload as any);

      const newQuantity = type === "in" ? currentQuantity + quantity : Math.max(0, currentQuantity - quantity);
      
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

  // Mutación: Crear Categoría o Subcategoría
  const createCategoryMutation = useMutation({
    mutationFn: async ({ name, description, parentId }: { name: string; description?: string; parentId?: string | null }) => {
      const payload: any = {
        name: name.trim(),
        description: description?.trim() || null,
        is_active: true
      };
      if (parentId) {
        payload.parent_id = parentId;
      }

      let resError: any = null;
      try {
        const { error } = await supabase.from("product_categories").insert(payload);
        resError = error;
      } catch (err: any) {
        resError = err;
      }

      if (resError && payload.parent_id && resError.message?.includes("parent_id")) {
        delete payload.parent_id;
        const { error } = await supabase.from("product_categories").insert(payload);
        if (error) throw error;
      } else if (resError) {
        throw resError;
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product_categories_hierarchical"] });
      queryClient.invalidateQueries({ queryKey: ["product_categories"] });
      queryClient.invalidateQueries({ queryKey: ["sales_categories_list"] });
    }
  });

  // Mutación: Actualizar Categoría o Subcategoría
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, name, description, parentId }: { id: string; name?: string; description?: string; parentId?: string | null }) => {
      const payload: any = {
        updated_at: new Date().toISOString()
      };
      if (name !== undefined) payload.name = name.trim();
      if (description !== undefined) payload.description = description.trim() || null;
      if (parentId !== undefined) payload.parent_id = parentId;

      const { error } = await supabase.from("product_categories").update(payload).eq("id", id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product_categories_hierarchical"] });
      queryClient.invalidateQueries({ queryKey: ["product_categories"] });
      queryClient.invalidateQueries({ queryKey: ["sales_categories_list"] });
    }
  });

  // Mutación: Eliminar (Desactivar) Categoría
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("product_categories")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product_categories_hierarchical"] });
      queryClient.invalidateQueries({ queryKey: ["product_categories"] });
      queryClient.invalidateQueries({ queryKey: ["sales_categories_list"] });
    }
  });

  // Mutación: Crear Producto
  const createProductMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      category_id: string;
      subcategory_id?: string | null;
      unit_value: number;
      cost_value?: number;
      unit_name?: string;
      sku?: string;
      description?: string;
    }) => {
      const payload: any = {
        name: data.name.trim(),
        category_id: data.category_id,
        unit_value: data.unit_value,
        cost_value: data.cost_value || 0,
        unit_name: data.unit_name || "unidades",
        sku: data.sku?.trim() || null,
        description: data.description?.trim() || null,
        is_active: true,
      };

      if (data.subcategory_id) {
        payload.subcategory_id = data.subcategory_id;
      }

      let newProdId = "";
      try {
        const { data: newProd, error } = await supabase
          .from("products")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        newProdId = newProd.id;
      } catch (err: any) {
        if (payload.subcategory_id && err.message?.includes("subcategory_id")) {
          delete payload.subcategory_id;
          const { data: newProd, error } = await supabase
            .from("products")
            .insert(payload)
            .select("id")
            .single();
          if (error) throw error;
          newProdId = newProd.id;
        } else {
          throw err;
        }
      }

      // Si el usuario opera en Fábrica o Bodega, crear balance inicial 0
      if (user?.factoryId) {
        await supabase.from("inventory_balances").insert({
          product_id: newProdId,
          location_type: "factory",
          factory_id: user.factoryId,
          quantity: 0,
        });
      } else if (user?.warehouseId) {
        await supabase.from("inventory_balances").insert({
          product_id: newProdId,
          location_type: "warehouse",
          warehouse_id: user.warehouseId,
          quantity: 0,
        });
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_balances"] });
      queryClient.invalidateQueries({ queryKey: ["all_products_catalog"] });
      queryClient.invalidateQueries({ queryKey: ["product_categories_hierarchical"] });
    }
  });

  // Mutación: Actualizar Producto
  const updateProductMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      name?: string;
      category_id?: string;
      subcategory_id?: string | null;
      unit_value?: number;
      cost_value?: number;
      unit_name?: string;
      sku?: string;
      description?: string;
    }) => {
      const updatePayload: any = {};
      if (data.name !== undefined) updatePayload.name = data.name.trim();
      if (data.category_id !== undefined) updatePayload.category_id = data.category_id;
      if (data.subcategory_id !== undefined) updatePayload.subcategory_id = data.subcategory_id;
      if (data.unit_value !== undefined) updatePayload.unit_value = data.unit_value;
      if (data.cost_value !== undefined) updatePayload.cost_value = data.cost_value;
      if (data.unit_name !== undefined) updatePayload.unit_name = data.unit_name;
      if (data.sku !== undefined) updatePayload.sku = data.sku?.trim() || null;
      if (data.description !== undefined) updatePayload.description = data.description?.trim() || null;
      updatePayload.updated_at = new Date().toISOString();

      try {
        const { error } = await supabase
          .from("products")
          .update(updatePayload)
          .eq("id", data.id);
        if (error) throw error;
      } catch (err: any) {
        if (updatePayload.subcategory_id && err.message?.includes("subcategory_id")) {
          delete updatePayload.subcategory_id;
          const { error } = await supabase
            .from("products")
            .update(updatePayload)
            .eq("id", data.id);
          if (error) throw error;
        } else {
          throw err;
        }
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_balances"] });
      queryClient.invalidateQueries({ queryKey: ["all_products_catalog"] });
      queryClient.invalidateQueries({ queryKey: ["product_categories_hierarchical"] });
    }
  });

  // Mutación: Eliminar (Desactivar) Producto
  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("products")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_balances"] });
      queryClient.invalidateQueries({ queryKey: ["all_products_catalog"] });
      queryClient.invalidateQueries({ queryKey: ["product_categories_hierarchical"] });
    }
  });

  const catData = categoriesQuery.data || { all: [], main: [], subs: [] };

  return {
    inventory: inventoryQuery.data || [],
    allProducts: allProductsQuery.data || [],
    categories: catData.main,
    subcategories: catData.subs,
    allCategoriesRaw: catData.all,
    isLoading: inventoryQuery.isLoading || categoriesQuery.isLoading,
    error: inventoryQuery.error || categoriesQuery.error,
    getMovementsQuery,
    addMovement: addMovementMutation.mutateAsync,
    isUpdating: addMovementMutation.isPending,
    createCategory: createCategoryMutation.mutateAsync,
    isCreatingCategory: createCategoryMutation.isPending,
    updateCategory: updateCategoryMutation.mutateAsync,
    isUpdatingCategory: updateCategoryMutation.isPending,
    deleteCategory: deleteCategoryMutation.mutateAsync,
    isDeletingCategory: deleteCategoryMutation.isPending,
    createProduct: createProductMutation.mutateAsync,
    isCreatingProduct: createProductMutation.isPending,
    updateProduct: updateProductMutation.mutateAsync,
    isUpdatingProduct: updateProductMutation.isPending,
    deleteProduct: deleteProductMutation.mutateAsync,
    isDeletingProduct: deleteProductMutation.isPending,
  };
}
