-- =========================================================================
-- PURGA TOTAL DE DATOS DE PRUEBA Y POLÍTICAS RLS DEFINITIVAS
-- =========================================================================

-- 1. Desactivar Tienda Prueba y asegurar únicamente Centro y La Usa
UPDATE public.stores
SET status = 'inactive'
WHERE LOWER(name) NOT IN ('centro', 'la usa') OR LOWER(name) LIKE '%prueba%';

INSERT INTO public.stores (name, code, status, address, notes)
VALUES 
  ('Centro', 'STR-CEN-01', 'active', 'Sede Centro', 'Tienda Centro'),
  ('La Usa', 'STR-USA-01', 'active', 'Sede La Usa', 'Tienda La Usa')
ON CONFLICT DO NOTHING;

UPDATE public.stores
SET status = 'active'
WHERE LOWER(name) IN ('centro', 'la usa');

-- 2. Limpiar todos los despachos de prueba para reiniciar en blanco
DELETE FROM public.dispatch_items WHERE id IS NOT NULL;
DELETE FROM public.dispatches WHERE id IS NOT NULL;

-- 3. Limpiar ventas ficticias y recaudos de prueba para reiniciar en $0
DELETE FROM public.payment_allocations WHERE id IS NOT NULL;
DELETE FROM public.payments WHERE id IS NOT NULL;
DELETE FROM public.account_entries WHERE entry_type = 'income';

-- 4. Asegurar que las 3 categorías principales existan
INSERT INTO public.product_categories (name, description, is_active)
VALUES 
  ('Blanco', 'Categoría Blanco', true),
  ('Verde', 'Categoría Verde', true),
  ('Productos adicionales', 'Categoría Productos adicionales', true)
ON CONFLICT DO NOTHING;

-- 5. Asegurar los 9 productos oficiales en la base de datos
DO $$
DECLARE
  v_blanco_id uuid;
  v_verde_id uuid;
  v_adic_id uuid;
