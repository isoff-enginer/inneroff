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

// Resolver canónico para unificar productos duplicados y asegurar los 9 productos exactos
export function getCanonicalProductInfo(name: string) {
  const n = (name || "").trim().toLowerCase();
  
  // Blanco: Mamitas y Tornillo
  if (n === "mamita" || n === "mamitas" || n.includes("mamita")) {
    return { name: "Mamitas", category: "Blanco", price: 4400, group: "blanco" as const };
  }
  if (n === "tornillo" || n === "tornillos" || n.includes("tornillo")) {
    return { name: "Tornillo", category: "Blanco", price: 5142, group: "blanco" as const };
  }
  
  // Verde: Lisos, Largos y Minis
  if (n === "liso" || n === "lisos" || n === "gordo" || n === "gordos" || n.includes("liso") || n.includes("gordo")) {
    return { name: "Lisos", category: "Verde", price: 3400, group: "verde" as const };
  }
  if (n === "largo" || n === "largos" || n.includes("largo")) {
    return { name: "Largos", category: "Verde", price: 4000, group: "verde" as const };
  }
  if (n === "mini" || n === "minis" || n.includes("mini")) {
    return { name: "Minis", category: "Verde", price: 1571, group: "verde" as const };
  }
  
  // Productos adicionales: Baldes, Rojas, Flores, Pre-roll (todos a $8.000)
  if (n === "balde" || n === "baldes" || n.includes("balde")) {
    return { name: "Baldes", category: "Productos adicionales", price: 8000, group: "adicionales" as const };
  }
  if (n === "roja" || n === "rojas" || n.includes("roja")) {
    return { name: "Rojas", category: "Productos adicionales", price: 8000, group: "adicionales" as const };
  }
  if (n === "flor" || n === "flores" || n.includes("flor")) {
    return { name: "Flores", category: "Productos adicionales", price: 8000, group: "adicionales" as const };
  }
  if (n.includes("roll") || n.includes("preroll") || n.includes("pre roll") || n.includes("pre-roll") || n.includes("pre rooll")) {
    return { name: "Pre-roll", category: "Productos adicionales", price: 8000, group: "adicionales" as const };
  }
  
  return { name: name.trim(), category: "Productos adicionales", price: 8000, group: "adicionales" as const };
}

