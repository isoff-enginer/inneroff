/**
 * PreKeyService.ts
 * 
 * Gestiona la publicación de material criptográfico público asimétrico (X3DH)
 * a Supabase. NUNCA envía private keys ni secretos.
 */

import { supabase } from '@/integrations/supabase/client';
import { generateSignedPreKey, generateOneTimePreKeys, PreKeyBundle } from '../crypto/PreKeyBundle';
import { getProtectedData, saveProtectedData } from '../crypto/KeyStore';

export class PreKeyService {
    
    /**
     * Sube a Supabase el X25519 Signed Pre-Key y el Identity Agreement Key.
     * La Identity Signing Key (Ed25519) ya reside en `authorized_devices`.
     * Las llaves privadas permanecen de forma segura en `KeyStore`.
     */
    async publishSignedPreKey(
        deviceId: string, 
        unlockedIdentity: any, 
        identityAgreementKeyB64: string
    ): Promise<void> {
        // Generamos un nuevo SPK y lo firmamos con la Ed25519 local
        const signedPreKeyId = 1; // Para la primera iteración, ID=1. Luego se implementará rotación.
        const { privateKey, signedPreKey } = generateSignedPreKey(unlockedIdentity.privateIdentityKey, signedPreKeyId);
        
        // Guardamos la private key localmente
        await saveProtectedData('signed_pre_key', 'latest', { id: signedPreKeyId, privateKey });

        // Subimos a Supabase (solo material PÚBLICO y FIRMAS)
        const { error } = await (supabase as any).from('device_pre_keys').upsert({
            device_id: deviceId,
            identity_agreement_key_b64: identityAgreementKeyB64,
            signed_pre_key_id: signedPreKey.keyId,
            signed_pre_key_b64: signedPreKey.publicKeyB64,
            signed_pre_key_signature_b64: signedPreKey.signatureB64,
            protocol_version: 1,
            updated_at: new Date().toISOString()
        }, { onConflict: 'device_id' });

        if (error) {
            console.error("Failed to publish Signed Pre-Key metadata", error.code);
            throw new Error("Failed to publish Signed Pre-Key");
        }
    }

    /**
     * Genera un lote de One-Time Pre-Keys y sube sus partes PÚBLICAS a Supabase.
     */
    async publishOneTimePreKeys(deviceId: string, count = 100): Promise<void> {
        // En un caso real, obtendríamos el max(key_id) actual desde el almacenamiento local
        // Asumimos un inicio en 1 para simplificar esta fase.
        const startId = 1; 
        
        const { privateKeys, publicKeys } = generateOneTimePreKeys(startId, count);
        
        // Guardar private keys localmente
        await saveProtectedData('one_time_pre_keys', 'pool', privateKeys);

        // Preparar payload masivo para Supabase (SOLO public keys)
        const payload = publicKeys.map(opk => ({
            device_id: deviceId,
            key_id: opk.keyId,
            public_key_b64: opk.publicKeyB64,
            consumed: false
        }));

        const { error } = await (supabase as any).from('one_time_pre_keys').insert(payload);
        if (error) {
            console.error("Failed to insert OPKs", error.code);
            throw new Error("Failed to publish One-Time Pre-Keys");
        }
    }

    /**
     * Obtiene el Pre-Key Bundle de un dispositivo remoto consumiendo atómicamente un OPK.
     * Retorna el objeto exactamente como lo espera SessionBootstrap.ts.
     */
    async getPreKeyBundle(deviceId: string): Promise<PreKeyBundle> {
        const { data, error } = await (supabase as any).rpc('get_device_prekey_bundle', {
            p_device_id: deviceId
        });

        if (error || !data) {
            console.error("Failed to get pre-key bundle", error?.message);
            throw new Error("E2EE_SESSION_NOT_FOUND: Failed to fetch bundle");
        }

        const result = data as any;
        
        const bundle: PreKeyBundle = {
            identitySigningKeyB64: result.identitySigningKeyB64,
            identityAgreementKeyB64: result.identityAgreementKeyB64,
            signedPreKey: result.signedPreKey,
            oneTimePreKey: result.oneTimePreKey // Puede ser null
        };

        // NOTA: SessionBootstrap se encargará de verificar la firma de `signedPreKey` 
        // contra `identitySigningKeyB64` antes de consumir el bundle.
        return bundle;
    }
}
