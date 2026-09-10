-- Habilitar Mensajería por Roles Multi-Scope (Fase 5.3)

-- 1. Función para obtener los roles efectivos de mensajería (Acumulativo)
CREATE OR REPLACE FUNCTION public.get_effective_messaging_roles(p_user_id UUID)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_db_role public.app_role;
  v_status public.user_status;
  v_roles text[] := ARRAY[]::text[];
BEGIN
  -- Verificar que el usuario exista y esté activo
  SELECT role, status INTO v_db_role, v_status FROM public.profiles WHERE id = p_user_id;
  
  IF v_status != 'active' THEN
    RETURN v_roles; -- Retorna array vacío si no está activo
  END IF;

  -- 1. profiles.role
  IF v_db_role = 'boss' THEN v_roles := array_append(v_roles, 'boss'); END IF;
  IF v_db_role = 'boss_admin' THEN v_roles := array_append(v_roles, 'boss_admin'); END IF;
  IF v_db_role = 'operations_admin' THEN v_roles := array_append(v_roles, 'operations_admin'); END IF;
  IF v_db_role = 'factory' THEN v_roles := array_append(v_roles, 'factory'); END IF;

  -- 2. warehouse_users (membresía)
  -- Nota: No hay deleted_at / left_at en warehouse_users por el momento, si hubiese se chequearía.
  IF EXISTS(SELECT 1 FROM public.warehouse_users WHERE user_id = p_user_id) THEN
     v_roles := array_append(v_roles, 'warehouse');
  END IF;

  -- 3. store_users (membresía)
  IF EXISTS(SELECT 1 FROM public.store_users WHERE user_id = p_user_id) THEN
     v_roles := array_append(v_roles, 'store');
  END IF;

  -- 4. factory_users (solo agregar 'factory' si no lo tiene por profiles.role)
  IF NOT ('factory' = ANY(v_roles)) AND EXISTS(SELECT 1 FROM public.factory_users WHERE user_id = p_user_id) THEN
     v_roles := array_append(v_roles, 'factory');
  END IF;

  -- Retornar solo valores únicos por precaución
  RETURN ARRAY(SELECT DISTINCT unnest(v_roles));
END;
$$;

