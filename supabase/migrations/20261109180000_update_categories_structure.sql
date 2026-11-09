-- Migration: Organize exact 3 groups (Blanco, Verde, Productos adicionales), fix products, and enable robust dispatches

-- 1. Ensure the 3 primary categories exist exactly as required
INSERT INTO public.product_categories (name, description, is_active)
VALUES 
  ('Blanco', 'Categoría Blanco', true),
  ('Verde', 'Categoría Verde', true),
  ('Productos adicionales', 'Categoría Productos adicionales', true)
ON CONFLICT DO NOTHING;

-- 2. Rename 'Gordos' to 'Lisos' if it exists under Verde
UPDATE public.products
SET name = 'Lisos', sku = 'VER-LIS-01', description = 'Balón: 255.000 | Proveedor: 17.000 | Unidad: 3.400'
WHERE LOWER(name) = 'gordos';

UPDATE public.product_categories
SET name = 'Lisos', description = 'Subcategoría Lisos'
WHERE LOWER(name) = 'gordos';

-- 3. Move 'Balde' from Blanco to 'Productos adicionales' if needed
DO $$
DECLARE
  v_blanco_id uuid;
  v_verde_id uuid;
  v_adic_id uuid;
  
  -- Subcategory / Product IDs
  v_mamita_id uuid;
  v_tornillo_id uuid;
  
  v_lisos_id uuid;
  v_largos_id uuid;
  v_minis_id uuid;
  
  v_rojas_id uuid;
  v_flores_id uuid;
  v_baldes_id uuid;
  v_preroll_id uuid;
