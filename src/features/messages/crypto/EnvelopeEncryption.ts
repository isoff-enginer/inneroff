/**
 * EnvelopeEncryption.ts
 * 
 * Capa pura para encapsulación de claves efímeras (Envelope Encryption).
 * Responsable de cifrar una Message Key efímera hacia un dispositivo de destino específico.
 * 
 * PRÓXIMA COMPATIBILIDAD: Double Ratchet
 */

import { 
    generateKeyAgreementKeyPair, 
    deriveSharedSecret, 
    deriveKeyHKDF, 
    encryptSymmetric, 
    decryptSymmetric, 
    bytesToBase64, 
    base64ToBytes 
} from './CryptoCore';

export type EnvelopeVersion = 1;

export interface EnvelopeContext {
    protocol_version: number;
    message_id: string;
    conversation_id: string;
    sender_device_id: string;
    recipient_device_id: string;
    key_algorithm: string;
    envelope_version: EnvelopeVersion;
}

export interface EncryptedEnvelope {
    version: EnvelopeVersion;
    algorithm: string;
    senderDeviceId: string;
    recipientDeviceId: string;
    ephemeralPublicKeyB64: string; // La llave X25519 efímera del remitente
    ciphertextB64: string; // Incluye [Nonce (12)] + [EncryptedMK (32)] + [Tag (16)] = 60 bytes
}

const HKDF_SALT = new Uint8Array(32); // Sal constante de 32 ceros (la entropía viene de Ephemeral Key)
const HKDF_INFO = new TextEncoder().encode("E2EE_ENVELOPE_ENCRYPTION_V1");

/**
 * Serializa de forma determinista el contexto criptográfico para usarlo como
 * Additional Authenticated Data (AAD) en AES-GCM. Esto previene que un atacante
 * extraiga un envelope válido y lo adjunte a otro message_id o conversation_id.
 */
function buildAAD(context: EnvelopeContext): Uint8Array {
    const rawString = [
        context.protocol_version.toString(),
        context.message_id,
        context.conversation_id,
        context.sender_device_id,
        context.recipient_device_id,
        context.key_algorithm,
        context.envelope_version.toString()
    ].join('\0');
    return new TextEncoder().encode(rawString);
}

/**
 * Encapsula la Message Key de 32 bytes para un dispositivo destinatario específico,
 * utilizando ECDH efímero (X25519) y cifrado autenticado (AES-256-GCM).
 */
export function encryptMessageKeyForDevice(
    messageKey: Uint8Array,
    recipientDevicePublicKey: Uint8Array,
    context: EnvelopeContext
): EncryptedEnvelope {
    
    if (messageKey.length !== 32) {
        throw new Error("Message Key must be exactly 32 bytes");
    }

    if (recipientDevicePublicKey.length !== 32) {
        throw new Error("Recipient X25519 Public Key must be exactly 32 bytes");
    }

    // 1. Generar ephemeral X25519 keypair para este envelope específico
    const ephemeralKeyPair = generateKeyAgreementKeyPair();

    // 2. ECDH (Ephemeral Private + Recipient Public)
    const sharedSecret = deriveSharedSecret(ephemeralKeyPair.privateKey, recipientDevicePublicKey);

    // 3. KDF: Derivar Envelope Encryption Key (EEK)
    const eek = deriveKeyHKDF(sharedSecret, HKDF_SALT, HKDF_INFO, 32);

    // 4. Construir AAD
    const aad = buildAAD(context);

    // 5. Cifrar la Message Key con AES-256-GCM
    // encryptSymmetric ya genera un Nonce de 96-bits y empaca [Nonce || Ciphertext || Tag]
    const packedCiphertext = encryptSymmetric(messageKey, eek, aad);

    // 6. Limpieza agresiva de memoria para material sensible efímero
    ephemeralKeyPair.privateKey.fill(0);
    sharedSecret.fill(0);
    eek.fill(0);

    // 7. Retornar DTO puro
    return {
        version: context.envelope_version,
        algorithm: context.key_algorithm,
        senderDeviceId: context.sender_device_id,
        recipientDeviceId: context.recipient_device_id,
        ephemeralPublicKeyB64: bytesToBase64(ephemeralKeyPair.publicKey),
        ciphertextB64: bytesToBase64(packedCiphertext)
    };
}

/**
 * Desencapsula la Message Key contenida en un Envelope.
 * Requiere la llave privada del destinatario y el contexto exacto.
 */
export function decryptMessageKeyFromEnvelope(
    envelope: EncryptedEnvelope,
    recipientPrivateKey: Uint8Array,
    context: EnvelopeContext
): Uint8Array {
    
    if (recipientPrivateKey.length !== 32) {
        throw new Error("Recipient X25519 Private Key must be exactly 32 bytes");
    }

    // Validar coincidencias mínimas de estructura y versiones
    if (envelope.version !== context.envelope_version) throw new Error("Envelope version mismatch");
    if (envelope.algorithm !== context.key_algorithm) throw new Error("Envelope algorithm mismatch");
    if (envelope.recipientDeviceId !== context.recipient_device_id) throw new Error("Envelope recipient mismatch");

    const ephemeralPublicKey = base64ToBytes(envelope.ephemeralPublicKeyB64);
    if (ephemeralPublicKey.length !== 32) throw new Error("Invalid ephemeral public key length");

    const packedCiphertext = base64ToBytes(envelope.ciphertextB64);

    // 1. ECDH (Recipient Private + Ephemeral Public)
    const sharedSecret = deriveSharedSecret(recipientPrivateKey, ephemeralPublicKey);

    // 2. KDF: Derivar la misma Envelope Encryption Key (EEK)
    const eek = deriveKeyHKDF(sharedSecret, HKDF_SALT, HKDF_INFO, 32);

    // 3. Reconstruir AAD esperado
    const aad = buildAAD(context);

    try {
        // 4. Descifrar con AES-256-GCM (valida integridad, nonce y AAD internamente)
        const messageKey = decryptSymmetric(packedCiphertext, eek, aad);
        
        if (messageKey.length !== 32) {
            throw new Error("Decrypted Message Key length is invalid");
        }

        return messageKey;
    } finally {
        // Limpiar secretos intermedios de memoria independientemente del éxito o fracaso
        sharedSecret.fill(0);
        eek.fill(0);
    }
}
