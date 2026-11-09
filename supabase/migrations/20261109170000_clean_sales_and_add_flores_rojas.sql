-- Migration: Clean fictitious sales, ensure Verde, Blanco, Flores, Rojas categories exist, and seed subproducts

-- 1. Eliminar todas las ventas y recaudos ficticios de prueba
DELETE FROM public.payments;
DELETE FROM public.account_entries WHERE entry_type = 'income';

-- 2. Asegurar que las 4 categorías principales existan (Verde, Blanco, Flores, Rojas)
INSERT INTO public.product_categories (name, description, is_active)
VALUES 
  ('Verde', 'Productos Categoría Verde', true),
  ('Blanco', 'Productos Categoría Blanco', true),
  ('Flores', 'Productos Categoría Flores', true),
  ('Rojas', 'Productos Categoría Rojas', true)
ON CONFLICT DO NOTHING;

-- 3. Crear o asegurar subcategorías y productos para Verde, Blanco, Flores y Rojas
DO $$
DECLARE
  v_verde_id uuid;
  v_blanco_id uuid;
  v_flores_id uuid;
  v_rojas_id uuid;
  
  v_gordos_id uuid;
  v_largos_id uuid;
  v_minis_id uuid;
  v_promos_id uuid;
  
  v_mamita_id uuid;
  v_tornillo_id uuid;
  v_balde_id uuid;

  v_flores_sub_id uuid;
  v_rojas_sub_id uuid;