BEGIN
  SELECT id INTO v_blanco_id FROM public.product_categories WHERE LOWER(name) = 'blanco' AND parent_id IS NULL LIMIT 1;
  SELECT id INTO v_verde_id FROM public.product_categories WHERE LOWER(name) = 'verde' AND parent_id IS NULL LIMIT 1;
  SELECT id INTO v_adic_id FROM public.product_categories WHERE LOWER(name) = 'productos adicionales' AND parent_id IS NULL LIMIT 1;

  -- ----------------------------------------------------
  -- A. GRUPO BLANCO: Mamitas y Tornillo
  -- ----------------------------------------------------
  IF v_blanco_id IS NOT NULL THEN
    -- Ensure subcategories
    INSERT INTO public.product_categories (name, description, parent_id, is_active)
    VALUES 
      ('Mamitas', 'Subcategoría Mamitas', v_blanco_id, true),
      ('Tornillo', 'Subcategoría Tornillo', v_blanco_id, true)
    ON CONFLICT DO NOTHING;

    SELECT id INTO v_mamita_id FROM public.product_categories WHERE LOWER(name) IN ('mamita', 'mamitas') AND parent_id = v_blanco_id LIMIT 1;
    SELECT id INTO v_tornillo_id FROM public.product_categories WHERE LOWER(name) = 'tornillo' AND parent_id = v_blanco_id LIMIT 1;

    -- Ensure products
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE LOWER(name) IN ('mamita', 'mamitas') AND category_id = v_blanco_id) THEN
      INSERT INTO public.products (category_id, subcategory_id, name, sku, unit_name, unit_value, cost_value, description, is_active)
      VALUES (v_blanco_id, v_mamita_id, 'Mamitas', 'BLA-MAM-01', 'Unidad', 4400, 44000, 'Bomba: 44.000 | Unidad: 4.400', true);
    ELSE
      UPDATE public.products SET name = 'Mamitas', unit_value = 4400, cost_value = 44000, category_id = v_blanco_id, subcategory_id = v_mamita_id
      WHERE LOWER(name) IN ('mamita', 'mamitas') AND category_id = v_blanco_id;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.products WHERE LOWER(name) = 'tornillo' AND category_id = v_blanco_id) THEN
      INSERT INTO public.products (category_id, subcategory_id, name, sku, unit_name, unit_value, cost_value, description, is_active)
      VALUES (v_blanco_id, v_tornillo_id, 'Tornillo', 'BLA-TOR-01', 'Unidad', 5142, 36000, 'Bomba: 36.000 | Unidad: 5.142', true);
    ELSE
      UPDATE public.products SET name = 'Tornillo', unit_value = 5142, cost_value = 36000, category_id = v_blanco_id, subcategory_id = v_tornillo_id
      WHERE LOWER(name) = 'tornillo' AND category_id = v_blanco_id;
    END IF;
  END IF;

  -- ----------------------------------------------------
  -- B. GRUPO VERDE: Lisos, Largos y Minis
  -- ----------------------------------------------------
  IF v_verde_id IS NOT NULL THEN
    INSERT INTO public.product_categories (name, description, parent_id, is_active)
    VALUES 
      ('Lisos', 'Subcategoría Lisos', v_verde_id, true),
      ('Largos', 'Subcategoría Largos', v_verde_id, true),
      ('Minis', 'Subcategoría Minis', v_verde_id, true)
    ON CONFLICT DO NOTHING;

    SELECT id INTO v_lisos_id FROM public.product_categories WHERE LOWER(name) IN ('lisos', 'gordos') AND parent_id = v_verde_id LIMIT 1;
    SELECT id INTO v_largos_id FROM public.product_categories WHERE LOWER(name) = 'largos' AND parent_id = v_verde_id LIMIT 1;
    SELECT id INTO v_minis_id FROM public.product_categories WHERE LOWER(name) = 'minis' AND parent_id = v_verde_id LIMIT 1;

    -- Lisos
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE LOWER(name) IN ('lisos', 'gordos') AND category_id = v_verde_id) THEN
      INSERT INTO public.products (category_id, subcategory_id, name, sku, unit_name, unit_value, cost_value, description, is_active)
      VALUES (v_verde_id, v_lisos_id, 'Lisos', 'VER-LIS-01', 'Unidad', 3400, 17000, 'Balón: 255.000 | Proveedor: 17.000 | Unidad: 3.400', true);
    ELSE
      UPDATE public.products SET name = 'Lisos', unit_value = 3400, cost_value = 17000, category_id = v_verde_id, subcategory_id = v_lisos_id
      WHERE LOWER(name) IN ('lisos', 'gordos') AND category_id = v_verde_id;
    END IF;

    -- Largos
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE LOWER(name) = 'largos' AND category_id = v_verde_id) THEN
      INSERT INTO public.products (category_id, subcategory_id, name, sku, unit_name, unit_value, cost_value, description, is_active)
      VALUES (v_verde_id, v_largos_id, 'Largos', 'VER-LAR-01', 'Unidad', 4000, 20000, 'Balón: 300.000 | Proveedor: 20.000 | Unidad: 4.000', true);
    ELSE
      UPDATE public.products SET name = 'Largos', unit_value = 4000, cost_value = 20000, category_id = v_verde_id, subcategory_id = v_largos_id
      WHERE LOWER(name) = 'largos' AND category_id = v_verde_id;
    END IF;

    -- Minis
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE LOWER(name) = 'minis' AND category_id = v_verde_id) THEN
      INSERT INTO public.products (category_id, subcategory_id, name, sku, unit_name, unit_value, cost_value, description, is_active)
      VALUES (v_verde_id, v_minis_id, 'Minis', 'VER-MIN-01', 'Unidad', 1571, 11000, 'Balón: 110.000 | Proveedor: 11.000 | Unidad: 1.571', true);
    ELSE
      UPDATE public.products SET name = 'Minis', unit_value = 1571, cost_value = 11000, category_id = v_verde_id, subcategory_id = v_minis_id
      WHERE LOWER(name) = 'minis' AND category_id = v_verde_id;
    END IF;
  END IF;

  -- ----------------------------------------------------
  -- C. PRODUCTOS ADICIONALES: Baldes rojas, Flores, Baldes, Pre-roll
  -- ----------------------------------------------------
  IF v_adic_id IS NOT NULL THEN
    INSERT INTO public.product_categories (name, description, parent_id, is_active)
    VALUES 
      ('Rojas', 'Subcategoría Rojas', v_adic_id, true),
      ('Flores', 'Subcategoría Flores', v_adic_id, true),
      ('Baldes', 'Subcategoría Baldes', v_adic_id, true),
      ('Pre-roll', 'Subcategoría Pre-roll', v_adic_id, true)
    ON CONFLICT DO NOTHING;

    SELECT id INTO v_rojas_id FROM public.product_categories WHERE LOWER(name) IN ('rojas', 'roja', 'baldes rojas') AND parent_id = v_adic_id LIMIT 1;
    SELECT id INTO v_flores_id FROM public.product_categories WHERE LOWER(name) = 'flores' AND parent_id = v_adic_id LIMIT 1;
    SELECT id INTO v_baldes_id FROM public.product_categories WHERE LOWER(name) IN ('balde', 'baldes') AND parent_id = v_adic_id LIMIT 1;
    SELECT id INTO v_preroll_id FROM public.product_categories WHERE LOWER(name) IN ('pre-roll', 'preroll', 'pre roll', 'pre rooll') AND parent_id = v_adic_id LIMIT 1;

    -- 1. Rojas ($8.000)
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE LOWER(name) IN ('rojas', 'roja') AND category_id = v_adic_id) THEN
      INSERT INTO public.products (category_id, subcategory_id, name, sku, unit_name, unit_value, cost_value, description, is_active)
      VALUES (v_adic_id, v_rojas_id, 'Rojas', 'ADI-ROJ-01', 'Unidad', 8000, 0, 'Unidad: 8.000', true);
    ELSE
      UPDATE public.products SET name = 'Rojas', category_id = v_adic_id, subcategory_id = v_rojas_id, unit_value = 8000 WHERE LOWER(name) IN ('rojas', 'roja', 'baldes rojas');
    END IF;

    -- 2. Flores ($8.000)
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE LOWER(name) = 'flores' AND category_id = v_adic_id) THEN
      INSERT INTO public.products (category_id, subcategory_id, name, sku, unit_name, unit_value, cost_value, description, is_active)
      VALUES (v_adic_id, v_flores_id, 'Flores', 'ADI-FLO-01', 'Unidad', 8000, 0, 'Unidad: 8.000', true);
    ELSE
      UPDATE public.products SET category_id = v_adic_id, subcategory_id = v_flores_id, unit_value = 8000 WHERE LOWER(name) = 'flores';
    END IF;

    -- 3. Baldes ($8.000)
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE LOWER(name) IN ('balde', 'baldes') AND category_id = v_adic_id) THEN
      INSERT INTO public.products (category_id, subcategory_id, name, sku, unit_name, unit_value, cost_value, description, is_active)
      VALUES (v_adic_id, v_baldes_id, 'Baldes', 'ADI-BAL-01', 'Unidad', 8000, 0, 'Unidad: 8.000', true);
    ELSE
      UPDATE public.products SET category_id = v_adic_id, subcategory_id = v_baldes_id, unit_value = 8000 WHERE LOWER(name) IN ('balde', 'baldes');
    END IF;

    -- 4. Pre-roll ($8.000)
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE LOWER(name) IN ('pre-roll', 'preroll', 'pre roll', 'pre rooll') AND category_id = v_adic_id) THEN
      INSERT INTO public.products (category_id, subcategory_id, name, sku, unit_name, unit_value, cost_value, description, is_active)
      VALUES (v_adic_id, v_preroll_id, 'Pre-roll', 'ADI-PRE-01', 'Unidad', 8000, 0, 'Unidad: 8.000', true);
    ELSE
      UPDATE public.products SET category_id = v_adic_id, subcategory_id = v_preroll_id, unit_value = 8000 WHERE LOWER(name) IN ('pre-roll', 'preroll', 'pre roll', 'pre rooll');
    END IF;
  END IF;

  -- ----------------------------------------------------
  -- D. TIENDAS ÚNICAS: Centro y La Usa
  -- ----------------------------------------------------
  -- 1. Centro
  IF NOT EXISTS (SELECT 1 FROM public.stores WHERE LOWER(name) = 'centro') THEN
    INSERT INTO public.stores (name, code, status, address, notes)
    VALUES ('Centro', 'STR-CEN-01', 'active', 'Sede Centro', 'Tienda Centro');
  ELSE
    UPDATE public.stores SET name = 'Centro', status = 'active' WHERE LOWER(name) = 'centro';
  END IF;

  -- 2. La Usa
  IF NOT EXISTS (SELECT 1 FROM public.stores WHERE LOWER(name) IN ('la usa', 'la-usa', 'lausa', 'usa')) THEN
    INSERT INTO public.stores (name, code, status, address, notes)
    VALUES ('La Usa', 'STR-USA-01', 'active', 'Sede La Usa', 'Tienda La Usa');
  ELSE
    UPDATE public.stores SET name = 'La Usa', status = 'active' WHERE LOWER(name) IN ('la usa', 'la-usa', 'lausa', 'usa');
  END IF;

  -- Inactivar cualquier otra tienda para que solo existan Centro y La Usa
  UPDATE public.stores
  SET status = 'inactive'
  WHERE LOWER(name) NOT IN ('centro', 'la usa');

END $$;

