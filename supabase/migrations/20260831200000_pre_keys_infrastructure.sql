-- Migration: Pre-Key Infrastructure for Asynchronous E2EE (X3DH)
-- Date: 2026-08-31
-- Description: Creates tables and RPC for storing and atomically distributing Pre-Key bundles.

CREATE TABLE IF NOT EXISTS public.device_pre_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES public.authorized_devices(id) ON DELETE CASCADE,
    identity_agreement_key_b64 TEXT NOT NULL,
    signed_pre_key_id INTEGER NOT NULL,
    signed_pre_key_b64 TEXT NOT NULL,
    signed_pre_key_signature_b64 TEXT NOT NULL,
    protocol_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(device_id)
);

CREATE TABLE IF NOT EXISTS public.one_time_pre_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES public.authorized_devices(id) ON DELETE CASCADE,
    key_id INTEGER NOT NULL,
    public_key_b64 TEXT NOT NULL,
    consumed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    consumed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(device_id, key_id)
);

-- Indices para optimización de OPKs disponibles
CREATE INDEX IF NOT EXISTS idx_one_time_pre_keys_available ON public.one_time_pre_keys(device_id, key_id) WHERE consumed = FALSE;

-- RLS para device_pre_keys
ALTER TABLE public.device_pre_keys ENABLE ROW LEVEL SECURITY;

-- Todos pueden leer las pre-keys (necesario para enviar mensajes a cualquier dispositivo)
CREATE POLICY "Authenticated users can read device_pre_keys"
    ON public.device_pre_keys
    FOR SELECT
    TO authenticated
    USING (true);

-- Solo el dueño del dispositivo puede insertar/actualizar su bundle
CREATE POLICY "Users can manage their own device_pre_keys"
    ON public.device_pre_keys
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.authorized_devices
            WHERE authorized_devices.id = device_pre_keys.device_id
            AND authorized_devices.user_id = auth.uid()
        )
    );

-- RLS para one_time_pre_keys
ALTER TABLE public.one_time_pre_keys ENABLE ROW LEVEL SECURITY;

-- Solo el dueño puede administrar sus OPKs
CREATE POLICY "Users can manage their own OPKs"
    ON public.one_time_pre_keys
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.authorized_devices
            WHERE authorized_devices.id = one_time_pre_keys.device_id
            AND authorized_devices.user_id = auth.uid()
        )
    );
-- El consumo de OPKs por parte de otros usuarios se hace estrictamente vía RPC (Security Definer)

-- RPC atómico para consumo de OPK y obtención del Bundle completo
CREATE OR REPLACE FUNCTION get_device_prekey_bundle(p_device_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_bundle RECORD;
    v_opk RECORD;
    v_result JSONB;
BEGIN
    -- Validar que el dispositivo existe y está activo
    IF NOT EXISTS (SELECT 1 FROM public.authorized_devices WHERE id = p_device_id AND status = 'active') THEN
        RAISE EXCEPTION 'Device not found or inactive';
    END IF;

    -- Obtener la base del bundle
    SELECT * INTO v_bundle 
    FROM public.device_pre_keys 
    WHERE device_id = p_device_id;

    IF v_bundle IS NULL THEN
        RAISE EXCEPTION 'PreKey bundle not found for device';
    END IF;

    -- Intentar obtener un OPK disponible de forma atómica y marcarlo consumido
    WITH consumed_opk AS (
        SELECT id, key_id, public_key_b64
        FROM public.one_time_pre_keys
        WHERE device_id = p_device_id AND consumed = FALSE
        ORDER BY key_id ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED -- Garantiza que concurrent requests no colisionen
    )
    UPDATE public.one_time_pre_keys
    SET consumed = TRUE, consumed_at = NOW()
    FROM consumed_opk
    WHERE public.one_time_pre_keys.id = consumed_opk.id
    RETURNING consumed_opk.key_id, consumed_opk.public_key_b64 INTO v_opk;

    -- Construir el resultado. Las claves están en la DB como base64, las inyectamos directo al JSON.
    v_result := jsonb_build_object(
        'device_id', p_device_id,
        'identitySigningKeyB64', (SELECT device_public_key FROM public.authorized_devices WHERE id = p_device_id),
        'identityAgreementKeyB64', v_bundle.identity_agreement_key_b64,
        'signedPreKey', jsonb_build_object(
            'keyId', v_bundle.signed_pre_key_id,
            'publicKeyB64', v_bundle.signed_pre_key_b64,
            'signatureB64', v_bundle.signed_pre_key_signature_b64
        ),
        'oneTimePreKey', CASE 
            WHEN v_opk.key_id IS NOT NULL THEN jsonb_build_object(
                'keyId', v_opk.key_id,
                'publicKeyB64', v_opk.public_key_b64
            ) 
            ELSE NULL 
        END,
        'protocolVersion', v_bundle.protocol_version
    );

    RETURN v_result;
END;
$$;

-- Restricción de permisos para el RPC (sólo usuarios autenticados)
REVOKE ALL ON FUNCTION get_device_prekey_bundle(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_device_prekey_bundle(UUID) TO authenticated;
