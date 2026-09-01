/**
 * SessionBootstrap.ts
 * 
 * Implementa el establecimiento de sesión asíncrono (Bootstrap) inspirado en X3DH.
 * 
 * Permite a Alice (iniciadora) derivar un secreto compartido fuerte combinando
 * su Identity Key y Ephemeral Key con el Pre-Key Bundle público de Bob (Identity Key,
 * Signed Pre-Key, One-Time Pre-Key). Bob hará el cálculo inverso al recibir 
 * el primer mensaje.
 */

import { generateKeyAgreementKeyPair, deriveSharedSecret, deriveKeyHKDF, base64ToBytes, bytesToBase64 } from './CryptoCore';
import { PreKeyBundle, verifySignedPreKey } from './PreKeyBundle';

const X3DH_INFO = new TextEncoder().encode("X3DH_V1");
const ZERO_SALT = new Uint8Array(32);

/**
 * Alice inicializa la sesión asíncrona hacia Bob consumiendo su Pre-Key Bundle.
 */
export function bootstrapAsAlice(
    aliceIdentityAgreementPrivateKey: Uint8Array, // (IKa) Clave X25519 asociada a la identidad local
    bobBundle: PreKeyBundle
) {
    // 1. Verificar criptográficamente la firma del Signed Pre-Key de Bob
    const bobIdentitySigningPubKey = base64ToBytes(bobBundle.identitySigningKeyB64);
    if (!verifySignedPreKey(bobBundle.signedPreKey, bobIdentitySigningPubKey)) {
        throw new Error("SECURITY_WARNING: Invalid Signed Pre-Key signature from remote bundle");
    }

    // 2. Extraer claves públicas de Bob
    const IKb = base64ToBytes(bobBundle.identityAgreementKeyB64);
    const SPKb = base64ToBytes(bobBundle.signedPreKey.publicKeyB64);
    
    // 3. Generar Ephemeral Key de Alice (EKa)
    const EKa = generateKeyAgreementKeyPair();

    // 4. Calcular los 3 o 4 componentes del DH
    // DH1 = DH(IKa, SPKb)
    const dh1 = deriveSharedSecret(aliceIdentityAgreementPrivateKey, SPKb);
    
    // DH2 = DH(EKa, IKb)
    const dh2 = deriveSharedSecret(EKa.privateKey, IKb);
    
    // DH3 = DH(EKa, SPKb)
    const dh3 = deriveSharedSecret(EKa.privateKey, SPKb);

    let dh4: Uint8Array | null = null;
    let totalLength = dh1.length + dh2.length + dh3.length;

    if (bobBundle.oneTimePreKey) {
        // DH4 = DH(EKa, OPKb)
        const OPKb = base64ToBytes(bobBundle.oneTimePreKey.publicKeyB64);
        dh4 = deriveSharedSecret(EKa.privateKey, OPKb);
        totalLength += dh4.length;
    }

    // 5. Concatenar todos los secretos (F_FF en X3DH, que usualmente son 32 bytes de p)
    // Para simplificar, concatenamos el output directo de X25519 (32 bytes cada uno)
    const secretMaterial = new Uint8Array(totalLength);
    secretMaterial.set(dh1, 0);
    secretMaterial.set(dh2, dh1.length);
    secretMaterial.set(dh3, dh1.length + dh2.length);
    if (dh4) {
        secretMaterial.set(dh4, dh1.length + dh2.length + dh3.length);
    }

    // 6. Derivar Root Key (SK inicial) mediante HKDF
    const sharedSecret = deriveKeyHKDF(secretMaterial, ZERO_SALT, X3DH_INFO, 32);

    // Limpieza estricta de secretos intermedios temporales
    dh1.fill(0);
    dh2.fill(0);
    dh3.fill(0);
    if (dh4) dh4.fill(0);
    secretMaterial.fill(0);

    return {
        sharedSecret, // RootKey inicial para el Double Ratchet
        aliceEphemeral: EKa // Se enviará junto al primer mensaje para que Bob pueda hacer el X3DH inverso
    };
}

/**
 * Bob recibe el primer mensaje de Alice que incluye su Ephemeral Public Key (EKa)
 * y la información de qué Pre-Keys utilizó, y regenera el mismo secreto compartido.
 */
export function bootstrapAsBob(
    bobIdentityAgreementPrivateKey: Uint8Array, // (IKb)
    bobSignedPreKeyPrivateKey: Uint8Array, // (SPKb)
    aliceIdentityAgreementPublicKeyB64: string, // (IKa)
    aliceEphemeralPublicKeyB64: string, // (EKa)
    bobOneTimePreKeyPrivateKey?: Uint8Array // (OPKb, si Alice lo usó)
) {
    const IKa = base64ToBytes(aliceIdentityAgreementPublicKeyB64);
    const EKa = base64ToBytes(aliceEphemeralPublicKeyB64);

    // DH1 = DH(SPKb, IKa)  [Es conmutativo con DH(IKa, SPKb)]
    const dh1 = deriveSharedSecret(bobSignedPreKeyPrivateKey, IKa);
    
    // DH2 = DH(IKb, EKa)
    const dh2 = deriveSharedSecret(bobIdentityAgreementPrivateKey, EKa);
    
    // DH3 = DH(SPKb, EKa)
    const dh3 = deriveSharedSecret(bobSignedPreKeyPrivateKey, EKa);

    let dh4: Uint8Array | null = null;
    let totalLength = dh1.length + dh2.length + dh3.length;

    if (bobOneTimePreKeyPrivateKey) {
        // DH4 = DH(OPKb, EKa)
        dh4 = deriveSharedSecret(bobOneTimePreKeyPrivateKey, EKa);
        totalLength += dh4.length;
    }

    const secretMaterial = new Uint8Array(totalLength);
    secretMaterial.set(dh1, 0);
    secretMaterial.set(dh2, dh1.length);
    secretMaterial.set(dh3, dh1.length + dh2.length);
    if (dh4) {
        secretMaterial.set(dh4, dh1.length + dh2.length + dh3.length);
    }

    const sharedSecret = deriveKeyHKDF(secretMaterial, ZERO_SALT, X3DH_INFO, 32);

    dh1.fill(0);
    dh2.fill(0);
    dh3.fill(0);
    if (dh4) dh4.fill(0);
    secretMaterial.fill(0);

    return sharedSecret;
}
