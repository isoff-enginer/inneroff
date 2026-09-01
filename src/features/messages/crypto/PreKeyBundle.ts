/**
 * PreKeyBundle.ts
 * 
 * Implementa las estructuras y funciones para crear Signed Pre-Keys
 * y One-Time Pre-Keys, necesarias para un protocolo de Bootstrap asíncrono (X3DH).
 */

import { generateKeyAgreementKeyPair, sign, verify, bytesToBase64, base64ToBytes } from './CryptoCore';

export interface SignedPreKey {
    keyId: number;
    publicKeyB64: string;
    signatureB64: string;
}

export interface OneTimePreKey {
    keyId: number;
    publicKeyB64: string;
}

export interface PreKeyBundle {
    identitySigningKeyB64: string; // Ed25519 (IKb_sig)
    identityAgreementKeyB64: string; // X25519 (IKb para X3DH)
    signedPreKey: SignedPreKey; // X25519 (SPKb)
    oneTimePreKey?: OneTimePreKey; // X25519 (OPKb)
}

/**
 * Genera un Signed Pre-Key y lo firma con la llave de identidad (Ed25519).
 */
export function generateSignedPreKey(identityPrivateKeyEd25519: Uint8Array, keyId: number) {
    const pair = generateKeyAgreementKeyPair();
    // La firma se aplica sobre los bytes de la clave pública X25519
    const signature = sign(pair.publicKey, identityPrivateKeyEd25519);
    
    const signedPreKey: SignedPreKey = {
        keyId,
        publicKeyB64: bytesToBase64(pair.publicKey),
        signatureB64: bytesToBase64(signature)
    };
    
    return {
        privateKey: pair.privateKey, // Deberá protegerse y guardarse en el KeyStore local
        signedPreKey
    };
}

/**
 * Valida criptográficamente un Signed Pre-Key utilizando la Identity Public Key remota.
 */
export function verifySignedPreKey(signedPreKey: SignedPreKey, identityPublicKeyEd25519: Uint8Array): boolean {
    const pubKey = base64ToBytes(signedPreKey.publicKeyB64);
    const sig = base64ToBytes(signedPreKey.signatureB64);
    
    try {
        return verify(pubKey, sig, identityPublicKeyEd25519);
    } catch (e) {
        return false;
    }
}

/**
 * Genera un lote de One-Time Pre-Keys.
 */
export function generateOneTimePreKeys(startId: number, count: number) {
    const privateKeys: Record<number, Uint8Array> = {};
    const publicKeys: OneTimePreKey[] = [];
    
    for (let i = 0; i < count; i++) {
        const id = startId + i;
        const pair = generateKeyAgreementKeyPair();
        privateKeys[id] = pair.privateKey;
        publicKeys.push({
            keyId: id,
            publicKeyB64: bytesToBase64(pair.publicKey)
        });
    }
    
    return { privateKeys, publicKeys };
}
