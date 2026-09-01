/**
 * LocalKeyProtection.ts
 * 
 * Gestiona la protección de las llaves privadas en reposo (Key Wrapping).
 * Utiliza un PIN local + KDF resistente (PBKDF2-HMAC-SHA256 como mecanismo
 * de compatibilidad) para derivar una Master Encryption Key (MEK) de 32 bytes,
 * la cual se usa con AES-256-GCM para cifrar el material privado antes de persistirlo.
 */

import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha256';
import { randomBytes, encryptSymmetric, decryptSymmetric, bytesToBase64, base64ToBytes } from './CryptoCore';

const PBKDF2_ITERATIONS = 600000; // Estándar moderno OWASP para PBKDF2-HMAC-SHA256
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

export interface ProtectedMaterial {
    crypto_version: number;
    salt_b64: string;
    ciphertext_b64: string;
}

/**
 * Deriva una llave AES-256 (MEK) a partir de un PIN y un Salt.
 */
function deriveMasterKey(pin: string, salt: Uint8Array): Uint8Array {
    const pinBytes = new TextEncoder().encode(pin);
    return pbkdf2(sha256, pinBytes, salt, { c: PBKDF2_ITERATIONS, dkLen: KEY_LENGTH });
}

/**
 * Protege material privado cifrándolo con una llave derivada del PIN.
 */
export function wrapPrivateKey(privateKey: Uint8Array, pin: string): ProtectedMaterial {
    const salt = randomBytes(SALT_LENGTH);
    const mek = deriveMasterKey(pin, salt);
    
    // Cifrar la privateKey usando AES-256-GCM (Ciphertext incluye Nonce y AuthTag)
    const packedCiphertext = encryptSymmetric(privateKey, mek);
    
    // Sobrescribir MEK en memoria (best effort en JS)
    mek.fill(0);
    
    return {
        crypto_version: 1,
        salt_b64: bytesToBase64(salt),
        ciphertext_b64: bytesToBase64(packedCiphertext)
    };
}

/**
 * Recupera material privado descifrándolo con el PIN.
 * Lanzará error si el PIN es incorrecto o si el material fue alterado (AEAD failure).
 */
export function unwrapPrivateKey(protectedMaterial: ProtectedMaterial, pin: string): Uint8Array {
    if (protectedMaterial.crypto_version !== 1) {
        throw new Error("Unsupported crypto_version");
    }
    
    const salt = base64ToBytes(protectedMaterial.salt_b64);
    const packedCiphertext = base64ToBytes(protectedMaterial.ciphertext_b64);
    
    const mek = deriveMasterKey(pin, salt);
    
    try {
        const privateKey = decryptSymmetric(packedCiphertext, mek);
        mek.fill(0); // Limpiar memoria
        return privateKey;
    } catch (e) {
        mek.fill(0); // Limpiar memoria antes de re-lanzar
        throw new Error("Invalid PIN or corrupted key material");
    }
}