BEGIN
  SELECT id INTO v_verde_id FROM public.product_categories WHERE LOWER(name) = 'verde' LIMIT 1;
  SELECT id INTO v_blanco_id FROM public.product_categories WHERE LOWER(name) = 'blanco' LIMIT 1;
  SELECT id INTO v_flores_id FROM public.product_categories WHERE LOWER(name) = 'flores' LIMIT 1;
  SELECT id INTO v_rojas_id FROM public.product_categories WHERE LOWER(name) = 'rojas' LIMIT 1;

  -- =========================
  -- CATEGORÍA: VERDE
  -- =========================
  IF v_verde_id IS NOT NULL THEN
    INSERT INTO public.product_categories (name, description, parent_id, is_active)
    VALUES 
      ('Gordos', 'Subcategoría Gordos', v_verde_id, true),
      ('Largos', 'Subcategoría Largos', v_verde_id, true),
      ('Minis', 'Subcategoría Minis', v_verde_id, true),
      ('Promos', 'Subcategoría Promos', v_verde_id, true)
    ON CONFLICT DO NOTHING;

    SELECT id INTO v_gordos_id FROM public.product_categories WHERE LOWER(name) = 'gordos' AND parent_id = v_verde_id LIMIT 1;
    SELECT id INTO v_largos_id FROM public.product_categories WHERE LOWER(name) = 'largos' AND parent_id = v_verde_id LIMIT 1;
    SELECT id INTO v_minis_id FROM public.product_categories WHERE LOWER(name) = 'minis' AND parent_id = v_verde_id LIMIT 1;
    SELECT id INTO v_promos_id FROM public.product_categories WHERE LOWER(name) = 'promos' AND parent_id = v_verde_id LIMIT 1;

    IF NOT EXISTS (SELECT 1 FROM public.products WHERE LOWER(name) = 'gordos' AND category_id = v_verde_id) THEN
      INSERT INTO public.products (category_id, subcategory_id, name, sku, unit_name, unit_value, cost_value, description, is_active)
      VALUES (v_verde_id, v_gordos_id, 'Gordos', 'VER-GOR-01', 'Unidad', 3400, 17000, 'Balón: 255.000 | Proveedor: 17.000 | Unidad: 3.400', true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.products WHERE LOWER(name) = 'largos' AND category_id = v_verde_id) THEN
      INSERT INTO public.products (category_id, subcategory_id, name, sku, unit_name, unit_value, cost_value, description, is_active)
      VALUES (v_verde_id, v_largos_id, 'Largos', 'VER-LAR-01', 'Unidad', 4000, 20000, 'Balón: 300.000 | Proveedor: 20.000 | Unidad: 4.000', true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.products WHERE LOWER(name) = 'minis' AND category_id = v_verde_id) THEN
      INSERT INTO public.products (category_id, subcategory_id, name, sku, unit_name, unit_value, cost_value, description, is_active)
      VALUES (v_verde_id, v_minis_id, 'Minis', 'VER-MIN-01', 'Unidad', 1571, 11000, 'Balón: 110.000 | Proveedor: 11.000 | Unidad: 1.571', true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.products WHERE LOWER(name) = 'promos' AND category_id = v_verde_id) THEN
      INSERT INTO public.products (category_id, subcategory_id, name, sku, unit_name, unit_value, cost_value, description, is_active)
      VALUES (v_verde_id, v_promos_id, 'Promos', 'VER-PRO-01', 'Unidad', 1660, 15000, 'Balón: 150.000 | Proveedor: 15.000 | Unidad: 1.660', true);
    END IF;
  END IF;

  -- =========================
  -- CATEGORÍA: BLANCO
  -- =========================
  IF v_blanco_id IS NOT NULL THEN
    INSERT INTO public.product_categories (name, description, parent_id, is_active)
    VALUES 
      ('Mamita', 'Subcategoría Mamita', v_blanco_id, true),
      ('Tornillo', 'Subcategoría Tornillo', v_blanco_id, true),
      ('Balde', 'Subcategoría Balde', v_blanco_id, true)
    ON CONFLICT DO NOTHING;

    SELECT id INTO v_mamita_id FROM public.product_categories WHERE LOWER(name) = 'mamita' AND parent_id = v_blanco_id LIMIT 1;
    SELECT id INTO v_tornillo_id FROM public.product_categories WHERE LOWER(name) = 'tornillo' AND parent_id = v_blanco_id LIMIT 1;
    SELECT id INTO v_balde_id FROM public.product_categories WHERE LOWER(name) = 'balde' AND parent_id = v_blanco_id LIMIT 1;

    IF NOT EXISTS (SELECT 1 FROM public.products WHERE LOWER(name) = 'mamita' AND category_id = v_blanco_id) THEN
      INSERT INTO public.products (category_id, subcategory_id, name, sku, unit_name, unit_value, cost_value, description, is_active)
      VALUES (v_blanco_id, v_mamita_id, 'Mamita', 'BLA-MAM-01', 'Unidad', 4400, 44000, 'Bomba: 44.000 | Unidad: 4.400', true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.products WHERE LOWER(name) = 'tornillo' AND category_id = v_blanco_id) THEN
      INSERT INTO public.products (category_id, subcategory_id, name, sku, unit_name, unit_value, cost_value, description, is_active)
      VALUES (v_blanco_id, v_tornillo_id, 'Tornillo', 'BLA-TOR-01', 'Unidad', 5142, 36000, 'Bomba: 36.000 | Unidad: 5.142', true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.products WHERE LOWER(name) = 'balde' AND category_id = v_blanco_id) THEN
      INSERT INTO public.products (category_id, subcategory_id, name, sku, unit_name, unit_value, cost_value, description, is_active)
      VALUES (v_blanco_id, v_balde_id, 'Balde', 'BLA-BAL-01', 'Unidad', 8000, 0, 'Unidad: 8.000', true);
    END IF;
  END IF;

  -- =========================
  -- CATEGORÍA: FLORES
  -- =========================
  IF v_flores_id IS NOT NULL THEN
    INSERT INTO public.product_categories (name, description, parent_id, is_active)
    VALUES ('Flores', 'Subcategoría Flores', v_flores_id, true)
    ON CONFLICT DO NOTHING;

    SELECT id INTO v_flores_sub_id FROM public.product_categories WHERE LOWER(name) = 'flores' AND parent_id = v_flores_id LIMIT 1;

    IF NOT EXISTS (SELECT 1 FROM public.products WHERE LOWER(name) = 'flores' AND category_id = v_flores_id) THEN
      INSERT INTO public.products (category_id, subcategory_id, name, sku, unit_name, unit_value, cost_value, description, is_active)
      VALUES (v_flores_id, v_flores_sub_id, 'Flores', 'FLO-UNI-01', 'Unidad', 8000, 0, 'Unidad: 8.000', true);
    END IF;
  END IF;

  -- =========================
  -- CATEGORÍA: ROJAS
  -- =========================
  IF v_rojas_id IS NOT NULL THEN
    INSERT INTO public.product_categories (name, description, parent_id, is_active)
    VALUES ('Rojas', 'Subcategoría Rojas', v_rojas_id, true)
    ON CONFLICT DO NOTHING;

    SELECT id INTO v_rojas_sub_id FROM public.product_categories WHERE LOWER(name) = 'rojas' AND parent_id = v_rojas_id LIMIT 1;

    IF NOT EXISTS (SELECT 1 FROM public.products WHERE LOWER(name) = 'rojas' AND category_id = v_rojas_id) THEN
      INSERT INTO public.products (category_id, subcategory_id, name, sku, unit_name, unit_value, cost_value, description, is_active)
      VALUES (v_rojas_id, v_rojas_sub_id, 'Rojas', 'ROJ-UNI-01', 'Unidad', 8000, 0, 'Unidad: 8.000', true);
    END IF;
  END IF;

END $$;
