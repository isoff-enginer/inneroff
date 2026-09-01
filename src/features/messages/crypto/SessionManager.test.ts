import { describe, it, expect } from 'vitest';
import { SessionManager } from './SessionManager';
import { generateKeyAgreementKeyPair, randomBytes } from './CryptoCore';

const MOCK_SHARED_SECRET = randomBytes(32);

describe('Fase 4: SessionManager Orchestration', () => {

    it('should securely handle Trust-On-First-Use (TOFU) and reject identity changes', async () => {
        const manager = new SessionManager(true); // Memoria
        
        const aliceId = 'device-alice';
        const bobId = 'device-bob';
        const sessionId = 'session-123';
        
        const bobInitialIdentityB64 = 'BOB_ORIGINAL_PUBKEY_BASE64';
        const bobHackedIdentityB64 = 'HACKER_PUBKEY_BASE64';
        
        const bobDH = generateKeyAgreementKeyPair();

        // 1. Primer contacto (TOFU)
        await manager.initializeSessionAsAlice(
            sessionId,
            aliceId,
            bobId,
            bobInitialIdentityB64,
            MOCK_SHARED_SECRET,
            bobDH.publicKey
        );

        // 2. Si se vuelve a inicializar con LA MISMA identidad, es idempotente
        await manager.initializeSessionAsAlice(
            sessionId,
            aliceId,
            bobId,
            bobInitialIdentityB64, // Misma
            MOCK_SHARED_SECRET,
            bobDH.publicKey
        );

        // 3. Un cambio sorpresivo de Identidad (MITM o Bob reseteó sin avisar)
        await expect(manager.initializeSessionAsAlice(
            sessionId,
            aliceId,
            bobId,
            bobHackedIdentityB64, // Diferente!
            MOCK_SHARED_SECRET,
            bobDH.publicKey
        )).rejects.toThrow(/SECURITY_WARNING: IDENTITY_CHANGED/);
    });

    it('should serialize concurrency using internal Mutex', async () => {
        const managerAlice = new SessionManager(true);
        const managerBob = new SessionManager(true);
        
        const sessionId = 'session-concurrency';
        const bobDH = generateKeyAgreementKeyPair();

        await managerAlice.initializeSessionAsAlice(sessionId, 'a', 'b', 'bobId', MOCK_SHARED_SECRET, bobDH.publicKey);
        await managerBob.initializeSessionAsBob(sessionId, 'b', 'a', 'aliceId', MOCK_SHARED_SECRET, bobDH);

        const ctx = {
            protocol_version: 1,
            conversation_id: 'conv',
            message_id: '1',
            sender_device_id: 'a',
            recipient_device_id: 'b',
            session_id: sessionId
        };

        // Alice envía 5 mensajes simulados concurrentemente (Promise.all)
        // El Mutex interno debe encolarlos y asegurar que cada uno reciba un message_number distinto.
        const promises = Array.from({ length: 5 }).map((_, i) => {
            return managerAlice.encryptMessage(sessionId, new TextEncoder().encode(`Msg ${i}`), ctx);
        });

        const results = await Promise.all(promises);

        // Los message_number deben ser únicos y ordenados 0, 1, 2, 3, 4
        const numbers = results.map(r => r.header.message_number).sort();
        expect(numbers).toEqual([0, 1, 2, 3, 4]);

        // Bob debe poder descifrar todos concurrentemente
        const decPromises = results.map(res => {
            return managerBob.decryptMessage(sessionId, res.header, res.ciphertext, ctx, 'aliceId');
        });

        const decrypted = await Promise.all(decPromises);
        expect(decrypted.length).toBe(5);
    });
});
