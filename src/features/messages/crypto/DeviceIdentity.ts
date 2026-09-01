/**
 * DeviceIdentity.ts
 * 
 * Gestiona la Identidad Criptográfica del dispositivo (Device Identity).
 * 
 * Cada dispositivo genera de manera local, única e irrepetible:
 * 1. Ed25519 KeyPair (Identity Signing Key) -> Para verificar quién habla.
 * 2. X25519 KeyPair (Key Agreement Key) -> Para establecer sesiones de E2EE.
 * 
 * El material privado se envuelve usando LocalKeyProtection y se guarda en KeyStore.
 * Supabase solo recibe el DeviceIdentityPublicRecord.
 */

import { generateSigningKeyPair, generateKeyAgreementKeyPair, randomBytes, bytesToBase64, base64ToBytes } from './CryptoCore';
import { wrapPrivateKey, unwrapPrivateKey, ProtectedMaterial } from './LocalKeyProtection';
import { saveProtectedData, getProtectedData, removeProtectedData, saveProtectedDataMemory, getProtectedDataMemory, removeProtectedDataMemory } from './KeyStore';

export interface DeviceIdentityPublicRecord {
    device_id: string; // Generado criptográficamente localmente
    public_identity_key_b64: string; // Ed25519
    public_agreement_key_b64: string; // X25519
    crypto_version: number;
}

export interface DeviceIdentityPrivateRecord {
    protected_identity_key: ProtectedMaterial;
    protected_agreement_key: ProtectedMaterial;
}

/**
 * Entidad completa en memoria durante la ejecución (después de desbloquear).
 */
export interface UnlockedDeviceIdentity {
    deviceId: string;
    publicIdentityKey: Uint8Array;
    publicAgreementKey: Uint8Array;
    privateIdentityKey: Uint8Array;
    privateAgreementKey: Uint8Array;
}

const IDENTITY_KEY_ID = 'local_device_identity';

/**
 * Helpers para usar memoria si IndexedDB no está disponible (ej. entorno de tests).
 */
async function saveStore(key: string, data: any, useMemory: boolean) {
    if (useMemory) await saveProtectedDataMemory('identity', key, data);
    else await saveProtectedData('identity', key, data);
}

async function getStore(key: string, useMemory: boolean) {
    if (useMemory) return await getProtectedDataMemory('identity', key);
    else return await getProtectedData('identity', key);
}

async function removeStore(key: string, useMemory: boolean) {
    if (useMemory) await removeProtectedDataMemory('identity', key);
    else await removeProtectedData('identity', key);
}

/**
 * Genera una nueva identidad local de dispositivo, la protege con PIN y la guarda.
 */
export async function generateAndSaveDeviceIdentity(pin: string, useMemoryStoreForTesting = false): Promise<DeviceIdentityPublicRecord> {
    // 1. Generar Device ID seguro
    const deviceIdBytes = randomBytes(16);
    // Convertir a un string hexadecimal para usarlo como UUID visual (sin los guiones estrictos, o base64 URL safe)
    // Para simplificar y mantenerlo alfanumérico, usaremos Hex:
    const deviceId = Array.from(deviceIdBytes).map(b => b.toString(16).padStart(2, '0')).join('');

    // 2. Generar pares de claves
    const identityPair = generateSigningKeyPair();
    const agreementPair = generateKeyAgreementKeyPair();

    // 3. Proteger las llaves privadas
    const protectedIdentityKey = wrapPrivateKey(identityPair.privateKey, pin);
    const protectedAgreementKey = wrapPrivateKey(agreementPair.privateKey, pin);

    const publicRecord: DeviceIdentityPublicRecord = {
        device_id: deviceId,
        public_identity_key_b64: bytesToBase64(identityPair.publicKey),
        public_agreement_key_b64: bytesToBase64(agreementPair.publicKey),
        crypto_version: 1
    };

    const privateRecord: DeviceIdentityPrivateRecord = {
        protected_identity_key: protectedIdentityKey,
        protected_agreement_key: protectedAgreementKey
    };

    // 4. Guardar en Storage local
    await saveStore(IDENTITY_KEY_ID + '_public', publicRecord, useMemoryStoreForTesting);
    await saveStore(IDENTITY_KEY_ID + '_private', privateRecord, useMemoryStoreForTesting);

    return publicRecord;
}

/**
 * Recupera la identidad local, solicita el PIN, descifra y retorna las llaves crudas en memoria.
 * Lanza excepción si el PIN es incorrecto o si no existe identidad local.
 */
export async function loadAndUnlockDeviceIdentity(pin: string, useMemoryStoreForTesting = false): Promise<UnlockedDeviceIdentity> {
    const publicRecord = await getStore(IDENTITY_KEY_ID + '_public', useMemoryStoreForTesting) as DeviceIdentityPublicRecord | null;
    const privateRecord = await getStore(IDENTITY_KEY_ID + '_private', useMemoryStoreForTesting) as DeviceIdentityPrivateRecord | null;

    if (!publicRecord || !privateRecord) {
        throw new Error("No device identity found on this device");
    }

    const privateIdentityKey = unwrapPrivateKey(privateRecord.protected_identity_key, pin);
    const privateAgreementKey = unwrapPrivateKey(privateRecord.protected_agreement_key, pin);

    return {
        deviceId: publicRecord.device_id,
        publicIdentityKey: base64ToBytes(publicRecord.public_identity_key_b64),
        publicAgreementKey: base64ToBytes(publicRecord.public_agreement_key_b64),
        privateIdentityKey,
        privateAgreementKey
    };
}

/**
 * Borra permanentemente la identidad de este dispositivo del almacenamiento local.
 */
export async function destroyLocalDeviceIdentity(useMemoryStoreForTesting = false): Promise<void> {
    await removeStore(IDENTITY_KEY_ID + '_public', useMemoryStoreForTesting);
    await removeStore(IDENTITY_KEY_ID + '_private', useMemoryStoreForTesting);
}
