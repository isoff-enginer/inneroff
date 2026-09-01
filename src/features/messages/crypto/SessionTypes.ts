/**
 * SessionTypes.ts
 * 
 * Estructuras de datos para la gestión del Double Ratchet y 
 * el Session Manager. Todo material criptográfico en estas interfaces
 * vive puramente en memoria y DEBE ser protegido por KeyStore antes de persistirse.
 */

export interface DoubleRatchetState {
    RK: Uint8Array; // 32 bytes: Root Key
    CKs: Uint8Array | null; // 32 bytes: Sending Chain Key
    CKr: Uint8Array | null; // 32 bytes: Receiving Chain Key
    DHs: { privateKey: Uint8Array; publicKey: Uint8Array }; // DH Ratchet Key Pair (Local)
    DHr: Uint8Array | null; // 32 bytes: Remote's current DH Public Key
    Ns: number; // Message number (send)
    Nr: number; // Message number (receive)
    PN: number; // Number of messages in previous sending chain
    skippedMessageKeys: Record<string, { key: Uint8Array, timestamp: number }>; // Clave: "b64(DHr)_Nr", Valor: MessageKey + timestamp
}

export interface DoubleRatchetHeader {
    protocol_version: number;
    session_id: string; // ID unívoco de la sesión entre este par de dispositivos
    ratchet_public_key: string; // Base64 de DHs.publicKey
    message_number: number;
    previous_chain_length: number;
}

export interface SessionState {
    sessionId: string;
    localDeviceId: string;
    remoteDeviceId: string;
    remoteIdentityKeyB64: string; // Para detectar Identity Change (TOFU)
    ratchetState: DoubleRatchetState;
    createdAt: number;
    lastActivity: number;
}
