/**
 * SessionManager.ts
 * 
 * Orquestador principal de las sesiones E2EE (Double Ratchet).
 * Gestiona el TOFU, serializa accesos asíncronos (evita carrera de condiciones),
 * y coordina la persistencia en el KeyStore.
 */

import { SessionState, DoubleRatchetHeader } from './SessionTypes';
import { 
    ratchetInitAlice, 
    ratchetInitBob, 
    ratchetEncrypt, 
    ratchetDecrypt, 
    AADContext 
} from './DoubleRatchet';
import { saveProtectedData, getProtectedData, saveProtectedDataMemory, getProtectedDataMemory } from './KeyStore';
import { withSessionLock } from './SessionLock';

export class SessionManager {
    private useMemory: boolean;

    constructor(useMemory = false) {
        this.useMemory = useMemory;
    }

    private async save(sessionId: string, state: SessionState) {
        if (this.useMemory) {
            await saveProtectedDataMemory('session', sessionId, state);
        } else {
            await saveProtectedData('session', sessionId, state);
        }
    }

    private async load(sessionId: string): Promise<SessionState | null> {
        if (this.useMemory) {
            return await getProtectedDataMemory('session', sessionId);
        } else {
            return await getProtectedData('session', sessionId);
        }
    }

    private validateTofu(existingState: SessionState, currentRemoteIdentityKeyB64: string) {
        if (existingState.remoteIdentityKeyB64 !== currentRemoteIdentityKeyB64) {
            throw new Error("SECURITY_WARNING: IDENTITY_CHANGED");
        }
    }

    /**
     * Alice (Iniciadora) establece la sesión.
     */
    async initializeSessionAsAlice(
        sessionId: string,
        localDeviceId: string,
        remoteDeviceId: string,
        remoteIdentityKeyB64: string,
        sharedSecret: Uint8Array, // Proviene ahora de SessionBootstrap (X3DH)
        bobDHr: Uint8Array
    ): Promise<void> {
        return withSessionLock(sessionId, async () => {
            const existing = await this.load(sessionId);
            if (existing) {
                // TOFU Check
                this.validateTofu(existing, remoteIdentityKeyB64);
                return; // Ya inicializada
            }

            const ratchetState = ratchetInitAlice(sharedSecret, bobDHr);
            const state: SessionState = {
                sessionId,
                localDeviceId,
                remoteDeviceId,
                remoteIdentityKeyB64,
                ratchetState,
                createdAt: Date.now(),
                lastActivity: Date.now()
            };

            await this.save(sessionId, state);
        });
    }

    /**
     * Bob (Receptor) establece la sesión.
     */
    async initializeSessionAsBob(
        sessionId: string,
        localDeviceId: string,
        remoteDeviceId: string,
        remoteIdentityKeyB64: string,
        sharedSecret: Uint8Array,
        bobDHs: { privateKey: Uint8Array, publicKey: Uint8Array }
    ): Promise<void> {
        return withSessionLock(sessionId, async () => {
            const existing = await this.load(sessionId);
            if (existing) {
                this.validateTofu(existing, remoteIdentityKeyB64);
                return; 
            }

            const ratchetState = ratchetInitBob(sharedSecret, bobDHs);
            const state: SessionState = {
                sessionId,
                localDeviceId,
                remoteDeviceId,
                remoteIdentityKeyB64,
                ratchetState,
                createdAt: Date.now(),
                lastActivity: Date.now()
            };

            await this.save(sessionId, state);
        });
    }

    /**
     * Cifra un mensaje asegurando Serialización y Guardado Transaccional.
     */
    async encryptMessage(
        sessionId: string,
        plaintext: Uint8Array,
        context: AADContext
    ): Promise<{ header: DoubleRatchetHeader, ciphertext: Uint8Array }> {
        return withSessionLock(sessionId, async () => {
            const state = await this.load(sessionId);
            if (!state) throw new Error("Session not initialized");

            const result = ratchetEncrypt(state.ratchetState, plaintext, context);
            
            state.lastActivity = Date.now();
            await this.save(sessionId, state);

            return result;
        });
    }

    /**
     * Descifra un mensaje y persiste el avance seguro de la cadena.
     */
    async decryptMessage(
        sessionId: string,
        header: DoubleRatchetHeader,
        ciphertext: Uint8Array,
        context: AADContext,
        remoteIdentityKeyB64: string // Para validación continua TOFU
    ): Promise<Uint8Array> {
        return withSessionLock(sessionId, async () => {
            const state = await this.load(sessionId);
            if (!state) throw new Error("Session not initialized");

            this.validateTofu(state, remoteIdentityKeyB64);

            const plaintext = ratchetDecrypt(state.ratchetState, header, ciphertext, context);
            
            state.lastActivity = Date.now();
            await this.save(sessionId, state);

            return plaintext;
        });
    }
}
