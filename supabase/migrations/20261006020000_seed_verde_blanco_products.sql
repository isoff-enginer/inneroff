-- ==============================================================================
-- MIGRATION: SEED VERDE & BLANCO PRODUCTS, DERIVATIONS & STORE SETTINGS
-- Date: 2026-10-06
-- ==============================================================================

-- 1. Table for product presentation units (Balón, Bomba, Proveedor, Unidad, Balde)
CREATE TABLE IF NOT EXISTS public.product_presentations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- 'balon', 'bomba', 'proveedor', 'unidad', 'balde'
    label TEXT NOT NULL, -- 'Balón', 'Bomba', 'Proveedor', 'Unidad', 'Balde'
    price NUMERIC(12, 2) NOT NULL,
    cost NUMERIC(12, 2) DEFAULT 0,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, name)
);

-- Index for presentation lookup
CREATE INDEX IF NOT EXISTS idx_prod_pres_prod ON public.product_presentations(product_id);

-- RLS
ALTER TABLE public.product_presentations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can read presentations" ON public.product_presentations;
CREATE POLICY "Anyone authenticated can read presentations"
    ON public.product_presentations FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Boss can manage presentations" ON public.product_presentations;
CREATE POLICY "Boss can manage presentations"
    ON public.product_presentations FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
              AND profiles.role IN ('boss', 'boss_admin', 'operations_admin')
        )
    );

-- 2. System Settings Table (Maximum store dispatch limit, etc.)
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can read settings" ON public.system_settings;
CREATE POLICY "Anyone authenticated can read settings"
    ON public.system_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Boss can update settings" ON public.system_settings;
CREATE POLICY "Boss can update settings"
    ON public.system_settings FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
              AND profiles.role IN ('boss', 'boss_admin', 'operations_admin')
        )
    );

