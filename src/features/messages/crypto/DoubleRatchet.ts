/**
 * DoubleRatchet.ts
 * 
 * Implementación Pura del Algoritmo Double Ratchet.
 * Maneja Forward Secrecy y Post-Compromise Security.
 * NO maneja base de datos ni estado de red.
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
import { DoubleRatchetState, DoubleRatchetHeader } from './SessionTypes';

const MAX_SKIP = 2000;
const HKDF_INFO_RK = new TextEncoder().encode("KDF_RK");
const HKDF_INFO_CK = new TextEncoder().encode("KDF_CK");
const ZERO_SALT = new Uint8Array(32);

function kdf_rk(rk: Uint8Array, dh_out: Uint8Array): { rk: Uint8Array, ck: Uint8Array } {
    const out = deriveKeyHKDF(dh_out, rk, HKDF_INFO_RK, 64);
    return {
        rk: out.slice(0, 32),
        ck: out.slice(32, 64)
    };
}

function kdf_ck(ck: Uint8Array): { ck: Uint8Array, mk: Uint8Array } {
    const out = deriveKeyHKDF(ck, ZERO_SALT, HKDF_INFO_CK, 64);
    return {
        ck: out.slice(0, 32),
        mk: out.slice(32, 64)
    };
}

function arrayEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

export interface AADContext {
    protocol_version: number;
    conversation_id: string;
    message_id: string;
    sender_device_id: string;
    recipient_device_id: string;
    session_id: string;
}

function buildAad(header: DoubleRatchetHeader, context: AADContext): Uint8Array {
    // Deterministic serialization (null separated)
    const rawString = [
        context.protocol_version.toString(),
        context.conversation_id,
        context.message_id,
        context.sender_device_id,
        context.recipient_device_id,
        context.session_id,
        header.ratchet_public_key,
        header.message_number.toString(),
        header.previous_chain_length.toString()
    ].join('\0');
    return new TextEncoder().encode(rawString);
}

export function ratchetInitAlice(SK: Uint8Array, bobDHr: Uint8Array): DoubleRatchetState {
    const DHs = generateKeyAgreementKeyPair();
    const dh_out = deriveSharedSecret(DHs.privateKey, bobDHr);
    const { rk, ck } = kdf_rk(SK, dh_out);
    
    dh_out.fill(0);
    
    return {
        RK: rk,
        DHs: DHs,
        DHr: bobDHr,
        CKs: ck,
        CKr: null,
        Ns: 0,
        Nr: 0,
        PN: 0,
        skippedMessageKeys: {}
    };
}

export function ratchetInitBob(SK: Uint8Array, bobDHs: { privateKey: Uint8Array, publicKey: Uint8Array }): DoubleRatchetState {
    return {
        RK: SK,
        DHs: bobDHs,
        DHr: null,
        CKs: null,
        CKr: null,
        Ns: 0,
        Nr: 0,
        PN: 0,
        skippedMessageKeys: {}
    };
}

export function ratchetEncrypt(
    state: DoubleRatchetState, 
    plaintext: Uint8Array, 
    context: AADContext
): { header: DoubleRatchetHeader, ciphertext: Uint8Array } {
    if (!state.CKs) {
        throw new Error("Cannot encrypt: sending chain is null");
    }

    const { ck, mk } = kdf_ck(state.CKs);
    state.CKs.fill(0);
    state.CKs = ck;

    const header: DoubleRatchetHeader = {
        protocol_version: 1,
        session_id: context.session_id,
        ratchet_public_key: bytesToBase64(state.DHs.publicKey),
        message_number: state.Ns,
        previous_chain_length: state.PN
    };

    const aad = buildAad(header, context);
    const ciphertext = encryptSymmetric(plaintext, mk, aad);

    mk.fill(0);
    state.Ns++;

    return { header, ciphertext };
}

function skipMessageKeys(state: DoubleRatchetState, until: number) {
    if (state.Nr + MAX_SKIP < until) {
        throw new Error("Skipped messages limit exceeded");
    }
    if (state.CKr !== null) {
        while (state.Nr < until) {
            const { ck, mk } = kdf_ck(state.CKr);
            state.CKr.fill(0);
            state.CKr = ck;
            // Guardamos la MessageKey en el registro de saltados
            const skipKeyId = `${bytesToBase64(state.DHr!)}_${state.Nr}`;
            state.skippedMessageKeys[skipKeyId] = { key: mk, timestamp: Date.now() };
            state.Nr++;
        }
    }
}

function dhRatchet(state: DoubleRatchetState, header: DoubleRatchetHeader) {
    state.PN = state.Ns;
    state.Ns = 0;
    state.Nr = 0;
    state.DHr = base64ToBytes(header.ratchet_public_key);

    // KDF_RK Step 1: Receiving Chain
    const dh_out_rx = deriveSharedSecret(state.DHs.privateKey, state.DHr);
    const kdf1 = kdf_rk(state.RK, dh_out_rx);
    state.RK.fill(0);
    state.RK = kdf1.rk;
    if (state.CKr) state.CKr.fill(0);
    state.CKr = kdf1.ck;
    dh_out_rx.fill(0);

    // Generate new DHs
    const oldDhsPriv = state.DHs.privateKey;
    state.DHs = generateKeyAgreementKeyPair();
    oldDhsPriv.fill(0);

    // KDF_RK Step 2: Sending Chain
    const dh_out_tx = deriveSharedSecret(state.DHs.privateKey, state.DHr);
    const kdf2 = kdf_rk(state.RK, dh_out_tx);
    state.RK.fill(0);
    state.RK = kdf2.rk;
    if (state.CKs) state.CKs.fill(0);
    state.CKs = kdf2.ck;
    dh_out_tx.fill(0);
}

export function ratchetDecrypt(
    state: DoubleRatchetState,
    header: DoubleRatchetHeader,
    ciphertext: Uint8Array,
    context: AADContext
): Uint8Array {
    // Intentar leer de skipped keys
    const skipKeyId = `${header.ratchet_public_key}_${header.message_number}`;
    if (state.skippedMessageKeys[skipKeyId]) {
        const mk = state.skippedMessageKeys[skipKeyId].key;
        delete state.skippedMessageKeys[skipKeyId]; // Inmediatamente borrado para evitar REPLAY

        const aad = buildAad(header, context);
        try {
            const plaintext = decryptSymmetric(ciphertext, mk, aad);
            mk.fill(0);
            return plaintext;
        } catch (e) {
            mk.fill(0);
            throw new Error("REPLAY_DETECTED or BAD_MAC (Tampering)");
        }
    }

    // ¿Es un nuevo paso del DH Ratchet?
    const remoteDH = base64ToBytes(header.ratchet_public_key);
    if (!state.DHr || !arrayEqual(state.DHr, remoteDH)) {
        // Adelantar los mensajes perdidos de la cadena anterior (si existía CKr)
        skipMessageKeys(state, header.previous_chain_length);
        
        // Ejecutar el DH Ratchet (rotación de claves)
        dhRatchet(state, header);
    }

    // Adelantar mensajes perdidos de la cadena actual
    skipMessageKeys(state, header.message_number);

    // Recuperar la MessageKey objetivo
    if (!state.CKr) throw new Error("Receiving chain is null");
    
    const { ck, mk } = kdf_ck(state.CKr);
    state.CKr.fill(0);
    state.CKr = ck;
    state.Nr++;

    const aad = buildAad(header, context);
    try {
        const plaintext = decryptSymmetric(ciphertext, mk, aad);
        mk.fill(0);
        return plaintext;
    } catch (e) {
        mk.fill(0);
        throw new Error("REPLAY_DETECTED or BAD_MAC (Tampering)");
    }
}

/**
 * Elimina claves saltadas (fuera de orden) que han excedido su tiempo de vida máximo (TTL).
 * Esto mitiga la fuga pasiva de Forward Secrecy en caso de mensajes perdidos permanentemente.
 * @param maxAgeMs TTL en milisegundos (Por defecto 30 días)
 */
export function purgeOldSkippedMessageKeys(state: DoubleRatchetState, maxAgeMs = 30 * 24 * 60 * 60 * 1000) {
    const now = Date.now();
    for (const [keyId, record] of Object.entries(state.skippedMessageKeys)) {
        if (now - record.timestamp > maxAgeMs) {
            record.key.fill(0); // Zeroize
            delete state.skippedMessageKeys[keyId];
        }
    }
}
