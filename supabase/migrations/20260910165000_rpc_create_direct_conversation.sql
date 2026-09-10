-- ==============================================================================
-- FASE 5.3: MULTI-SCOPE DIRECT CONVERSATIONS
-- ==============================================================================

-- 1. get_effective_messaging_roles
-- Acumula el rol base y los scopes operativos reales del usuario.
CREATE OR REPLACE FUNCTION public.get_effective_messaging_roles(p_user_id UUID)
RETURNS text[] AS $$
DECLARE
    v_status public.user_status;
    v_base_role public.app_role;
    v_roles text[] := ARRAY[]::text[];
BEGIN
    -- Validar que el usuario exista y obtener estado/rol base
    SELECT status, role INTO v_status, v_base_role
    FROM public.profiles
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RETURN v_roles;
    END IF;

    -- Solo usuarios activos pueden mensajear
    IF v_status != 'active' THEN
        RETURN v_roles;
    END IF;

    -- 1. Añadir el rol base
    v_roles := array_append(v_roles, v_base_role::text);

    -- 2. Añadir scopes de store (si existe membresía)
    IF EXISTS (SELECT 1 FROM public.store_users WHERE user_id = p_user_id) THEN
        v_roles := array_append(v_roles, 'store');
    END IF;

    -- 3. Añadir scopes de warehouse (si existe membresía)
    IF EXISTS (SELECT 1 FROM public.warehouse_users WHERE user_id = p_user_id) THEN
        v_roles := array_append(v_roles, 'warehouse');
    END IF;

    -- 4. Añadir scopes de factory (si existe membresía)
    -- NOTA: factory también es un app_role. Lo agregamos como texto y luego eliminamos duplicados.
    IF EXISTS (SELECT 1 FROM public.factory_users WHERE user_id = p_user_id) THEN
        v_roles := array_append(v_roles, 'factory');
    END IF;

    -- Eliminar duplicados en el array final usando subconsulta
    RETURN ARRAY(SELECT DISTINCT unnest(v_roles));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.get_effective_messaging_roles(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_effective_messaging_roles(UUID) TO authenticated;

-- 2. can_message_roles
-- Evalúa si ALGUNO de los source_roles tiene permiso para comunicarse con ALGUNO de los target_roles.
CREATE OR REPLACE FUNCTION public.can_message_roles(source_roles text[], target_roles text[])
RETURNS boolean AS $$
DECLARE
    s text;
    t text;
BEGIN
    -- Si alguno de los dos está vacío, denegar
    IF array_length(source_roles, 1) IS NULL OR array_length(target_roles, 1) IS NULL THEN
        RETURN false;
    END IF;

    -- Recorrer producto cartesiano de roles
    FOREACH s IN ARRAY source_roles LOOP
        FOREACH t IN ARRAY target_roles LOOP
            -- Reglas de matriz:
            
            -- boss o boss_admin siempre pueden hablar con todos (y todos con ellos)
            IF s IN ('boss', 'boss_admin') OR t IN ('boss', 'boss_admin') THEN
                RETURN true;
            END IF;

            -- operations_admin puede hablar con factory, warehouse, store (ya boss fue evaluado)
            IF s = 'operations_admin' AND t IN ('factory', 'warehouse', 'store') THEN
                RETURN true;
            END IF;
            IF t = 'operations_admin' AND s IN ('factory', 'warehouse', 'store') THEN
                RETURN true;
            END IF;

            -- factory puede hablar con operations_admin, warehouse, store
            IF s = 'factory' AND t IN ('operations_admin', 'warehouse', 'store') THEN
                RETURN true;
            END IF;
            IF t = 'factory' AND s IN ('operations_admin', 'warehouse', 'store') THEN
                RETURN true;
            END IF;
            
            -- warehouse puede hablar con operations_admin, factory, store
            IF s = 'warehouse' AND t IN ('operations_admin', 'factory', 'store') THEN
                RETURN true;
            END IF;
            IF t = 'warehouse' AND s IN ('operations_admin', 'factory', 'store') THEN
                RETURN true;
            END IF;

            -- store puede hablar con operations_admin, factory, warehouse
            IF s = 'store' AND t IN ('operations_admin', 'factory', 'warehouse') THEN
                RETURN true;
            END IF;
            IF t = 'store' AND s IN ('operations_admin', 'factory', 'warehouse') THEN
                RETURN true;
            END IF;
            
            -- Notar que store-store, warehouse-warehouse, factory-factory devuelven falso aquí
            -- y el ciclo continuará buscando otras combinaciones posibles.
        END LOOP;
    END LOOP;

    RETURN false;
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.can_message_roles(text[], text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_message_roles(text[], text[]) TO authenticated;

-- 3. create_direct_conversation
-- Crea de forma segura la conversación directa evitando duplicados y race conditions.
CREATE OR REPLACE FUNCTION public.create_direct_conversation(target_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_source_roles text[];
    v_target_roles text[];
    v_existing_conversation_id UUID;
    v_new_conversation_id UUID;
    v_user1 UUID;
    v_user2 UUID;
BEGIN
    -- Validaciones base
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF v_caller_id = target_user_id THEN
        RAISE EXCEPTION 'Cannot create a direct conversation with yourself';
    END IF;

    -- Bloqueo consultivo determinístico para evitar race conditions
    v_user1 := LEAST(v_caller_id, target_user_id);
    v_user2 := GREATEST(v_caller_id, target_user_id);
    
    PERFORM pg_advisory_xact_lock(
        hashtext('direct_chat_' || v_user1::text || '_' || v_user2::text)
    );

    -- Obtener roles efectivos para ambos (ya valida internamente perfiles activos)
    v_source_roles := public.get_effective_messaging_roles(v_caller_id);
    v_target_roles := public.get_effective_messaging_roles(target_user_id);

    IF array_length(v_source_roles, 1) IS NULL THEN
        RAISE EXCEPTION 'Caller is not an active user or has no valid roles';
    END IF;

    IF array_length(v_target_roles, 1) IS NULL THEN
        RAISE EXCEPTION 'Target user does not exist or is inactive';
    END IF;

    -- Validar política de comunicación
    IF NOT public.can_message_roles(v_source_roles, v_target_roles) THEN
        RAISE EXCEPTION 'Communication between these roles is not permitted';
    END IF;

    -- Buscar si ya existe una conversación directa (type = 'direct') EXACTA
    -- Debe tener solo esos dos miembros activos (left_at IS NULL).
    SELECT c.id INTO v_existing_conversation_id
    FROM public.conversations c
    WHERE c.type = 'direct'
      AND EXISTS (
          SELECT 1 FROM public.conversation_members m1
          WHERE m1.conversation_id = c.id AND m1.user_id = v_caller_id AND m1.left_at IS NULL
      )
      AND EXISTS (
          SELECT 1 FROM public.conversation_members m2
          WHERE m2.conversation_id = c.id AND m2.user_id = target_user_id AND m2.left_at IS NULL
      )
      -- Asegurarse de que NO haya otros miembros activos aparte de estos dos
      AND NOT EXISTS (
          SELECT 1 FROM public.conversation_members m3
          WHERE m3.conversation_id = c.id 
            AND m3.user_id NOT IN (v_caller_id, target_user_id) 
            AND m3.left_at IS NULL
      );

    IF v_existing_conversation_id IS NOT NULL THEN
        RETURN v_existing_conversation_id;
    END IF;

    -- Si no existe, crear nueva conversación y asociar miembros
    INSERT INTO public.conversations (type, created_by)
    VALUES ('direct', v_caller_id)
    RETURNING id INTO v_new_conversation_id;

    INSERT INTO public.conversation_members (conversation_id, user_id)
    VALUES 
        (v_new_conversation_id, v_caller_id),
        (v_new_conversation_id, target_user_id);

    RETURN v_new_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION public.create_direct_conversation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_direct_conversation(UUID) TO authenticated;
