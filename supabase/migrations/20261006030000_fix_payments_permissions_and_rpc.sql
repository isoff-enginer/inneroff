-- ============================================================================
-- MIGRATION: Fix Payments RLS, Permissions and add record_store_payment RPC
-- ============================================================================

-- 1. Permisos explícitos en tabla payments y notificaciones
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.payments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.payments TO authenticated;
GRANT ALL ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.push_subscriptions TO authenticated;
GRANT SELECT ON TABLE public.system_settings TO authenticated, anon;
GRANT ALL ON TABLE public.system_settings TO authenticated;

-- Asegurar secuencias si existen
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 2. Habilitar y configurar RLS permisivo para authenticated en payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_authenticated_select" ON public.payments;
CREATE POLICY "payments_authenticated_select"
    ON public.payments
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "payments_authenticated_insert" ON public.payments;
CREATE POLICY "payments_authenticated_insert"
    ON public.payments
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "payments_authenticated_update" ON public.payments;
CREATE POLICY "payments_authenticated_update"
    ON public.payments
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 3. RLS permisivo en notificaciones para que cualquier rol pueda notificar al Boss
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_insert_all_auth" ON public.notifications;
CREATE POLICY "notifications_insert_all_auth"
    ON public.notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "notifications_select_user" ON public.notifications;
CREATE POLICY "notifications_select_user"
    ON public.notifications
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "notifications_update_user" ON public.notifications;
CREATE POLICY "notifications_update_user"
    ON public.notifications
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 4. RPC Blindada con SECURITY DEFINER para registrar recaudos de tienda sin error de permisos
CREATE OR REPLACE FUNCTION public.record_store_payment(
    p_store_id UUID,
    p_amount NUMERIC,
    p_category_id UUID DEFAULT NULL,
    p_collected_by_name TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_payment_id UUID;
    v_cat_id UUID := p_category_id;
    v_store_name TEXT := 'Tienda';
    v_collector_name TEXT;
    v_boss RECORD;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'El monto debe ser mayor a 0';
    END IF;

    -- Si no se pasa category_id, usar la primera activa
    IF v_cat_id IS NULL THEN
        SELECT id INTO v_cat_id FROM public.product_categories LIMIT 1;
    END IF;

    -- Obtener nombre de la tienda
    IF p_store_id IS NOT NULL THEN
        SELECT name INTO v_store_name FROM public.stores WHERE id = p_store_id;
    END IF;

    -- Obtener nombre del cobrador
    SELECT full_name INTO v_collector_name FROM public.profiles WHERE id = v_caller_id;
    IF p_collected_by_name IS NOT NULL AND length(trim(p_collected_by_name)) > 0 THEN
        v_collector_name := p_collected_by_name;
    END IF;

    -- Insertar en la tabla payments
    INSERT INTO public.payments (
        amount,
        category_id,
        store_id,
        collected_by,
        received_at,
        notes,
        status
    ) VALUES (
        p_amount,
        v_cat_id,
        p_store_id,
        v_caller_id,
        NOW(),
        COALESCE(p_notes, 'Recaudo de ' || v_store_name || ' registrado por ' || COALESCE(v_collector_name, 'Bodega')),
        'confirmed'
    ) RETURNING id INTO v_payment_id;

    -- Notificar a todos los usuarios con rol Boss / Admin
    FOR v_boss IN (
        SELECT id FROM public.profiles
        WHERE role IN ('boss', 'boss_admin', 'operations_admin')
          AND status = 'active'
    ) LOOP
        INSERT INTO public.notifications (
            user_id,
            title,
            body,
            type,
            reference_id,
            reference_type
        ) VALUES (
            v_boss.id,
            'Recaudo recibido: $' || to_char(p_amount, 'FM999,999,999'),
            COALESCE(v_collector_name, 'Bodega') || ' registró recaudo de ' || COALESCE(v_store_name, 'tienda') || '.',
            'payment',
            v_payment_id,
            'payment'
        );
    END LOOP;

    RETURN v_payment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_store_payment(UUID, NUMERIC, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_store_payment(UUID, NUMERIC, UUID, TEXT, TEXT) TO authenticated;
