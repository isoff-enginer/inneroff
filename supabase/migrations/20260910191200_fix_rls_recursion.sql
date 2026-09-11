-- ==============================================================================
-- FIX RLS RECURSION FOR CONVERSATIONS AND MEMBERS
-- ==============================================================================

-- 1. Helper function para verificar membresía de forma segura sin disparar RLS recursivamente
CREATE OR REPLACE FUNCTION public.is_conversation_member(p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_members cm
    WHERE cm.conversation_id = p_conversation_id
      AND cm.user_id = auth.uid()
      AND cm.left_at IS NULL
  );
$$;

-- 2. Permisos: restringir a usuarios autenticados
REVOKE ALL ON FUNCTION public.is_conversation_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_conversation_member(uuid) TO authenticated;

-- 3. Reescribir policy conversation_members_read
DROP POLICY IF EXISTS "conversation_members_read" ON public.conversation_members;
CREATE POLICY "conversation_members_read" 
ON public.conversation_members 
FOR SELECT 
TO authenticated
USING (
  public.is_conversation_member(conversation_id)
);

-- 4. Reescribir policy conversations_member_read
DROP POLICY IF EXISTS "conversations_member_read" ON public.conversations;
CREATE POLICY "conversations_member_read"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  public.is_conversation_member(id)
);
