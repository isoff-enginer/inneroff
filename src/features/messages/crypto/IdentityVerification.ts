/**
 * IdentityVerification.ts
 * 
 * Implementa mecanismos OOB (Out-Of-Band) para verificar identidades.
 * Combina criptográficamente (SHA-256) las claves públicas de identidad de ambos 
 * dispositivos de manera ordenada lexicográficamente para producir un 
 * Fingerprint (Safety Number) determinista e idéntico en ambos extremos.
 */

import { sha256 } from '@noble/hashes/sha256';
import { bytesToBase64 } from './CryptoCore';

/**
 * Genera un Safety Number (Fingerprint) único para el par de dispositivos.
 * Ordena las claves lexicográficamente antes de hacer el hash para garantizar
 * que Alice calculando para Bob obtenga el mismo resultado que Bob para Alice.
 */
export function generateSafetyNumber(localIdentityKeyB64: string, remoteIdentityKeyB64: string): string {
    const sorted = [localIdentityKeyB64, remoteIdentityKeyB64].sort();
    
    // Concatenamos las claves Base64 con un separador seguro
    const payload = new TextEncoder().encode(sorted[0] + '|' + sorted[1]);
    
    // Hasheamos el payload
    const digest = sha256(payload);
    
    // Retornamos un Base64 (que la UI podría convertir a QR code o chunks numéricos)
    return bytesToBase64(digest);
}

/**
 * Genera un código numérico legible por humanos (ideal para comparar por voz).
 * Basado en la misma entropía del Safety Number.
 */
export function generateNumericFingerprint(localIdentityKeyB64: string, remoteIdentityKeyB64: string): string {
    const sorted = [localIdentityKeyB64, remoteIdentityKeyB64].sort();
    const payload = new TextEncoder().encode(sorted[0] + '|' + sorted[1]);
    const digest = sha256(payload);
    
    // Convertir parte del hash a un número grande y luego a string numérico
    const view = new DataView(digest.buffer, digest.byteOffset, digest.byteLength);
    // Tomamos 64 bits (8 bytes) = max ~1.8 * 10^19
    const high = view.getUint32(0, false);
    const low = view.getUint32(4, false);
    
    // Simulamos un int64
    const num = BigInt(high) << BigInt(32) | BigInt(low);
    const numStr = num.toString().padStart(20, '0');
    
    // Formatear en bloques de 5 para fácil lectura (e.g. 12345-67890-12345-67890)
    return numStr.match(/.{1,5}/g)!.join('-');
}
