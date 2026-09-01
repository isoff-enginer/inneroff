import { describe, it, expect } from 'vitest';
import { 
    ratchetInitAlice, 
    ratchetInitBob, 
    ratchetEncrypt, 
    ratchetDecrypt, 
    AADContext
} from './DoubleRatchet';
import { randomBytes, generateKeyAgreementKeyPair } from './CryptoCore';

function getMockContext(): AADContext {
    return {
        protocol_version: 1,
        conversation_id: 'conv-123',
        message_id: 'msg-456',
        sender_device_id: 'alice-phone',
        recipient_device_id: 'bob-web',
        session_id: 'sess-789'
    };
}

describe('Fase 4: Double Ratchet Puro', () => {

    it('should initialize and encrypt/decrypt a single message', () => {
        const rootKey = randomBytes(32);
        const bobDH = generateKeyAgreementKeyPair();

        const aliceState = ratchetInitAlice(rootKey, bobDH.publicKey);
        const bobState = ratchetInitBob(rootKey, bobDH);

        const ctx = getMockContext();
        const pt = new TextEncoder().encode("Hello Bob");

        // Alice envía
        const { header, ciphertext } = ratchetEncrypt(aliceState, pt, ctx);

        // Bob recibe
        const decrypted = ratchetDecrypt(bobState, header, ciphertext, ctx);

        expect(decrypted).toEqual(pt);
        expect(new TextDecoder().decode(decrypted)).toBe("Hello Bob");
    });

    it('should perform continuous symmetric ratchet (multiple messages without DH ratchet)', () => {
        const rootKey = randomBytes(32);
        const bobDH = generateKeyAgreementKeyPair();

        const aliceState = ratchetInitAlice(rootKey, bobDH.publicKey);
        const bobState = ratchetInitBob(rootKey, bobDH);
        const ctx = getMockContext();

        for (let i = 0; i < 10; i++) {
            const pt = new TextEncoder().encode(`Message ${i}`);
            ctx.message_id = `msg-${i}`;
            const { header, ciphertext } = ratchetEncrypt(aliceState, pt, ctx);
            const decrypted = ratchetDecrypt(bobState, header, ciphertext, ctx);
            expect(decrypted).toEqual(pt);
        }
    });

    it('should perform DH ratchet when Bob replies', () => {
        const rootKey = randomBytes(32);
        const bobDH = generateKeyAgreementKeyPair();

        const aliceState = ratchetInitAlice(rootKey, bobDH.publicKey);
        const bobState = ratchetInitBob(rootKey, bobDH);
        const ctx = getMockContext();

        // 1. Alice -> Bob
        const pt1 = new TextEncoder().encode("Alice says hi");
        const out1 = ratchetEncrypt(aliceState, pt1, ctx);
        expect(ratchetDecrypt(bobState, out1.header, out1.ciphertext, ctx)).toEqual(pt1);

        // 2. Bob -> Alice (triggers DH Ratchet at Alice)
        ctx.sender_device_id = 'bob-web';
        ctx.recipient_device_id = 'alice-phone';
        const pt2 = new TextEncoder().encode("Bob says hi back");
        // En Signal, Bob no puede enviar hasta que no haya recibido algo de Alice
        // porque él inicializó su CKr a null. Pero Bob acaba de recibir el mensaje 1,
        // lo que desencadenó el primer DH Ratchet en él, llenando su CKs.
        const out2 = ratchetEncrypt(bobState, pt2, ctx);
        
        expect(ratchetDecrypt(aliceState, out2.header, out2.ciphertext, ctx)).toEqual(pt2);
    });

    it('should handle out-of-order messages (Skipped Keys)', () => {
        const rootKey = randomBytes(32);
        const bobDH = generateKeyAgreementKeyPair();
        const aliceState = ratchetInitAlice(rootKey, bobDH.publicKey);
        const bobState = ratchetInitBob(rootKey, bobDH);
        const ctx = getMockContext();

        // Alice envía 3 mensajes
        ctx.message_id = '1';
        const msg1 = ratchetEncrypt(aliceState, new TextEncoder().encode("M1"), ctx);
        ctx.message_id = '2';
        const msg2 = ratchetEncrypt(aliceState, new TextEncoder().encode("M2"), ctx);
        ctx.message_id = '3';
        const msg3 = ratchetEncrypt(aliceState, new TextEncoder().encode("M3"), ctx);

        // Bob recibe el 3 PRIMERO
        ctx.message_id = '3';
        const dec3 = ratchetDecrypt(bobState, msg3.header, msg3.ciphertext, ctx);
        expect(new TextDecoder().decode(dec3)).toBe("M3");

        // Bob recibe el 1 DESPUÉS (recuperado de skipped keys)
        ctx.message_id = '1';
        const dec1 = ratchetDecrypt(bobState, msg1.header, msg1.ciphertext, ctx);
        expect(new TextDecoder().decode(dec1)).toBe("M1");

        // Bob recibe el 2
        ctx.message_id = '2';
        const dec2 = ratchetDecrypt(bobState, msg2.header, msg2.ciphertext, ctx);
        expect(new TextDecoder().decode(dec2)).toBe("M2");
    });

    it('should provide Forward Secrecy', () => {
        const rootKey = randomBytes(32);
        const bobDH = generateKeyAgreementKeyPair();
        const aliceState = ratchetInitAlice(rootKey, bobDH.publicKey);
        const bobState = ratchetInitBob(rootKey, bobDH);
        const ctx = getMockContext();

        // Enviamos M1 y avanzamos (Bob lo recibe y procesa)
        const msg1 = ratchetEncrypt(aliceState, new TextEncoder().encode("Top Secret"), ctx);
        ratchetDecrypt(bobState, msg1.header, msg1.ciphertext, ctx);

        // En este punto, Bob ha avanzado su CKr. La clave para M1 DEBE haber sido borrada.
        // Si intentamos descifrar de nuevo, debe fallar, demostrando Forward Secrecy
        // (es decir, el estado actual no puede volver hacia atrás).
        expect(() => ratchetDecrypt(bobState, msg1.header, msg1.ciphertext, ctx)).toThrow();
    });

    it('should reject replay attacks', () => {
        const rootKey = randomBytes(32);
        const bobDH = generateKeyAgreementKeyPair();
        const aliceState = ratchetInitAlice(rootKey, bobDH.publicKey);
        const bobState = ratchetInitBob(rootKey, bobDH);
        const ctx = getMockContext();

        // Alice manda M1 a Bob pero el atacante intercepta
        const msg1 = ratchetEncrypt(aliceState, new TextEncoder().encode("Transferir 100$"), ctx);
        
        // Bob recibe la primera vez
        ratchetDecrypt(bobState, msg1.header, msg1.ciphertext, ctx);

        // Atacante reinyecta
        expect(() => ratchetDecrypt(bobState, msg1.header, msg1.ciphertext, ctx)).toThrow(/REPLAY_DETECTED/);
    });

    it('should reject tampered AAD / Header / Ciphertext', () => {
        const rootKey = randomBytes(32);
        const bobDH = generateKeyAgreementKeyPair();
        const aliceState = ratchetInitAlice(rootKey, bobDH.publicKey);
        const bobState = ratchetInitBob(rootKey, bobDH);
        const ctx = getMockContext();

        const msg = ratchetEncrypt(aliceState, new TextEncoder().encode("Hello"), ctx);

        // Alteramos AAD
        const badCtx = { ...ctx, conversation_id: 'HACKED' };
        expect(() => ratchetDecrypt(bobState, msg.header, msg.ciphertext, badCtx)).toThrow(/BAD_MAC/);

        // Alteramos Ciphertext
        const badCt = new Uint8Array(msg.ciphertext);
        badCt[10] ^= 1;
        expect(() => ratchetDecrypt(bobState, msg.header, badCt, ctx)).toThrow(/BAD_MAC/);
    });
});
