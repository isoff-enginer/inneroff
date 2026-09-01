import { describe, it, expect } from 'vitest';
import { 
    encryptMessageKeyForDevice, 
    decryptMessageKeyFromEnvelope, 
    EnvelopeContext 
} from './EnvelopeEncryption';
import { generateKeyAgreementKeyPair, randomBytes, bytesToBase64, base64ToBytes } from './CryptoCore';

function createMockContext(overrides?: Partial<EnvelopeContext>): EnvelopeContext {
    return {
        protocol_version: 1,
        message_id: 'msg-1234',
        conversation_id: 'conv-5678',
        sender_device_id: 'dev-alice',
        recipient_device_id: 'dev-bob',
        key_algorithm: 'HPKE-X25519-AES256GCM',
        envelope_version: 1,
        ...overrides
    };
}

describe('Fase 3: Envelope Encryption (HPKE-like)', () => {

    it('1. Alice cifra Message Key para Bob y Bob descifra correctamente', () => {
        const aliceKey = generateKeyAgreementKeyPair();
        const bobKey = generateKeyAgreementKeyPair();
        
        const messageKey = randomBytes(32);
        const context = createMockContext();

        const envelope = encryptMessageKeyForDevice(messageKey, bobKey.publicKey, context);
        
        const decryptedKey = decryptMessageKeyFromEnvelope(envelope, bobKey.privateKey, context);
        
        expect(decryptedKey).toEqual(messageKey);
    });

    it('3. Alice no puede descifrar usando una private key incorrecta', () => {
        const aliceKey = generateKeyAgreementKeyPair();
        const bobKey = generateKeyAgreementKeyPair();
        const messageKey = randomBytes(32);
        const context = createMockContext();

        const envelope = encryptMessageKeyForDevice(messageKey, bobKey.publicKey, context);
        
        // Intentar descifrar con la privada de Alice en lugar de la de Bob
        expect(() => {
            decryptMessageKeyFromEnvelope(envelope, aliceKey.privateKey, context);
        }).toThrow();
    });

    it('4. Un tercero no puede descifrar', () => {
        const charlieKey = generateKeyAgreementKeyPair();
        const bobKey = generateKeyAgreementKeyPair();
        const messageKey = randomBytes(32);
        const context = createMockContext();

        const envelope = encryptMessageKeyForDevice(messageKey, bobKey.publicKey, context);
        
        // Charlie intenta descifrar
        expect(() => {
            decryptMessageKeyFromEnvelope(envelope, charlieKey.privateKey, context);
        }).toThrow();
    });

    it('5. Alterar ciphertext -> FAIL (Test Específico de Seguridad)', () => {
        const bobKey = generateKeyAgreementKeyPair();
        const messageKey = randomBytes(32);
        const context = createMockContext();

        const envelope = encryptMessageKeyForDevice(messageKey, bobKey.publicKey, context);
        
        // Test de Seguridad Específico: Modificar un solo byte del envelope
        const rawCiphertext = base64ToBytes(envelope.ciphertextB64);
        rawCiphertext[20] ^= 1; // Flip un bit en el ciphertext
        envelope.ciphertextB64 = bytesToBase64(rawCiphertext);
        
        expect(() => {
            decryptMessageKeyFromEnvelope(envelope, bobKey.privateKey, context);
        }).toThrow();
    });

    it('6. Alterar nonce -> FAIL', () => {
        const bobKey = generateKeyAgreementKeyPair();
        const envelope = encryptMessageKeyForDevice(randomBytes(32), bobKey.publicKey, createMockContext());
        
        const rawCiphertext = base64ToBytes(envelope.ciphertextB64);
        rawCiphertext[5] ^= 1; // Modificar el Nonce (primeros 12 bytes)
        envelope.ciphertextB64 = bytesToBase64(rawCiphertext);
        
        expect(() => decryptMessageKeyFromEnvelope(envelope, bobKey.privateKey, createMockContext())).toThrow();
    });

    it('7. Alterar ephemeralPublicKey -> FAIL', () => {
        const bobKey = generateKeyAgreementKeyPair();
        const envelope = encryptMessageKeyForDevice(randomBytes(32), bobKey.publicKey, createMockContext());
        
        const rawEphPub = base64ToBytes(envelope.ephemeralPublicKeyB64);
        rawEphPub[0] ^= 1;
        envelope.ephemeralPublicKeyB64 = bytesToBase64(rawEphPub);
        
        expect(() => decryptMessageKeyFromEnvelope(envelope, bobKey.privateKey, createMockContext())).toThrow();
    });

    it('8. Alterar message_id -> FAIL', () => {
        const bobKey = generateKeyAgreementKeyPair();
        const ctx = createMockContext();
        const envelope = encryptMessageKeyForDevice(randomBytes(32), bobKey.publicKey, ctx);
        
        const wrongCtx = { ...ctx, message_id: 'tampered-id' };
        expect(() => decryptMessageKeyFromEnvelope(envelope, bobKey.privateKey, wrongCtx)).toThrow();
    });

    it('9. Alterar conversation_id -> FAIL', () => {
        const bobKey = generateKeyAgreementKeyPair();
        const ctx = createMockContext();
        const envelope = encryptMessageKeyForDevice(randomBytes(32), bobKey.publicKey, ctx);
        
        const wrongCtx = { ...ctx, conversation_id: 'tampered-conv' };
        expect(() => decryptMessageKeyFromEnvelope(envelope, bobKey.privateKey, wrongCtx)).toThrow();
    });

    it('10. Alterar sender_device_id -> FAIL', () => {
        const bobKey = generateKeyAgreementKeyPair();
        const ctx = createMockContext();
        const envelope = encryptMessageKeyForDevice(randomBytes(32), bobKey.publicKey, ctx);
        
        const wrongCtx = { ...ctx, sender_device_id: 'fake-alice' };
        expect(() => decryptMessageKeyFromEnvelope(envelope, bobKey.privateKey, wrongCtx)).toThrow();
    });

    it('11. Alterar recipient_device_id -> FAIL', () => {
        const bobKey = generateKeyAgreementKeyPair();
        const ctx = createMockContext();
        const envelope = encryptMessageKeyForDevice(randomBytes(32), bobKey.publicKey, ctx);
        
        const wrongCtx = { ...ctx, recipient_device_id: 'fake-bob' };
        // También cambiamos la estructura local del envelope para simular que un atacante
        // copió el ciphertext pero cambió el ID en BD
        envelope.recipientDeviceId = 'fake-bob';
        expect(() => decryptMessageKeyFromEnvelope(envelope, bobKey.privateKey, wrongCtx)).toThrow();
    });

    it('12. Alterar algorithm/version -> FAIL', () => {
        const bobKey = generateKeyAgreementKeyPair();
        const ctx = createMockContext();
        const envelope = encryptMessageKeyForDevice(randomBytes(32), bobKey.publicKey, ctx);
        
        envelope.algorithm = 'FAKE-ALGO';
        expect(() => decryptMessageKeyFromEnvelope(envelope, bobKey.privateKey, ctx)).toThrow();
    });

    it('13. Message Key debe ser siempre exactamente 32 bytes', () => {
        const bobKey = generateKeyAgreementKeyPair();
        const badKey = randomBytes(31);
        expect(() => encryptMessageKeyForDevice(badKey, bobKey.publicKey, createMockContext())).toThrow();
    });

    it('14 & 15. Cada envelope genera ephemeral key y nonce diferentes', () => {
        const bobKey = generateKeyAgreementKeyPair();
        const messageKey = randomBytes(32);
        
        const env1 = encryptMessageKeyForDevice(messageKey, bobKey.publicKey, createMockContext());
        const env2 = encryptMessageKeyForDevice(messageKey, bobKey.publicKey, createMockContext());
        
        expect(env1.ephemeralPublicKeyB64).not.toBe(env2.ephemeralPublicKeyB64);
        
        // Nonce está en los primeros 12 bytes del ciphertext
        const nonce1 = base64ToBytes(env1.ciphertextB64).slice(0, 12);
        const nonce2 = base64ToBytes(env2.ciphertextB64).slice(0, 12);
        expect(nonce1).not.toEqual(nonce2);
    });

    it('16. Dos envelopes para el mismo dispositivo NO deben ser iguales', () => {
        const bobKey = generateKeyAgreementKeyPair();
        const messageKey = randomBytes(32);
        
        const env1 = encryptMessageKeyForDevice(messageKey, bobKey.publicKey, createMockContext());
        const env2 = encryptMessageKeyForDevice(messageKey, bobKey.publicKey, createMockContext());
        
        expect(env1.ciphertextB64).not.toBe(env2.ciphertextB64);
    });

    it('17. Envelope destinado a dispositivo A no puede descifrarse con dispositivo B', () => {
        const deviceA = generateKeyAgreementKeyPair();
        const deviceB = generateKeyAgreementKeyPair();
        
        const envelopeA = encryptMessageKeyForDevice(randomBytes(32), deviceA.publicKey, createMockContext());
        
        expect(() => {
            decryptMessageKeyFromEnvelope(envelopeA, deviceB.privateKey, createMockContext());
        }).toThrow();
    });

    it('18. Serialización/deserialización conserva todos los bytes', () => {
        const bobKey = generateKeyAgreementKeyPair();
        const mk = randomBytes(32);
        const envelope = encryptMessageKeyForDevice(mk, bobKey.publicKey, createMockContext());
        
        const stringified = JSON.stringify(envelope);
        const parsed = JSON.parse(stringified);
        
        const decrypted = decryptMessageKeyFromEnvelope(parsed, bobKey.privateKey, createMockContext());
        expect(decrypted).toEqual(mk);
    });

    it('19. Round-trip completo 100 veces sin fugas ni errores deterministas', () => {
        const bobKey = generateKeyAgreementKeyPair();
        
        for (let i = 0; i < 100; i++) {
            const ctx = createMockContext({ message_id: `msg-${i}` });
            const mk = randomBytes(32);
            
            const env = encryptMessageKeyForDevice(mk, bobKey.publicKey, ctx);
            const dec = decryptMessageKeyFromEnvelope(env, bobKey.privateKey, ctx);
            
            expect(dec).toEqual(mk);
        }
    });

    it('20. Inputs inválidos son rechazados', () => {
        const bobKey = generateKeyAgreementKeyPair();
        const ctx = createMockContext();
        
        expect(() => {
            encryptMessageKeyForDevice(randomBytes(32), randomBytes(15), ctx); // Mala public key
        }).toThrow();
        
        const env = encryptMessageKeyForDevice(randomBytes(32), bobKey.publicKey, ctx);
        
        expect(() => {
            decryptMessageKeyFromEnvelope(env, randomBytes(16), ctx); // Mala private key
        }).toThrow();
    });
});
