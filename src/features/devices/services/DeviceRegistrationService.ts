import { supabase } from "@/integrations/supabase/client";
import { 
    generateAndSaveDeviceIdentity, 
    loadAndUnlockDeviceIdentity,
    DeviceIdentityPublicRecord 
} from '../../messages/crypto/DeviceIdentity';
import { PreKeyService } from '../../messages/services/PreKeyService';
import { getProtectedData } from '../../messages/crypto/KeyStore';

export class DeviceRegistrationService {
    private preKeyService = new PreKeyService();

    /**
     * Registra un nuevo dispositivo en Supabase (si no existe localmente o fue revocado).
     * Y sube todo el material criptográfico de X3DH.
     * Es idempotente localmente: si ya existe la llave pública local, solo verifica que
     * esté activa en Supabase y no recrea el dispositivo.
     */
    async registerCurrentDevice(pin: string, deviceName = navigator.userAgent): Promise<void> {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData.user) {
            throw new Error("User must be authenticated to register a device.");
        }

        const userId = authData.user.id;

        // 1. Detectar identidad local
        let publicRecord = await getProtectedData('identity', 'local_device_identity_public') as DeviceIdentityPublicRecord | null;
        let isNewLocalDevice = false;

        if (!publicRecord) {
            // Dispositivo totalmente nuevo localmente
            publicRecord = await generateAndSaveDeviceIdentity(pin);
            isNewLocalDevice = true;
        }

        const deviceId = publicRecord.device_id;
        const identitySigningPublicKey = publicRecord.public_identity_key_b64;
        const identityAgreementPublicKey = publicRecord.public_agreement_key_b64;

        // 2. Verificar estado en Supabase
        const { data: existingDevice, error: fetchErr } = await supabase
            .from('authorized_devices')
            .select('status')
            .eq('device_public_key', identitySigningPublicKey)
            .maybeSingle();

        if (fetchErr) {
            console.error("Error fetching authorized device:", fetchErr);
            throw new Error("Failed to verify device state with server.");
        }

        // Idempotencia: Si ya está registrado y activo, no hacemos nada más.
        if (existingDevice && existingDevice.status === 'active') {
            return; 
        }

        if (existingDevice && existingDevice.status !== 'active') {
            // Si la identidad local está atada a un dispositivo revocado, habría que rotarla.
            // Para mantenerlo simple, generamos una nueva identidad y pisamos la local.
            publicRecord = await generateAndSaveDeviceIdentity(pin);
            isNewLocalDevice = true;
            // Actualizamos referencias
        }

        // 3. Registrar el nuevo dispositivo en `authorized_devices`
        // Usamos la identitySigningPublicKey para la columna `device_public_key` como manda el schema actual.
        // NOTA: No podemos forzar un UUID nuestro en la columna `id` de Supabase si la tabla la genera con gen_random_uuid()
        // Generamos un fingerprint basado en la llave.
        const fingerprint = identitySigningPublicKey.substring(0, 32);

        const { data: insertedDevice, error: insertErr } = await supabase
            .from('authorized_devices')
            .insert({
                user_id: userId,
                device_name: deviceName,
                platform: navigator.platform || 'web',
                device_public_key: identitySigningPublicKey, // (Ed25519)
                status: 'active',
                device_fingerprint: fingerprint,
                first_seen_at: new Date().toISOString(),
                last_seen_at: new Date().toISOString()
            })
            .select('id')
            .single();

        if (insertErr || !insertedDevice) {
            console.error("Error registering authorized device:", insertErr);
            throw new Error("Failed to register device in Supabase.");
        }

        const serverDeviceId = insertedDevice.id;

        // Necesitamos desbloquear la identidad en memoria para que PreKeyService pueda firmar el SPK
        const unlockedIdentity = await loadAndUnlockDeviceIdentity(pin);

        // 4. Publicar Pre-Keys de forma segura
        // Publicar Signed Pre-Key y el Identity Agreement Key (X25519)
        await this.preKeyService.publishSignedPreKey(serverDeviceId, unlockedIdentity, identityAgreementPublicKey);

        // 5. Publicar 100 One-Time Pre-Keys
        await this.preKeyService.publishOneTimePreKeys(serverDeviceId, 100);
    }
}
