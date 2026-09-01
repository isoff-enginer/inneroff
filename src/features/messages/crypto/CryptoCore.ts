/**
 * CryptoCore.ts
 * 
 * Infraestructura criptográfica base para el sistema E2EE.
 * Inspirado en las arquitecturas modernas (Signal / iMessage).
 * 
 * ALGORITMOS:
 * - Key Agreement: X25519 (ECDH)
 * - Signing/Identity: Ed25519
 * - Key Derivation: HKDF-SHA256
 * - Symmetric AEAD: AES-256-GCM
 * 
 * Esta capa SOLO se encarga de transformaciones matemáticas puras.
 * No interactúa con UI, Base de Datos ni Storage.
 */

import { ed25519, x25519 } from '@noble/curves/ed25519';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import { gcm } from '@noble/ciphers/aes';

/**
 * Generador aleatorio CSPRNG estricto.
 */
export function randomBytes(length: number): Uint8Array {
    const array = new Uint8Array(length);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(array);
    } else {
        throw new Error("CSPRNG not available (crypto.getRandomValues is missing)");
    }
    return array;
}

// ============================================================================
// KEY AGREEMENT (X25519)
// ============================================================================

export function generateKeyAgreementKeyPair() {
    const privateKey = randomBytes(32); // 32 bytes for x25519
    const publicKey = x25519.getPublicKey(privateKey);
    return { privateKey, publicKey };
}

export function deriveSharedSecret(privateKey: Uint8Array, publicKey: Uint8Array): Uint8Array {
    if (privateKey.length !== 32 || publicKey.length !== 32) {
        throw new Error("X25519 keys must be 32 bytes");
    }
    return x25519.getSharedSecret(privateKey, publicKey);
}

// ============================================================================
// SIGNING (Ed25519)
// ============================================================================

export function generateSigningKeyPair() {
    const privateKey = randomBytes(32);
    const publicKey = ed25519.getPublicKey(privateKey);
    return { privateKey, publicKey };
}

export function sign(message: Uint8Array, privateKey: Uint8Array): Uint8Array {
    if (privateKey.length !== 32) throw new Error("Ed25519 private key must be 32 bytes");
    return ed25519.sign(message, privateKey);
}

export function verify(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): boolean {
    if (publicKey.length !== 32) throw new Error("Ed25519 public key must be 32 bytes");
    return ed25519.verify(signature, message, publicKey);
}

// ============================================================================
// KEY DERIVATION (HKDF-SHA256)
// ============================================================================

export function deriveKeyHKDF(
    inputKeyMaterial: Uint8Array, 
    salt: Uint8Array, 
    info: Uint8Array | string, 
    length: number
): Uint8Array {
    return hkdf(sha256, inputKeyMaterial, salt, info, length);
}

// ============================================================================
// SYMMETRIC ENCRYPTION (AES-256-GCM)
// Formato: [NONCE 12-bytes] || [CIPHERTEXT] || [MAC TAG 16-bytes]
// ============================================================================

const NONCE_LENGTH = 12;

export function encryptSymmetric(plaintext: Uint8Array, key: Uint8Array, associatedData?: Uint8Array): Uint8Array {
    if (key.length !== 32) throw new Error("AES-256-GCM requires a 32-byte key");
    
    const nonce = randomBytes(NONCE_LENGTH);
    const cipher = gcm(key, nonce);
    
    // En @noble/ciphers, cipher.encrypt retorna el ciphertext CON el tag de autenticación adjunto al final
    const ciphertextWithTag = cipher.encrypt(plaintext, associatedData);
    
    // Empaquetamos todo junto para el almacenamiento
    const result = new Uint8Array(nonce.length + ciphertextWithTag.length);
    result.set(nonce, 0);
    result.set(ciphertextWithTag, nonce.length);
    
    return result;
}

export function decryptSymmetric(packedCiphertext: Uint8Array, key: Uint8Array, associatedData?: Uint8Array): Uint8Array {
    if (key.length !== 32) throw new Error("AES-256-GCM requires a 32-byte key");
    if (packedCiphertext.length < NONCE_LENGTH + 16) throw new Error("Invalid ciphertext: too short");

    const nonce = packedCiphertext.slice(0, NONCE_LENGTH);
    const ciphertextWithTag = packedCiphertext.slice(NONCE_LENGTH);
    
    const cipher = gcm(key, nonce);
    
    // Si el texto ha sido alterado, esto lanzará un error (throw)
    return cipher.decrypt(ciphertextWithTag, associatedData);
}

// ============================================================================
// HELPERS
// ============================================================================

export function bytesToBase64(bytes: Uint8Array): string {
    const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
    return btoa(binString);
}

export function base64ToBytes(base64: string): Uint8Array {
    const binString = atob(base64);
    return new Uint8Array(Array.from(binString, (m) => m.charCodeAt(0)));
}
