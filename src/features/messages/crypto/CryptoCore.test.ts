import { describe, it, expect } from 'vitest';
import {
    generateKeyAgreementKeyPair,
    deriveSharedSecret,
    generateSigningKeyPair,
    sign,
    verify,
    deriveKeyHKDF,
    encryptSymmetric,
    decryptSymmetric,
    bytesToBase64,
    base64ToBytes,
    randomBytes
} from './CryptoCore';

// Vitest corre sobre Node, el cual soporta webcrypto globalThis.crypto en versiones modernas.
// El propio @noble detectará crypto globalmente. Si el test no falla en randomBytes,
// significa que el PRNG está funcionando.

describe('CryptoCore - Primitivas E2EE', () => {

    describe('Randomness', () => {
        it('should generate CSPRNG bytes of exactly the requested length', () => {
            const bytes1 = randomBytes(32);
            const bytes2 = randomBytes(32);
            
            expect(bytes1.length).toBe(32);
            expect(bytes2.length).toBe(32);
            
            // Comprobar que no son idénticos (muy baja probabilidad en 32 bytes)
            expect(bytes1).not.toEqual(bytes2);
        });
    });

    describe('X25519 (Key Agreement)', () => {
        it('should perform ECDH key exchange correctly', () => {
            const alice = generateKeyAgreementKeyPair();
            const bob = generateKeyAgreementKeyPair();

            expect(alice.privateKey.length).toBe(32);
            expect(alice.publicKey.length).toBe(32);

            const sharedSecretAlice = deriveSharedSecret(alice.privateKey, bob.publicKey);
            const sharedSecretBob = deriveSharedSecret(bob.privateKey, alice.publicKey);

            expect(sharedSecretAlice.length).toBe(32);
            // El secreto derivado por Alice debe ser idéntico al de Bob
            expect(sharedSecretAlice).toEqual(sharedSecretBob);
        });

        it('should fail deriving secret with incorrect key lengths', () => {
            const badKey = new Uint8Array(31);
            const goodKey = generateKeyAgreementKeyPair().publicKey;
            expect(() => deriveSharedSecret(badKey, goodKey)).toThrow();
        });
    });

    describe('Ed25519 (Identity/Signing)', () => {
        it('should sign and verify messages correctly', () => {
            const keyPair = generateSigningKeyPair();
            const message = new TextEncoder().encode("Contrato hiper secreto");

            const signature = sign(message, keyPair.privateKey);
            const isValid = verify(message, signature, keyPair.publicKey);

            expect(isValid).toBe(true);
        });

        it('should reject tampered messages', () => {
            const keyPair = generateSigningKeyPair();
            const message = new TextEncoder().encode("Mensaje original");
            const signature = sign(message, keyPair.privateKey);

            const tamperedMessage = new TextEncoder().encode("Mensaje originaI"); // Alterado
            const isValid = verify(tamperedMessage, signature, keyPair.publicKey);

            expect(isValid).toBe(false);
        });

        it('should reject tampered signatures', () => {
            const keyPair = generateSigningKeyPair();
            const message = new TextEncoder().encode("Mensaje original");
            const signature = sign(message, keyPair.privateKey);

            // Modificar 1 byte de la firma
            signature[0] ^= 1; 

            const isValid = verify(message, signature, keyPair.publicKey);
            expect(isValid).toBe(false);
        });
    });

    describe('HKDF-SHA256 (Key Derivation)', () => {
        it('should produce deterministic output for identical inputs', () => {
            const ikm = randomBytes(32);
            const salt = randomBytes(32);
            const info = new TextEncoder().encode("test-chain");

            const derived1 = deriveKeyHKDF(ikm, salt, info, 32);
            const derived2 = deriveKeyHKDF(ikm, salt, info, 32);

            expect(derived1).toEqual(derived2);
            expect(derived1.length).toBe(32);
        });

        it('should produce different output for different info strings', () => {
            const ikm = randomBytes(32);
            const salt = randomBytes(32);

            const derived1 = deriveKeyHKDF(ikm, salt, "chain-1", 32);
            const derived2 = deriveKeyHKDF(ikm, salt, "chain-2", 32);

            expect(derived1).not.toEqual(derived2);
        });
    });

    describe('AES-256-GCM (Symmetric AEAD)', () => {
        it('should encrypt and decrypt a message', () => {
            const key = randomBytes(32);
            const plaintext = new TextEncoder().encode("Texto de prueba con unicode: 🚀 áéíóú");
            
            const ciphertext = encryptSymmetric(plaintext, key);
            const decrypted = decryptSymmetric(ciphertext, key);
            
            expect(decrypted).toEqual(plaintext);
            expect(new TextDecoder().decode(decrypted)).toBe("Texto de prueba con unicode: 🚀 áéíóú");
        });

        it('should generate different ciphertexts for the same plaintext (nonce randomness)', () => {
            const key = randomBytes(32);
            const plaintext = new TextEncoder().encode("Mismo texto");
            
            const ct1 = encryptSymmetric(plaintext, key);
            const ct2 = encryptSymmetric(plaintext, key);
            
            expect(ct1).not.toEqual(ct2); // Los nonces deben ser diferentes
        });

        it('should fail to decrypt with the wrong key', () => {
            const key1 = randomBytes(32);
            const key2 = randomBytes(32);
            const plaintext = new TextEncoder().encode("Secreto");
            
            const ciphertext = encryptSymmetric(plaintext, key1);
            
            expect(() => decryptSymmetric(ciphertext, key2)).toThrow();
        });

        it('should fail to decrypt tampered ciphertext', () => {
            const key = randomBytes(32);
            const plaintext = new TextEncoder().encode("Mensaje muy importante");
            const ciphertext = encryptSymmetric(plaintext, key);
            
            // Alteramos un byte en medio del ciphertext
            ciphertext[15] ^= 1; 
            
            expect(() => decryptSymmetric(ciphertext, key)).toThrow();
        });

        it('should support Additional Authenticated Data (AAD)', () => {
            const key = randomBytes(32);
            const plaintext = new TextEncoder().encode("Secreto");
            const aad = new TextEncoder().encode("ID_DEL_MENSAJE_123");
            
            const ciphertext = encryptSymmetric(plaintext, key, aad);
            const decrypted = decryptSymmetric(ciphertext, key, aad);
            
            expect(decrypted).toEqual(plaintext);
        });

        it('should reject decryption if AAD is tampered or missing', () => {
            const key = randomBytes(32);
            const plaintext = new TextEncoder().encode("Secreto");
            const aad = new TextEncoder().encode("ID_DEL_MENSAJE_123");
            const wrongAad = new TextEncoder().encode("ID_DEL_MENSAJE_456");
            
            const ciphertext = encryptSymmetric(plaintext, key, aad);
            
            // Falla por AAD incorrecto
            expect(() => decryptSymmetric(ciphertext, key, wrongAad)).toThrow();
            // Falla por ausencia de AAD
            expect(() => decryptSymmetric(ciphertext, key)).toThrow();
        });

        it('should enforce 32-byte keys', () => {
            const badKey = randomBytes(16); // AES-128 key
            const plaintext = new TextEncoder().encode("Secreto");
            
            expect(() => encryptSymmetric(plaintext, badKey)).toThrow("AES-256-GCM requires a 32-byte key");
        });
    });

    describe('Base64 Helpers', () => {
        it('should encode and decode bytes correctly', () => {
            const bytes = randomBytes(50);
            const base64 = bytesToBase64(bytes);
            const decoded = base64ToBytes(base64);
            
            expect(decoded).toEqual(bytes);
        });
    });

});