-- Insert default store dispatch limit ($250,000 COP)
INSERT INTO public.system_settings (key, value)
VALUES ('max_store_dispatch_value', '{"amount": 250000, "currency": "COP"}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 3. Seed Categories 'Verde' and 'Blanco'
INSERT INTO public.product_categories (name, description, is_active)
VALUES 
    ('Verde', 'Productos categoría Verde', true),
    ('Blanco', 'Productos categoría Blanco', true)
ON CONFLICT (name) DO UPDATE SET is_active = true;

-- 4. Seed Store 'Cambalache'
INSERT INTO public.stores (name, address, is_active)
VALUES ('Cambalache', 'Sede Principal Cambalache', true)
ON CONFLICT DO NOTHING;

-- 5. Helper Function to Seed Products with their exact Presentations
DO $$
DECLARE
    v_cat_verde UUID;
    v_cat_blanco UUID;
    v_prod_id UUID;
BEGIN
    SELECT id INTO v_cat_verde FROM public.product_categories WHERE name = 'Verde' LIMIT 1;
    SELECT id INTO v_cat_blanco FROM public.product_categories WHERE name = 'Blanco' LIMIT 1;

    -- PRODUCTOS VERDE:
    -- 1. Gordos (Balón: 255000, Proveedor: 17000, Unidad: 3400)
    INSERT INTO public.products (name, category_id, unit_value, unit_name, is_active)
    VALUES ('Gordos', v_cat_verde, 3400, 'unidad', true)
    ON CONFLICT DO NOTHING;
    SELECT id INTO v_prod_id FROM public.products WHERE name = 'Gordos' LIMIT 1;
    IF v_prod_id IS NOT NULL THEN
        INSERT INTO public.product_presentations (product_id, name, label, price, is_default)
        VALUES 
            (v_prod_id, 'balon', 'Balón', 255000, false),
            (v_prod_id, 'proveedor', 'Proveedor', 17000, false),
            (v_prod_id, 'unidad', 'Unidad', 3400, true)
        ON CONFLICT (product_id, name) DO UPDATE SET price = EXCLUDED.price;
    END IF;

    -- 2. Minis (Balón: 110000, Proveedor: 11000, Unidad: 1571)
    INSERT INTO public.products (name, category_id, unit_value, unit_name, is_active)
    VALUES ('Minis', v_cat_verde, 1571, 'unidad', true)
    ON CONFLICT DO NOTHING;
    SELECT id INTO v_prod_id FROM public.products WHERE name = 'Minis' LIMIT 1;
    IF v_prod_id IS NOT NULL THEN
        INSERT INTO public.product_presentations (product_id, name, label, price, is_default)
        VALUES 
            (v_prod_id, 'balon', 'Balón', 110000, false),
            (v_prod_id, 'proveedor', 'Proveedor', 11000, false),
            (v_prod_id, 'unidad', 'Unidad', 1571, true)
        ON CONFLICT (product_id, name) DO UPDATE SET price = EXCLUDED.price;
    END IF;

    -- 3. Largos (Balón: 300000, Proveedor: 20000, Unidad: 4000)
    INSERT INTO public.products (name, category_id, unit_value, unit_name, is_active)
    VALUES ('Largos', v_cat_verde, 4000, 'unidad', true)
    ON CONFLICT DO NOTHING;
    SELECT id INTO v_prod_id FROM public.products WHERE name = 'Largos' LIMIT 1;
    IF v_prod_id IS NOT NULL THEN
        INSERT INTO public.product_presentations (product_id, name, label, price, is_default)
        VALUES 
            (v_prod_id, 'balon', 'Balón', 300000, false),
            (v_prod_id, 'proveedor', 'Proveedor', 20000, false),
            (v_prod_id, 'unidad', 'Unidad', 4000, true)
        ON CONFLICT (product_id, name) DO UPDATE SET price = EXCLUDED.price;
    END IF;

    -- 4. Promo (Balón: 150000, Proveedor: 15000, Unidad: 1660)
    INSERT INTO public.products (name, category_id, unit_value, unit_name, is_active)
    VALUES ('Promo', v_cat_verde, 1660, 'unidad', true)
    ON CONFLICT DO NOTHING;
    SELECT id INTO v_prod_id FROM public.products WHERE name = 'Promo' LIMIT 1;
    IF v_prod_id IS NOT NULL THEN
        INSERT INTO public.product_presentations (product_id, name, label, price, is_default)
        VALUES 
            (v_prod_id, 'balon', 'Balón', 150000, false),
            (v_prod_id, 'proveedor', 'Proveedor', 15000, false),
            (v_prod_id, 'unidad', 'Unidad', 1660, true)
        ON CONFLICT (product_id, name) DO UPDATE SET price = EXCLUDED.price;
    END IF;

    -- PRODUCTOS BLANCO:
    -- 1. Baldes (Unidad: 8000)
    INSERT INTO public.products (name, category_id, unit_value, unit_name, is_active)
    VALUES ('Baldes', v_cat_blanco, 8000, 'unidad', true)
    ON CONFLICT DO NOTHING;
    SELECT id INTO v_prod_id FROM public.products WHERE name = 'Baldes' LIMIT 1;
    IF v_prod_id IS NOT NULL THEN
        INSERT INTO public.product_presentations (product_id, name, label, price, is_default)
        VALUES 
            (v_prod_id, 'balde', 'Balde', 8000, true),
            (v_prod_id, 'unidad', 'Unidad', 8000, false)
        ON CONFLICT (product_id, name) DO UPDATE SET price = EXCLUDED.price;
    END IF;

    -- 2. Mamitas (Bomba: 44000, Unidad: 4400)
    INSERT INTO public.products (name, category_id, unit_value, unit_name, is_active)
    VALUES ('Mamitas', v_cat_blanco, 4400, 'unidad', true)
    ON CONFLICT DO NOTHING;
    SELECT id INTO v_prod_id FROM public.products WHERE name = 'Mamitas' LIMIT 1;
    IF v_prod_id IS NOT NULL THEN
        INSERT INTO public.product_presentations (product_id, name, label, price, is_default)
        VALUES 
            (v_prod_id, 'bomba', 'Bomba', 44000, false),
            (v_prod_id, 'unidad', 'Unidad', 4400, true)
        ON CONFLICT (product_id, name) DO UPDATE SET price = EXCLUDED.price;
    END IF;

    -- 3. Tornillos (Bomba: 36000, Unidad: 5172)
    INSERT INTO public.products (name, category_id, unit_value, unit_name, is_active)
    VALUES ('Tornillos', v_cat_blanco, 5172, 'unidad', true)
    ON CONFLICT DO NOTHING;
    SELECT id INTO v_prod_id FROM public.products WHERE name = 'Tornillos' LIMIT 1;
    IF v_prod_id IS NOT NULL THEN
        INSERT INTO public.product_presentations (product_id, name, label, price, is_default)
        VALUES 
            (v_prod_id, 'bomba', 'Bomba', 36000, false),
            (v_prod_id, 'unidad', 'Unidad', 5172, true)
        ON CONFLICT (product_id, name) DO UPDATE SET price = EXCLUDED.price;
    END IF;
END $$;
