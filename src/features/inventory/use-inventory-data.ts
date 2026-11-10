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

  // 1. Balances de Inventario (EXCLUSIVO PARA BODEGA: Ni Fábrica ni Tienda tienen inventario)
  const inventoryQuery = useQuery({
    queryKey: ["inventory_balances", user?.id, role],
    queryFn: async () => {
      // Regla de Negocio: El inventario existe únicamente para BODEGA
      let query = supabase
        .from("inventory_balances")
        .select(`
          id,
          quantity,
          location_type,
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
        `)
        .eq("location_type", "warehouse");

      const { data, error } = await query;
      if (error) throw error;

      // Consolidar balances de bodega para los 9 productos canónicos
      const consolidated = new Map<string, InventoryProduct>();

      (data || []).forEach((row: any) => {
        const rawName = row.products?.name || "Desconocido";
        const canon = getCanonicalProductInfo(rawName);
        const qty = Number(row.quantity || 0);

        if (consolidated.has(canon.name)) {
          const existing = consolidated.get(canon.name)!;
          existing.quantity += qty;
          if (existing.quantity <= 0) existing.status = "agotado";
          else if (existing.quantity <= STOCK_THRESHOLD) existing.status = "poco_stock";
          else existing.status = "disponible";
        } else {
          let status: "disponible" | "poco_stock" | "agotado" = "disponible";
          if (qty <= 0) status = "agotado";
          else if (qty <= STOCK_THRESHOLD) status = "poco_stock";

          consolidated.set(canon.name, {
            id: row.id,
            productId: row.products?.id || "",
            name: canon.name,
            category: canon.category,
            categoryId: row.products?.category_id,
            subcategoryId: row.products?.subcategory_id || null,
            quantity: qty,
            status,
            locationType: "warehouse",
            locationId: row.warehouse_id || "warehouse-principal",
            unitValue: canon.price || row.products?.unit_value || 0,
            costValue: row.products?.cost_value || 0,
            sku: row.products?.sku || null,
            unitName: row.products?.unit_name || "Unidad",
            description: row.products?.description || null,
          });
        }
      });

      // Garantizar que los 9 productos oficiales siempre aparezcan en Bodega (aunque tengan stock 0)
      const CANONICAL_DEFAULTS = [
        { name: "Mamitas", category: "Blanco", price: 4400, sku: "BLA-MAM-01" },
        { name: "Tornillo", category: "Blanco", price: 5142, sku: "BLA-TOR-01" },
        { name: "Lisos", category: "Verde", price: 3400, sku: "VER-LIS-01" },
        { name: "Largos", category: "Verde", price: 4000, sku: "VER-LAR-01" },
        { name: "Minis", category: "Verde", price: 1571, sku: "VER-MIN-01" },
        { name: "Baldes", category: "Productos adicionales", price: 8000, sku: "ADI-BAL-01" },
        { name: "Rojas", category: "Productos adicionales", price: 8000, sku: "ADI-ROJ-01" },
        { name: "Flores", category: "Productos adicionales", price: 8000, sku: "ADI-FLO-01" },
        { name: "Pre-roll", category: "Productos adicionales", price: 8000, sku: "ADI-PRE-01" },
      ];

      CANONICAL_DEFAULTS.forEach((def) => {
        if (!consolidated.has(def.name)) {
          consolidated.set(def.name, {
            id: `inv-${def.name.toLowerCase()}`,
            productId: `prod-${def.name.toLowerCase()}`,
            name: def.name,
            category: def.category,
            quantity: 0,
            status: "agotado",
            locationType: "warehouse",
            locationId: "warehouse-principal",
            unitValue: def.price,
            costValue: 0,
            sku: def.sku,
            unitName: "Unidad",
            description: `Stock en Bodega: 0 unidades`,
          });
        }
      });

      return CANONICAL_DEFAULTS.map((def) => consolidated.get(def.name)!);
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

      // Filtrar estrictamente categorías basura como "Prueba" y "Rosa"
      const cleanCats = cats.filter(c => {
        const lower = (c.name || "").toLowerCase();
        return !lower.includes("prueba") && !lower.includes("rosa");
      });

      // Conteo de productos asociados
      const { data: prods } = await supabase
        .from("products")
        .select("id, category_id, is_active")
        .eq("is_active", true);

      const allCats: ProductCategory[] = cleanCats.map(c => {
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

      // Asegurar que existan los 3 grupos principales oficiales
      const officialGroupNames = ["Blanco", "Verde", "Productos adicionales"];
      officialGroupNames.forEach(gName => {
        if (!allCats.some(c => c.name.toLowerCase() === gName.toLowerCase() && !c.parentId)) {
          allCats.push({
            id: `cat-${gName.toLowerCase().replace(/\s+/g, "-")}`,
            name: gName,
            description: `Categoría ${gName}`,
            parentId: null,
            parent_id: null,
            productCount: 0,
            subcategories: [],
          });
        }
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

      // Filtrar de forma estricta para que en pantalla principal SOLO existan los 3 grupos oficiales
      const allowedMainNames = ["blanco", "verde", "adicional"];
      const strictlyFilteredMain = mainCategories.filter(m => 
        allowedMainNames.some(allowed => m.name.toLowerCase().includes(allowed))
      );

      return {
        all: allCats,
        main: strictlyFilteredMain.length > 0 ? strictlyFilteredMain : mainCategories,
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

      // 9 Productos Canónicos Oficiales (Blanco, Verde, Productos adicionales)
      const OFFICIAL_9_PRODUCTS = [
        { name: "Mamitas", categoryName: "Blanco", price: 4400, sku: "BLA-MAM-01", unit_name: "Unidad", description: "Bomba: 44.000 | Unidad: 4.400" },
        { name: "Tornillo", categoryName: "Blanco", price: 5142, sku: "BLA-TOR-01", unit_name: "Unidad", description: "Bomba: 36.000 | Unidad: 5.142" },
        { name: "Lisos", categoryName: "Verde", price: 3400, sku: "VER-LIS-01", unit_name: "Unidad", description: "Balón: 255.000 | Paquete: 17.000 | Unidad: 3.400" },
        { name: "Largos", categoryName: "Verde", price: 4000, sku: "VER-LAR-01", unit_name: "Unidad", description: "Balón: 300.000 | Paquete: 20.000 | Unidad: 4.000" },
        { name: "Minis", categoryName: "Verde", price: 1571, sku: "VER-MIN-01", unit_name: "Unidad", description: "Balón: 110.000 | Paquete: 11.000 | Unidad: 1.571" },
        { name: "Baldes", categoryName: "Productos adicionales", price: 8000, sku: "ADI-BAL-01", unit_name: "Unidad", description: "Unidad: 8.000" },
        { name: "Rojas", categoryName: "Productos adicionales", price: 8000, sku: "ADI-ROJ-01", unit_name: "Unidad", description: "Unidad: 8.000" },
        { name: "Flores", categoryName: "Productos adicionales", price: 8000, sku: "ADI-FLO-01", unit_name: "Unidad", description: "Unidad: 8.000" },
        { name: "Pre-roll", categoryName: "Productos adicionales", price: 8000, sku: "ADI-PRE-01", unit_name: "Unidad", description: "Unidad: 8.000" },
      ];

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

      // Garantizar que si Rojas, Flores o cualquier otro de los 9 oficiales falta en la BD, se inyecte siempre
      OFFICIAL_9_PRODUCTS.forEach(off => {
        if (!seenCanonical.has(off.name)) {
          seenCanonical.set(off.name, {
            id: `prod-${off.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
            name: off.name,
            category_id: `cat-${off.categoryName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
            unit_value: off.price,
            cost_value: 0,
            sku: off.sku,
            unit_name: off.unit_name,
            description: off.description,
            is_active: true,
            product_categories: { id: `cat-${off.categoryName.toLowerCase()}`, name: off.categoryName }
          });
        }
      });

      return OFFICIAL_9_PRODUCTS.map(off => seenCanonical.get(off.name)!);
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
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      // Regla de Negocio: El inventario físico es EXCLUSIVAMENTE de Bodega
      const locType = "warehouse";
      let resolvedLocId = locationId && UUID_REGEX.test(locationId) ? locationId : "";

      if (!resolvedLocId) {
        const { data: w } = await supabase.from("warehouses").select("id").limit(1);
        resolvedLocId = w?.[0]?.id || "44444444-4444-4444-4444-444444444444";
      }

      // Obtener producto real garantizando formato UUID estricto para evitar errores en Postgres
      let prodData: any = null;
      if (productId && UUID_REGEX.test(productId)) {
        const { data } = await supabase
          .from("products")
          .select("id, category_id, unit_value, name")
          .eq("id", productId)
          .maybeSingle();
        prodData = data;
      }

      if (!prodData) {
        const { data: byName } = await supabase
          .from("products")
          .select("id, category_id, unit_value, name")
          .ilike("name", `%${productId.replace(/^prod-/, "")}%`)
          .limit(1);
        prodData = byName?.[0];
      }

      if (!prodData) {
        const { data: firstProd } = await supabase
          .from("products")
          .select("id, category_id, unit_value, name")
          .limit(1);
        prodData = firstProd?.[0];
      }

      const resolvedProdId = prodData?.id;
      if (!resolvedProdId || !UUID_REGEX.test(resolvedProdId)) {
        throw new Error("No se pudo resolver el identificador de producto para inventario");
      }

      let categoryId = prodData?.category_id;
      const canon = getCanonicalProductInfo(prodData?.name || "");
      const unitValue = prodData?.unit_value || canon.price || 0;

      if (!categoryId || !UUID_REGEX.test(categoryId)) {
        const { data: anyCat } = await supabase.from("product_categories").select("id").limit(1);
        categoryId = anyCat?.[0]?.id || "33333333-3333-3333-3333-333333333333";
      }

      // 1. Buscar o actualizar el balance de inventario exclusivo de Bodega
      const balQuery = supabase
        .from("inventory_balances")
        .select("id, quantity")
        .eq("product_id", resolvedProdId)
        .eq("location_type", "warehouse")
        .eq("warehouse_id", resolvedLocId);

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
          location_type: "warehouse",
          warehouse_id: resolvedLocId,
          quantity: newQuantity,
        };

        await supabase.from("inventory_balances").insert(insertPayload);
      }

      // 2. Registrar movimiento de inventario exclusivo de Bodega
      const movementPayload: any = {
        product_id: resolvedProdId,
        category_id: categoryId,
        movement_type: isEntry ? "adjustment_in" : "adjustment_out",
        quantity: quantity,
        unit_value: unitValue,
        notes: notes || `Ajuste manual Bodega (${isEntry ? "Entrada" : "Salida"})`,
        created_by: (user?.id && UUID_REGEX.test(user.id)) ? user.id : null,
        from_location_type: "warehouse",
        to_location_type: "warehouse",
        ...(isEntry ? { to_warehouse_id: resolvedLocId } : { from_warehouse_id: resolvedLocId }),
      };

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
    mutationFn: async ({
      name,
      description,
      parentId,
      parent_id,
    }: {
      name: string;
      description?: string | null | undefined;
      parentId?: string | null | undefined;
      parent_id?: string | null | undefined;
    }) => {
      const resolvedParent = parentId !== undefined ? parentId : parent_id;
      const payload: any = {
        name: name.trim(),
        description: description?.trim() || null,
        is_active: true
      };
      if (resolvedParent) {
        payload.parent_id = resolvedParent;
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
    mutationFn: async ({
      id,
      name,
      description,
      parentId,
      parent_id,
    }: {
      id: string;
      name?: string | undefined;
      description?: string | null | undefined;
      parentId?: string | null | undefined;
      parent_id?: string | null | undefined;
    }) => {
      const resolvedParent = parentId !== undefined ? parentId : parent_id;
      const payload: any = {
        updated_at: new Date().toISOString()
      };
      if (name !== undefined) payload.name = name.trim();
      if (description !== undefined) payload.description = description ? description.trim() : null;
      if (resolvedParent !== undefined) payload.parent_id = resolvedParent;

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
      subcategory_id?: string | null | undefined;
      unit_value: number;
      cost_value?: number | undefined;
      unit_name?: string | undefined;
      sku?: string | null | undefined;
      description?: string | null | undefined;
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
      name?: string | undefined;
      category_id?: string | undefined;
      subcategory_id?: string | null | undefined;
      unit_value?: number | undefined;
      cost_value?: number | undefined;
      unit_name?: string | undefined;
      sku?: string | null | undefined;
      description?: string | null | undefined;
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