REVOKE ALL ON FUNCTION public.get_effective_messaging_roles(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_effective_messaging_roles(UUID) TO authenticated;

-- 2. Función para evaluar la matriz de comunicación
CREATE OR REPLACE FUNCTION public.can_message_roles(source_roles text[], target_roles text[])
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  s_role text;
  t_role text;
BEGIN
  -- Si alguno de los arrays está vacío (por ejemplo, usuarios inactivos), denegar
  IF array_length(source_roles, 1) IS NULL OR array_length(target_roles, 1) IS NULL THEN
    RETURN false;
  END IF;

  -- Iterar sobre cada posible pareja
  FOREACH s_role IN ARRAY source_roles
  LOOP
    FOREACH t_role IN ARRAY target_roles
    LOOP
      -- boss y boss_admin: pueden hablar con todos y todos con ellos
      IF s_role IN ('boss', 'boss_admin') OR t_role IN ('boss', 'boss_admin') THEN
        RETURN true;
      END IF;

      -- operations_admin: puede hablar con factory, warehouse, store
      IF s_role = 'operations_admin' AND t_role IN ('factory', 'warehouse', 'store') THEN
        RETURN true;
      END IF;
      IF t_role = 'operations_admin' AND s_role IN ('factory', 'warehouse', 'store') THEN
        RETURN true;
      END IF;

      -- factory: puede hablar con warehouse y store. PERO factory -> factory DENIED
      IF s_role = 'factory' AND t_role IN ('warehouse', 'store') THEN
        RETURN true;
      END IF;
      IF t_role = 'factory' AND s_role IN ('warehouse', 'store') THEN
        RETURN true;
      END IF;

      -- warehouse: puede hablar con store y factory. warehouse -> warehouse DENIED
      IF s_role = 'warehouse' AND t_role IN ('store', 'factory') THEN
        RETURN true;
      END IF;
      IF t_role = 'warehouse' AND s_role IN ('store', 'factory') THEN
        RETURN true;
      END IF;

      -- store: puede hablar con warehouse y factory. store -> store DENIED
      IF s_role = 'store' AND t_role IN ('warehouse', 'factory') THEN
        RETURN true;
      END IF;
      IF t_role = 'store' AND s_role IN ('warehouse', 'factory') THEN
        RETURN true;
      END IF;

    END LOOP;
  END LOOP;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.can_message_roles(text[], text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_message_roles(text[], text[]) TO authenticated;

-- 3. Crear conversación
CREATE OR REPLACE FUNCTION public.create_direct_conversation(target_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_source_roles text[];
  v_target_roles text[];
  v_conversation_id UUID;
  v_allowed BOOLEAN := false;
BEGIN
  -- 2. rechazar si caller_id es null
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 3. rechazar target_user_id = caller_id
  IF v_caller_id = target_user_id THEN
    RAISE EXCEPTION 'Cannot create conversation with yourself';
  END IF;

  -- 4. a 7. Obtener roles (get_effective_messaging_roles ya valida que sean 'active')
  v_source_roles := public.get_effective_messaging_roles(v_caller_id);
  v_target_roles := public.get_effective_messaging_roles(target_user_id);

  IF array_length(v_source_roles, 1) IS NULL THEN
    RAISE EXCEPTION 'Source user is inactive or has no roles';
  END IF;
  
  IF array_length(v_target_roles, 1) IS NULL THEN
    RAISE EXCEPTION 'Target user is inactive or has no roles';
  END IF;

  -- 8. evaluar matriz
  v_allowed := public.can_message_roles(v_source_roles, v_target_roles);

  -- 9. si ninguna combinación está permitida:
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Messaging not allowed between these users';
  END IF;

  -- 10. buscar conversación DIRECTA existente y 11. asegurar que tenga exactamente esos 2 miembros activos
  SELECT c.id INTO v_conversation_id
  FROM public.conversations c
  WHERE c.type = 'direct'
    AND EXISTS (SELECT 1 FROM public.conversation_members cm WHERE cm.conversation_id = c.id AND cm.user_id = v_caller_id AND cm.left_at IS NULL)
    AND EXISTS (SELECT 1 FROM public.conversation_members cm WHERE cm.conversation_id = c.id AND cm.user_id = target_user_id AND cm.left_at IS NULL)
    -- Evitar grupos de 3+ miembros
    AND (SELECT COUNT(*) FROM public.conversation_members cm WHERE cm.conversation_id = c.id AND cm.left_at IS NULL) = 2
  LIMIT 1;

  -- 12. si existe, devolver conversation_id
  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  -- 13. si no existe: crear conversation, insertar miembros y devolver
  INSERT INTO public.conversations (type, created_by) 
  VALUES ('direct', v_caller_id) 
  RETURNING id INTO v_conversation_id;
  
  INSERT INTO public.conversation_members (conversation_id, user_id) 
  VALUES 
    (v_conversation_id, v_caller_id),
    (v_conversation_id, target_user_id);

  RETURN v_conversation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_direct_conversation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_direct_conversation(UUID) TO authenticated;

-- RLS: Asegurar que los miembros puedan leer la conversacion
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'conversations' AND policyname = 'Members can view conversations'
    ) THEN
        CREATE POLICY "Members can view conversations" 
        ON public.conversations FOR SELECT 
        USING (
            EXISTS (
                SELECT 1 FROM public.conversation_members
                WHERE conversation_id = conversations.id
                AND user_id = auth.uid()
                AND left_at IS NULL
            )
        );
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'conversation_members' AND policyname = 'Members can view members'
    ) THEN
        CREATE POLICY "Members can view members" 
        ON public.conversation_members FOR SELECT 
        USING (
            user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.conversation_members cm
                WHERE cm.conversation_id = conversation_members.conversation_id
                AND cm.user_id = auth.uid()
                AND cm.left_at IS NULL
            )
        );
    END IF;
END $$;