export function useInventoryData() {
  const { user, role } = useSession();
  const queryClient = useQueryClient();

  // 1. Balances de Inventario (Deduplicados y normalizados)
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

      // Agrupar y deduplicar balances por producto canónico y ubicación
      const consolidated = new Map<string, InventoryProduct>();

      (data || []).forEach((row: any) => {
        const rawName = row.products?.name || "Desconocido";
        const canon = getCanonicalProductInfo(rawName);
        const qty = Number(row.quantity || 0);

        let locId = "";
        if (row.location_type === "store") locId = row.store_id || "";
        if (row.location_type === "warehouse") locId = row.warehouse_id || "";
        if (row.location_type === "factory") locId = row.factory_id || "";

        const groupKey = `${canon.name}__${row.location_type}__${locId}`;

        if (consolidated.has(groupKey)) {
          const existing = consolidated.get(groupKey)!;
          existing.quantity += qty;
          if (existing.quantity <= 0) existing.status = "agotado";
          else if (existing.quantity <= STOCK_THRESHOLD) existing.status = "poco_stock";
          else existing.status = "disponible";
        } else {
          let status: "disponible" | "poco_stock" | "agotado" = "disponible";
          if (qty <= 0) status = "agotado";
          else if (qty <= STOCK_THRESHOLD) status = "poco_stock";

          consolidated.set(groupKey, {
            id: row.id,
            productId: row.products?.id || "",
            name: canon.name,
            category: canon.category,
            categoryId: row.products?.category_id,
            subcategoryId: row.products?.subcategory_id || null,
            quantity: qty,
            status,
            locationType: row.location_type,
            locationId: locId,
            unitValue: canon.price || row.products?.unit_value || 0,
            costValue: row.products?.cost_value || 0,
            sku: row.products?.sku || null,
            unitName: row.products?.unit_name || "Unidad",
            description: row.products?.description || null,
          });
        }
      });

      const list = Array.from(consolidated.values());
      return list.sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: !!user,
  });

  // 2. Categorías y Subcategorías
  const categoriesQuery = useQuery({
    queryKey: ["product_categories_hierarchical"],
    queryFn: async () => {
      let cats: any[] = [];
      const { data: rawCats, error: catsError } = await supabase
        .from("product_categories")
        .select("id, name, description, is_active, parent_id")
        .eq("is_active", true)
        .order("name");

      if (catsError) {
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

  // 3. Catálogo Completo de Productos (Deduplicado a los 9 canónicos)
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

      // Deduplicar productos por nombre canónico
      const seenCanonical = new Map<string, any>();
      (data || []).forEach(p => {
        const canon = getCanonicalProductInfo(p.name);
        if (!seenCanonical.has(canon.name)) {
          seenCanonical.set(canon.name, {
            ...p,
            name: canon.name,
            unit_value: canon.price || p.unit_value,
            description: p.description || `Unidad: $${canon.price.toLocaleString()}`,
          });
        }
      });

      return Array.from(seenCanonical.values());
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
        
        if (locationType === "store" && locationId) {
          query = query.or(`from_store_id.eq.${locationId},to_store_id.eq.${locationId}`);
        } else if (locationType === "warehouse" && locationId) {
          query = query.or(`from_warehouse_id.eq.${locationId},to_warehouse_id.eq.${locationId}`);
        } else if (locationType === "factory" && locationId) {
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
      enabled: !!productId && !!locationId && locationId !== "undefined",
    });

  // Movimiento manual de inventario (Entrada / Salida a prueba de fallos)
  const addMovementMutation = useMutation({
    mutationFn: async ({
      productId,
      type,
      movementType,
      quantity,
      locationType,
      locationId,
      currentBalanceId,
      currentQuantity,
      notes,
    }: {
      productId: string;
      type?: "in" | "out";
      movementType?: string;
      quantity: number;
      locationType?: string;
      locationId?: string;
      currentBalanceId?: string;
      currentQuantity?: number;
      notes?: string;
    }) => {
      const isEntry = type === "in" || movementType === "adjustment_in" || movementType === "in" || (!type && !movementType?.includes("out"));
      const locType = locationType || "store";
      let resolvedLocId = locationId && locationId !== "undefined" ? locationId : "";

      // Si no tenemos ID de ubicación válido, buscar la primera activa de la base de datos
      if (!resolvedLocId) {
        if (locType === "store") {
          const { data: s } = await supabase.from("stores").select("id").neq("status", "inactive").limit(1);
          resolvedLocId = s?.[0]?.id || "";
        } else if (locType === "warehouse") {
          const { data: w } = await supabase.from("warehouses").select("id").eq("is_active", true).limit(1);
          resolvedLocId = w?.[0]?.id || "";
        } else if (locType === "factory") {
          const { data: f } = await supabase.from("factories").select("id").eq("is_active", true).limit(1);
          resolvedLocId = f?.[0]?.id || "";
        }
      }

      // Obtener producto real
      const { data: prodData } = await supabase
        .from("products")
        .select("id, category_id, unit_value, name")
        .eq("id", productId)
        .maybeSingle();

      let resolvedProdId = prodData?.id || productId;
      let categoryId = prodData?.category_id;
      const canon = getCanonicalProductInfo(prodData?.name || "");
      const unitValue = prodData?.unit_value || canon.price || 0;

      // Si la categoría no está asignada en el producto, buscar categoría por defecto
      if (!categoryId) {
        const { data: cat } = await supabase
          .from("product_categories")
          .select("id")
          .ilike("name", `%${canon.category}%`)
          .limit(1);
        categoryId = cat?.[0]?.id;
      }
      if (!categoryId) {
        const { data: anyCat } = await supabase.from("product_categories").select("id").limit(1);
        categoryId = anyCat?.[0]?.id || "";
      }

      // 1. Buscar o actualizar el balance de inventario correspondiente
      let balQuery = supabase
        .from("inventory_balances")
        .select("id, quantity")
        .eq("product_id", resolvedProdId)
        .eq("location_type", locType);

      if (locType === "store" && resolvedLocId) balQuery = balQuery.eq("store_id", resolvedLocId);
      else if (locType === "warehouse" && resolvedLocId) balQuery = balQuery.eq("warehouse_id", resolvedLocId);
      else if (locType === "factory" && resolvedLocId) balQuery = balQuery.eq("factory_id", resolvedLocId);

      const { data: existingBal } = await balQuery.maybeSingle();

      if (existingBal) {
        const currentQty = currentQuantity !== undefined && !isNaN(currentQuantity)
          ? currentQuantity 
          : Number(existingBal.quantity || 0);
        const newQuantity = isEntry ? currentQty + quantity : Math.max(0, currentQty - quantity);

        await supabase
          .from("inventory_balances")
          .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
          .eq("id", existingBal.id);
      } else {
        const newQuantity = isEntry ? quantity : 0;
        const insertPayload: any = {
          product_id: resolvedProdId,
          location_type: locType,
          quantity: newQuantity,
        };
        if (locType === "store" && resolvedLocId) insertPayload.store_id = resolvedLocId;
        if (locType === "warehouse" && resolvedLocId) insertPayload.warehouse_id = resolvedLocId;
        if (locType === "factory" && resolvedLocId) insertPayload.factory_id = resolvedLocId;

        await supabase.from("inventory_balances").insert(insertPayload);
      }

      // 2. Registrar movimiento de inventario (sin total_value para respetar columnas generadas)
      const movementPayload: any = {
        product_id: resolvedProdId,
        category_id: categoryId,
        movement_type: isEntry ? "adjustment_in" : "adjustment_out",
        quantity: quantity,
        unit_value: unitValue,
        notes: notes || `Ajuste manual (${isEntry ? "Entrada" : "Salida"})`,
        created_by: user?.id || null,
      };

      if (locType === "store" && resolvedLocId) {
        if (isEntry) movementPayload.to_store_id = resolvedLocId;
        else movementPayload.from_store_id = resolvedLocId;
        movementPayload[isEntry ? "to_location_type" : "from_location_type"] = "store";
      } else if (locType === "warehouse" && resolvedLocId) {
        if (isEntry) movementPayload.to_warehouse_id = resolvedLocId;
        else movementPayload.from_warehouse_id = resolvedLocId;
        movementPayload[isEntry ? "to_location_type" : "from_location_type"] = "warehouse";
      } else if (locType === "factory" && resolvedLocId) {
        if (isEntry) movementPayload.to_factory_id = resolvedLocId;
        else movementPayload.from_factory_id = resolvedLocId;
        movementPayload[isEntry ? "to_location_type" : "from_location_type"] = "factory";
      }

      try {
        await supabase.from("inventory_movements").insert(movementPayload);
      } catch (movErr) {
        console.warn("Advertencia al insertar inventory_movements:", movErr);
      }

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
