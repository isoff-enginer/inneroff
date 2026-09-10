-- Migration: Add sender_device_id and RLS validation to messages
-- Date: 2026-09-10

-- 1. Añadir columna sender_device_id
ALTER TABLE public.messages
ADD COLUMN sender_device_id UUID REFERENCES public.authorized_devices(id);

-- Se deja NULLABLE por ahora para no romper histórico si los hubiera,
-- pero las nuevas escrituras lo requerirán mediante RLS o constraints.

-- 2. Asegurar que sender_device_id sea indexado para lecturas eficientes (opcional pero recomendado)
CREATE INDEX IF NOT EXISTS idx_messages_sender_device ON public.messages(sender_device_id);

-- 3. Actualizar o crear políticas RLS de INSERT en public.messages
-- No aflojar el RLS general, sino restringir la escritura de sender_device_id

-- Asumimos que primero borramos la política INSERT previa para reemplazarla.
-- Auditar si existía una política llamada "Users can insert their own messages" o similar.
DROP POLICY IF EXISTS "Users can insert their own messages" ON public.messages;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.messages;

-- Crear política estricta de validación
CREATE POLICY "Users can insert messages from their own active devices"
    ON public.messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = auth.uid()
        AND sender_device_id IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.authorized_devices ad
            WHERE ad.id = sender_device_id
              AND ad.user_id = auth.uid()
              AND ad.status = 'active'
        )
    );
