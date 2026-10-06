-- ==============================================================================
-- MIGRATION: SECURITY INDEXES, CLEAN MESSAGING, RATE LIMITING & DISPATCH FLOW
-- Date: 2026-10-06
-- Description: 
--   1. Adds high-performance database indexes across all key tables.
--   2. Provides SQL rate-limiting infrastructure for anti-abuse and anti-DDoS.
--   3. Simplifies messaging RLS & RPCs for clean, instant, secure delivery.
--   4. Adds atomic dispatch creation and acceptance RPCs for Factory/Warehouse/Store.
--   5. Enhances push & in-app notification infrastructure.
-- ==============================================================================

-- 1. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_messages_conv_sent ON public.messages(conversation_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_active ON public.conversation_members(conversation_id, user_id) WHERE left_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON public.conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_dispatches_status_date ON public.dispatches(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dispatches_from_fac ON public.dispatches(from_factory_id) WHERE from_factory_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dispatches_from_wh ON public.dispatches(from_warehouse_id) WHERE from_warehouse_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dispatches_to_wh ON public.dispatches(to_warehouse_id) WHERE to_warehouse_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dispatches_to_st ON public.dispatches(to_store_id) WHERE to_store_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dispatch_items_dispatch ON public.dispatch_items(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_items_product ON public.dispatch_items(product_id);

CREATE INDEX IF NOT EXISTS idx_inv_balances_fac ON public.inventory_balances(factory_id) WHERE factory_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inv_balances_wh ON public.inventory_balances(warehouse_id) WHERE warehouse_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inv_balances_st ON public.inventory_balances(store_id) WHERE store_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inv_balances_product ON public.inventory_balances(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_movements_prod_time ON public.inventory_movements(product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_sub_user_active ON public.push_subscriptions(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_profiles_role_status ON public.profiles(role, status);

-- 2. RATE LIMITING INFRASTRUCTURE
CREATE TABLE IF NOT EXISTS public.rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_request TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Function to verify rate limit safely (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_key TEXT,
    p_max_requests INTEGER DEFAULT 60,
    p_window_seconds INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_window_start TIMESTAMP WITH TIME ZONE;
    v_count INTEGER;
BEGIN
    SELECT window_start, count INTO v_window_start, v_count
    FROM public.rate_limits
    WHERE key = p_key
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.rate_limits (key, count, window_start, last_request)
        VALUES (p_key, 1, v_now, v_now);
        RETURN TRUE;
    END IF;

    -- Si el ciclo de tiempo expiró, reiniciar ventana
    IF v_now >= v_window_start + (p_window_seconds || ' seconds')::interval THEN
        UPDATE public.rate_limits
        SET count = 1,
            window_start = v_now,
            last_request = v_now
        WHERE key = p_key;
        RETURN TRUE;
    END IF;

    -- Si se supera el límite
    IF v_count >= p_max_requests THEN
        RETURN FALSE;
    END IF;

    -- Incrementar contador
    UPDATE public.rate_limits
    SET count = v_count + 1,
        last_request = v_now
    WHERE key = p_key;

    RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

-- 3. CLEAN DIRECT MESSAGING SECURITY & RLS
-- Permitir insertar mensajes si el usuario es miembro activo de la conversación (sin requisito de sender_device_id ni llaves E2EE pesadas)
DROP POLICY IF EXISTS "Users can insert messages from their own active devices" ON public.messages;
DROP POLICY IF EXISTS "Members can insert messages" ON public.messages;

CREATE POLICY "Members can insert messages"
    ON public.messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.conversation_members cm
            WHERE cm.conversation_id = messages.conversation_id
              AND cm.user_id = auth.uid()
              AND cm.left_at IS NULL
        )
    );

DROP POLICY IF EXISTS "Members can read messages" ON public.messages;
CREATE POLICY "Members can read messages"
    ON public.messages
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_members cm
            WHERE cm.conversation_id = messages.conversation_id
              AND cm.user_id = auth.uid()
              AND cm.left_at IS NULL
        )
    );

-- RPC: Enviar mensaje de forma directa, rápida y segura con rate limiting
CREATE OR REPLACE FUNCTION public.send_conversation_message(
    p_conversation_id UUID,
    p_content TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_msg_id UUID;
    v_sent_at TIMESTAMP WITH TIME ZONE := NOW();
    v_recipient RECORD;
    v_sender_name TEXT;
    v_clean_content TEXT;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Limpiar y sanitizar texto básico
    v_clean_content := trim(p_content);
    IF length(v_clean_content) = 0 THEN
        RAISE EXCEPTION 'Message cannot be empty';
    END IF;
    IF length(v_clean_content) > 4000 THEN
        RAISE EXCEPTION 'Message exceeds maximum allowed length';
    END IF;

    -- Rate limit: máximo 30 mensajes cada 10 segundos por usuario
    IF NOT public.check_rate_limit('msg_' || v_caller_id::text, 30, 10) THEN
        RAISE EXCEPTION 'Rate limit exceeded. Please wait a moment before sending more messages.';
    END IF;

    -- Validar que el usuario sea miembro activo
    IF NOT EXISTS (
        SELECT 1 FROM public.conversation_members
        WHERE conversation_id = p_conversation_id
          AND user_id = v_caller_id
          AND left_at IS NULL
    ) THEN
        RAISE EXCEPTION 'You are not a member of this conversation';
    END IF;

    -- Obtener nombre del remitente
    SELECT full_name INTO v_sender_name FROM public.profiles WHERE id = v_caller_id;

    -- Insertar mensaje
    INSERT INTO public.messages (
        conversation_id,
        sender_id,
        ciphertext,
        message_type,
        sent_at
    ) VALUES (
        p_conversation_id,
        v_caller_id,
        v_clean_content,
        'text',
        v_sent_at
    ) RETURNING id INTO v_msg_id;

    -- Actualizar timestamp de la conversación
    UPDATE public.conversations
    SET updated_at = v_sent_at
    WHERE id = p_conversation_id;

    -- Enviar notificaciones a los demás miembros
    FOR v_recipient IN (
        SELECT user_id FROM public.conversation_members
        WHERE conversation_id = p_conversation_id
          AND user_id != v_caller_id
          AND left_at IS NULL
    ) LOOP
        INSERT INTO public.notifications (
            user_id,
            title,
            body,
            type,
            reference_id,
            reference_type
        ) VALUES (
            v_recipient.user_id,
            COALESCE(v_sender_name, 'Nuevo mensaje'),
            CASE WHEN length(v_clean_content) > 60 THEN substring(v_clean_content from 1 for 57) || '...' ELSE v_clean_content END,
            'message',
            p_conversation_id,
            'conversation'
        );
    END LOOP;

    RETURN jsonb_build_object(
        'id', v_msg_id,
        'conversation_id', p_conversation_id,
        'sender_id', v_caller_id,
        'content', v_clean_content,
        'sent_at', v_sent_at
    );
END;
$$;

REVOKE ALL ON FUNCTION public.send_conversation_message(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_conversation_message(UUID, TEXT) TO authenticated;

-- 4. OPERATIONAL DISPATCH WORKFLOW RPCs (FÁBRICA DESPACHA -> BODEGA RECIBE Y DESPACHA)

-- RPC: Crear Despacho Operativo
CREATE OR REPLACE FUNCTION public.create_operational_dispatch(
    p_from_location_type public.location_type,
    p_from_id UUID,
    p_to_location_type public.location_type,
    p_to_id UUID,
    p_items JSONB, -- Array de { product_id: UUID, quantity: number, unit_value: number }
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_dispatch_id UUID;
    v_item RECORD;
    v_total_value NUMERIC := 0;
    v_product_id UUID;
    v_qty NUMERIC;
    v_unit_val NUMERIC;
    v_curr_bal_id UUID;
    v_curr_qty NUMERIC;
    v_from_fac UUID := NULL;
    v_from_wh UUID := NULL;
    v_from_st UUID := NULL;
    v_to_fac UUID := NULL;
    v_to_wh UUID := NULL;
    v_to_st UUID := NULL;
    v_dest_user RECORD;
    v_sender_name TEXT;
    v_dispatch_num INT;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Rate limit: max 10 dispatches per minute
    IF NOT public.check_rate_limit('disp_' || v_caller_id::text, 10, 60) THEN
        RAISE EXCEPTION 'Rate limit exceeded for creating dispatches';
    END IF;

    -- Asignar IDs según tipo
    IF p_from_location_type = 'factory' THEN v_from_fac := p_from_id;
    ELSIF p_from_location_type = 'warehouse' THEN v_from_wh := p_from_id;
    ELSIF p_from_location_type = 'store' THEN v_from_st := p_from_id;
    END IF;

    IF p_to_location_type = 'factory' THEN v_to_fac := p_to_id;
    ELSIF p_to_location_type = 'warehouse' THEN v_to_wh := p_to_id;
    ELSIF p_to_location_type = 'store' THEN v_to_st := p_to_id;
    END IF;

    -- Validar que haya items
    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Dispatch must have at least one item';
    END IF;

    -- Calcular valor total inicial
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity NUMERIC, unit_value NUMERIC) LOOP
        v_total_value := v_total_value + (COALESCE(v_item.quantity, 0) * COALESCE(v_item.unit_value, 0));
    END LOOP;

    -- Crear el despacho con status 'dispatched'
    INSERT INTO public.dispatches (
        from_location_type,
        from_factory_id,
        from_warehouse_id,
        from_store_id,
        to_location_type,
        to_factory_id,
        to_warehouse_id,
        to_store_id,
        status,
        dispatched_at,
        created_by,
        total_value,
        notes
    ) VALUES (
        p_from_location_type,
        v_from_fac,
        v_from_wh,
        v_from_st,
        p_to_location_type,
        v_to_fac,
        v_to_wh,
        v_to_st,
        'dispatched',
        NOW(),
        v_caller_id,
        v_total_value,
        p_notes
    ) RETURNING id, dispatch_number INTO v_dispatch_id, v_dispatch_num;

    -- Insertar items y deducir inventario del origen
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity NUMERIC, unit_value NUMERIC) LOOP
        v_product_id := v_item.product_id;
        v_qty := v_item.quantity;
        v_unit_val := COALESCE(v_item.unit_value, 0);

        IF v_qty <= 0 THEN
            RAISE EXCEPTION 'Item quantity must be greater than 0';
        END IF;

        INSERT INTO public.dispatch_items (
            dispatch_id,
            product_id,
            quantity,
            unit_value,
            total_value
        ) VALUES (
            v_dispatch_id,
            v_product_id,
            v_qty,
            v_unit_val,
            v_qty * v_unit_val
        );

        -- Buscar balance actual del origen
        SELECT id, quantity INTO v_curr_bal_id, v_curr_qty
        FROM public.inventory_balances
        WHERE product_id = v_product_id
          AND (
              (p_from_location_type = 'factory' AND factory_id = v_from_fac) OR
              (p_from_location_type = 'warehouse' AND warehouse_id = v_from_wh) OR
              (p_from_location_type = 'store' AND store_id = v_from_st)
          )
        LIMIT 1
        FOR UPDATE;

        IF v_curr_bal_id IS NOT NULL THEN
            UPDATE public.inventory_balances
            SET quantity = GREATEST(0, v_curr_qty - v_qty),
                updated_at = NOW()
            WHERE id = v_curr_bal_id;
        END IF;

        -- Registrar movimiento de salida
        INSERT INTO public.inventory_movements (
            product_id,
            category_id,
            movement_type,
            quantity,
            unit_value,
            from_location_type,
            from_factory_id,
            from_warehouse_id,
            from_store_id,
            to_location_type,
            to_factory_id,
            to_warehouse_id,
            to_store_id,
            created_by,
            notes
        ) VALUES (
            v_product_id,
            (SELECT category_id FROM public.products WHERE id = v_product_id),
            'dispatch',
            v_qty,
            v_unit_val,
            p_from_location_type,
            v_from_fac,
            v_from_wh,
            v_from_st,
            p_to_location_type,
            v_to_fac,
            v_to_wh,
            v_to_st,
            v_caller_id,
            'Salida por despacho #' || v_dispatch_num
        );
    END LOOP;

    -- Notificar a los usuarios del destino
    SELECT full_name INTO v_sender_name FROM public.profiles WHERE id = v_caller_id;

    IF p_to_location_type = 'warehouse' AND v_to_wh IS NOT NULL THEN
        FOR v_dest_user IN (SELECT user_id FROM public.warehouse_users WHERE warehouse_id = v_to_wh) LOOP
            INSERT INTO public.notifications (user_id, title, body, type, reference_id, reference_type)
            VALUES (
                v_dest_user.user_id,
                'Nuevo despacho entrante #' || v_dispatch_num,
                'Despachado por ' || COALESCE(v_sender_name, 'origen') || '. Listo para recibir.',
                'dispatch',
                v_dispatch_id,
                'dispatch'
            );
        END LOOP;
    ELSIF p_to_location_type = 'store' AND v_to_st IS NOT NULL THEN
        FOR v_dest_user IN (SELECT user_id FROM public.store_users WHERE store_id = v_to_st) LOOP
            INSERT INTO public.notifications (user_id, title, body, type, reference_id, reference_type)
            VALUES (
                v_dest_user.user_id,
                'Nuevo despacho para tienda #' || v_dispatch_num,
                'Despachado por ' || COALESCE(v_sender_name, 'bodega') || '.',
                'dispatch',
                v_dispatch_id,
                'dispatch'
            );
        END LOOP;
    END IF;

    -- Notificar a dirección (boss)
    FOR v_dest_user IN (SELECT id FROM public.profiles WHERE role IN ('boss', 'boss_admin') AND status = 'active') LOOP
        INSERT INTO public.notifications (user_id, title, body, type, reference_id, reference_type)
        VALUES (
            v_dest_user.id,
            'Despacho creado #' || v_dispatch_num,
            COALESCE(v_sender_name, 'Usuario') || ' despachó valor de $' || v_total_value,
            'dispatch',
            v_dispatch_id,
            'dispatch'
        );
    END LOOP;

    RETURN v_dispatch_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_operational_dispatch(public.location_type, UUID, public.location_type, UUID, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_operational_dispatch(public.location_type, UUID, public.location_type, UUID, JSONB, TEXT) TO authenticated;

-- RPC: Aceptar y Recibir Despacho (Bodega / Tienda)
CREATE OR REPLACE FUNCTION public.receive_and_accept_dispatch(
    p_dispatch_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_dispatch RECORD;
    v_item RECORD;
    v_curr_bal_id UUID;
    v_curr_qty NUMERIC;
    v_receiver_name TEXT;
    v_dest_user RECORD;
BEGIN
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Obtener despacho
    SELECT * INTO v_dispatch
    FROM public.dispatches
    WHERE id = p_dispatch_id
    FOR UPDATE;

    IF v_dispatch IS NULL THEN
        RAISE EXCEPTION 'Dispatch not found';
    END IF;

    IF v_dispatch.status = 'received' THEN
        RAISE EXCEPTION 'Dispatch has already been received';
    END IF;

    IF v_dispatch.status = 'cancelled' THEN
        RAISE EXCEPTION 'Cannot receive a cancelled dispatch';
    END IF;

    -- Actualizar estado a 'received'
    UPDATE public.dispatches
    SET status = 'received',
        received_at = NOW(),
        received_by = v_caller_id,
        notes = CASE 
            WHEN p_notes IS NOT NULL AND length(trim(p_notes)) > 0 
            THEN COALESCE(notes || E'\n', '') || 'Nota de recepción: ' || trim(p_notes)
            ELSE notes 
        END,
        updated_at = NOW()
    WHERE id = p_dispatch_id;

    -- Procesar cada item del despacho para sumarlo al balance de inventario de destino
    FOR v_item IN (SELECT * FROM public.dispatch_items WHERE dispatch_id = p_dispatch_id) LOOP
        -- Buscar si existe balance previo en el destino
        SELECT id, quantity INTO v_curr_bal_id, v_curr_qty
        FROM public.inventory_balances
        WHERE product_id = v_item.product_id
          AND (
              (v_dispatch.to_location_type = 'warehouse' AND warehouse_id = v_dispatch.to_warehouse_id) OR
              (v_dispatch.to_location_type = 'store' AND store_id = v_dispatch.to_store_id) OR
              (v_dispatch.to_location_type = 'factory' AND factory_id = v_dispatch.to_factory_id)
          )
        LIMIT 1
        FOR UPDATE;

        IF v_curr_bal_id IS NOT NULL THEN
            UPDATE public.inventory_balances
            SET quantity = v_curr_qty + v_item.quantity,
                updated_at = NOW()
            WHERE id = v_curr_bal_id;
        ELSE
            -- Insertar nuevo registro de balance
            INSERT INTO public.inventory_balances (
                product_id,
                location_type,
                factory_id,
                warehouse_id,
                store_id,
                quantity
            ) VALUES (
                v_item.product_id,
                v_dispatch.to_location_type,
                v_dispatch.to_factory_id,
                v_dispatch.to_warehouse_id,
                v_dispatch.to_store_id,
                v_item.quantity
            );
        END IF;

        -- Registrar movimiento de entrada por recepción
        INSERT INTO public.inventory_movements (
            product_id,
            category_id,
            movement_type,
            quantity,
            unit_value,
            from_location_type,
            from_factory_id,
            from_warehouse_id,
            from_store_id,
            to_location_type,
            to_factory_id,
            to_warehouse_id,
            to_store_id,
            created_by,
            notes
        ) VALUES (
            v_item.product_id,
            (SELECT category_id FROM public.products WHERE id = v_item.product_id),
            'receipt',
            v_item.quantity,
            v_item.unit_value,
            v_dispatch.from_location_type,
            v_dispatch.from_factory_id,
            v_dispatch.from_warehouse_id,
            v_dispatch.from_store_id,
            v_dispatch.to_location_type,
            v_dispatch.to_factory_id,
            v_dispatch.to_warehouse_id,
            v_dispatch.to_store_id,
            v_caller_id,
            'Entrada por recepción de despacho #' || v_dispatch.dispatch_number
        );
    END LOOP;

    -- Notificar al creador del despacho y a dirección
    SELECT full_name INTO v_receiver_name FROM public.profiles WHERE id = v_caller_id;

    IF v_dispatch.created_by IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, body, type, reference_id, reference_type)
        VALUES (
            v_dispatch.created_by,
            'Despacho recibido #' || v_dispatch.dispatch_number,
            'Recibido y aceptado exitosamente por ' || COALESCE(v_receiver_name, 'el destinatario'),
            'receipt',
            p_dispatch_id,
            'dispatch'
        );
    END IF;

    FOR v_dest_user IN (SELECT id FROM public.profiles WHERE role IN ('boss', 'boss_admin') AND status = 'active' AND id != v_caller_id) LOOP
        INSERT INTO public.notifications (user_id, title, body, type, reference_id, reference_type)
        VALUES (
            v_dest_user.id,
            'Despacho #' || v_dispatch.dispatch_number || ' recibido',
            COALESCE(v_receiver_name, 'Destinatario') || ' completó la recepción.',
            'receipt',
            p_dispatch_id,
            'dispatch'
        );
    END LOOP;

    RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.receive_and_accept_dispatch(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.receive_and_accept_dispatch(UUID, TEXT) TO authenticated;
