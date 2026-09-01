import { describe, it, expect } from 'vitest';
import { 
    generateAndSaveDeviceIdentity, 
    loadAndUnlockDeviceIdentity, 
    destroyLocalDeviceIdentity 
} from './DeviceIdentity';
import { deriveSharedSecret, sign, verify } from './CryptoCore';

const TEST_PIN = "123456"; // PIN estricto para simulación local
const WRONG_PIN = "654321";

describe('DeviceIdentity y KeyStore (Fase 2)', () => {

    it('should generate, protect and persist a new device identity', async () => {
        // Generamos identidad forzando el uso de Memoria (ya que Vitest/Node no tiene IndexedDB)
        const publicRecord = await generateAndSaveDeviceIdentity(TEST_PIN, true);
        
        // Comprobar public record
        expect(publicRecord.device_id).toBeDefined();
        expect(publicRecord.device_id.length).toBe(32); // 16 bytes en Hex
        expect(publicRecord.public_identity_key_b64).toBeDefined();
        expect(publicRecord.public_agreement_key_b64).toBeDefined();
        expect(publicRecord.crypto_version).toBe(1);
    });

    it('should retrieve and unlock identity using correct PIN', async () => {
        // Destruir por si acaso
        await destroyLocalDeviceIdentity(true);

        const publicRecord = await generateAndSaveDeviceIdentity(TEST_PIN, true);
        const unlocked = await loadAndUnlockDeviceIdentity(TEST_PIN, true);

        // Confirmar que el ID permanece igual
        expect(unlocked.deviceId).toBe(publicRecord.device_id);
        
        // Confirmar que las llaves privadas crudas nunca salen al publicRecord
        // y están cargadas exitosamente
        expect(unlocked.privateIdentityKey).toBeDefined();
        expect(unlocked.privateAgreementKey).toBeDefined();
    });

    it('should reject unlocking with incorrect PIN', async () => {
        await destroyLocalDeviceIdentity(true);
        await generateAndSaveDeviceIdentity(TEST_PIN, true);

        // Debe lanzar error por AES-GCM MAC validation fail al usar mal la llave
        await expect(loadAndUnlockDeviceIdentity(WRONG_PIN, true)).rejects.toThrow("Invalid PIN or corrupted key material");
    });

    it('should verify X25519 agreement between two separate devices', async () => {
        // Dispositivo A
        const aliceRecord = await generateAndSaveDeviceIdentity(TEST_PIN, true);
        const alice = await loadAndUnlockDeviceIdentity(TEST_PIN, true);
        await destroyLocalDeviceIdentity(true);

        // Dispositivo B
        const bobRecord = await generateAndSaveDeviceIdentity(TEST_PIN, true);
        const bob = await loadAndUnlockDeviceIdentity(TEST_PIN, true);
        await destroyLocalDeviceIdentity(true);

        // Comprobar identidades independientes
        expect(alice.deviceId).not.toBe(bob.deviceId);

        // Alice deriva secreto usando su Private + Bob Public
        const sharedA = deriveSharedSecret(alice.privateAgreementKey, bob.publicAgreementKey);
        
        // Bob deriva secreto usando su Private + Alice Public
        const sharedB = deriveSharedSecret(bob.privateAgreementKey, alice.publicAgreementKey);

        // Deben ser iguales
        expect(sharedA).toEqual(sharedB);
    });

    it('should verify Ed25519 identity signature', async () => {
        await destroyLocalDeviceIdentity(true);
        await generateAndSaveDeviceIdentity(TEST_PIN, true);
        const device = await loadAndUnlockDeviceIdentity(TEST_PIN, true);

        const message = new TextEncoder().encode("Autenticación de dispositivo");
        
        // El dispositivo firma
        const signature = sign(message, device.privateIdentityKey);

        // Cualquiera puede verificar con la pública
        const isValid = verify(message, signature, device.publicIdentityKey);
        expect(isValid).toBe(true);

        // Falla si el mensaje fue manipulado
        const badMessage = new TextEncoder().encode("Autenticación de dispositivO");
        const isBadValid = verify(badMessage, signature, device.publicIdentityKey);
        expect(isBadValid).toBe(false);
    });

    it('should securely destroy local identity', async () => {
        await destroyLocalDeviceIdentity(true);
        await generateAndSaveDeviceIdentity(TEST_PIN, true);

        // Destruir
        await destroyLocalDeviceIdentity(true);

        // Intentar cargar debe fallar
        await expect(loadAndUnlockDeviceIdentity(TEST_PIN, true)).rejects.toThrow("No device identity found on this device");
    });
});