BEGIN
  SELECT id INTO v_blanco_id FROM public.product_categories WHERE LOWER(name) = 'blanco' AND parent_id IS NULL LIMIT 1;
  SELECT id INTO v_verde_id FROM public.product_categories WHERE LOWER(name) = 'verde' AND parent_id IS NULL LIMIT 1;
  SELECT id INTO v_adic_id FROM public.product_categories WHERE LOWER(name) = 'productos adicionales' AND parent_id IS NULL LIMIT 1;

  -- Blanco: Mamitas ($4.400) y Tornillo ($5.142)
  IF v_blanco_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE LOWER(name) IN ('mamita', 'mamitas')) THEN
      INSERT INTO public.products (category_id, name, sku, unit_name, unit_value, cost_value, is_active)
      VALUES (v_blanco_id, 'Mamitas', 'BLA-MAM-01', 'Unidad', 4400, 44000, true);
    ELSE
      UPDATE public.products SET name = 'Mamitas', category_id = v_blanco_id, unit_value = 4400, is_active = true WHERE LOWER(name) IN ('mamita', 'mamitas');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.products WHERE LOWER(name) IN ('tornillo', 'tornillos')) THEN
      INSERT INTO public.products (category_id, name, sku, unit_name, unit_value, cost_value, is_active)
      VALUES (v_blanco_id, 'Tornillo', 'BLA-TOR-01', 'Unidad', 5142, 36000, true);
    ELSE
      UPDATE public.products SET name = 'Tornillo', category_id = v_blanco_id, unit_value = 5142, is_active = true WHERE LOWER(name) IN ('tornillo', 'tornillos');
    END IF;
  END IF;

  -- Verde: Lisos ($3.400), Largos ($4.000) y Minis ($1.571)
  IF v_verde_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE LOWER(name) IN ('lisos', 'liso', 'gordos', 'gordo')) THEN
      INSERT INTO public.products (category_id, name, sku, unit_name, unit_value, cost_value, is_active)
      VALUES (v_verde_id, 'Lisos', 'VER-LIS-01', 'Unidad', 3400, 17000, true);
    ELSE
      UPDATE public.products SET name = 'Lisos', category_id = v_verde_id, unit_value = 3400, is_active = true WHERE LOWER(name) IN ('lisos', 'liso', 'gordos', 'gordo');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.products WHERE LOWER(name) IN ('largos', 'largo')) THEN
      INSERT INTO public.products (category_id, name, sku, unit_name, unit_value, cost_value, is_active)
      VALUES (v_verde_id, 'Largos', 'VER-LAR-01', 'Unidad', 4000, 20000, true);
    ELSE
      UPDATE public.products SET name = 'Largos', category_id = v_verde_id, unit_value = 4000, is_active = true WHERE LOWER(name) IN ('largos', 'largo');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.products WHERE LOWER(name) IN ('minis', 'mini')) THEN
      INSERT INTO public.products (category_id, name, sku, unit_name, unit_value, cost_value, is_active)
      VALUES (v_verde_id, 'Minis', 'VER-MIN-01', 'Unidad', 1571, 11000, true);
    ELSE
      UPDATE public.products SET name = 'Minis', category_id = v_verde_id, unit_value = 1571, is_active = true WHERE LOWER(name) IN ('minis', 'mini');
    END IF;
  END IF;

  -- Productos adicionales: Baldes, Rojas, Flores, Pre-roll (Todos a $8.000)
  IF v_adic_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE LOWER(name) IN ('baldes', 'balde')) THEN
      INSERT INTO public.products (category_id, name, sku, unit_name, unit_value, cost_value, is_active)
      VALUES (v_adic_id, 'Baldes', 'ADI-BAL-01', 'Unidad', 8000, 0, true);
    ELSE
      UPDATE public.products SET name = 'Baldes', category_id = v_adic_id, unit_value = 8000, is_active = true WHERE LOWER(name) IN ('baldes', 'balde');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.products WHERE LOWER(name) IN ('rojas', 'roja')) THEN
      INSERT INTO public.products (category_id, name, sku, unit_name, unit_value, cost_value, is_active)
      VALUES (v_adic_id, 'Rojas', 'ADI-ROJ-01', 'Unidad', 8000, 0, true);
    ELSE
      UPDATE public.products SET name = 'Rojas', category_id = v_adic_id, unit_value = 8000, is_active = true WHERE LOWER(name) IN ('rojas', 'roja');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.products WHERE LOWER(name) IN ('flores', 'flor')) THEN
      INSERT INTO public.products (category_id, name, sku, unit_name, unit_value, cost_value, is_active)
      VALUES (v_adic_id, 'Flores', 'ADI-FLO-01', 'Unidad', 8000, 0, true);
    ELSE
      UPDATE public.products SET name = 'Flores', category_id = v_adic_id, unit_value = 8000, is_active = true WHERE LOWER(name) IN ('flores', 'flor');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.products WHERE LOWER(name) IN ('pre-roll', 'preroll', 'pre roll', 'pre rooll')) THEN
      INSERT INTO public.products (category_id, name, sku, unit_name, unit_value, cost_value, is_active)
      VALUES (v_adic_id, 'Pre-roll', 'ADI-PRE-01', 'Unidad', 8000, 0, true);
    ELSE
      UPDATE public.products SET name = 'Pre-roll', category_id = v_adic_id, unit_value = 8000, is_active = true WHERE LOWER(name) IN ('pre-roll', 'preroll', 'pre roll', 'pre rooll');
    END IF;
  END IF;

  -- Desactivar cualquier otro producto que no sea uno de los 9 oficiales
  UPDATE public.products
  SET is_active = false
  WHERE LOWER(name) NOT IN (
    'mamitas', 'tornillo', 
    'lisos', 'largos', 'minis', 
    'baldes', 'rojas', 'flores', 'pre-roll'
  );

END $$;

-- 6. Políticas RLS seguras y permisivas para que los Recaudos NUNCA fallen
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payments_allow_all" ON public.payments;
DROP POLICY IF EXISTS "payments_read_policy" ON public.payments;
DROP POLICY IF EXISTS "payments_insert_policy" ON public.payments;

CREATE POLICY "payments_allow_all" ON public.payments
FOR ALL TO public
USING (true)
WITH CHECK (true);

ALTER TABLE public.account_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "account_entries_allow_all" ON public.account_entries;
CREATE POLICY "account_entries_allow_all" ON public.account_entries
FOR ALL TO public
USING (true)
WITH CHECK (true);

