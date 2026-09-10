import { describe, it, expect, beforeEach } from 'vitest';
import { randomBytes, generateKeyAgreementKeyPair, generateIdentityKeyPair, bytesToBase64 } from './CryptoCore';
import { SessionManager } from './SessionManager';
import { MessageService, BootstrapMetadata, SerializedRatchetMessage } from '../services/MessageService';
import { saveProtectedDataMemory, getProtectedDataMemory, removeProtectedDataMemory, _resetMemoryFallback } from './KeyStore';
import { generateSignedPreKey, PreKeyBundle } from './PreKeyBundle';
import { bootstrapAsAlice, bootstrapAsBob } from './SessionBootstrap';
import { encryptSymmetric, decryptSymmetric } from './CryptoCore';

// Simular el backend para get_device_prekey_bundle y tests sin red
const MockDB = {
    bundles: new Map<string, PreKeyBundle>()
};

describe('SessionIntegration: E2EE Fase 5.2', () => {
    let aliceManager: SessionManager;
    let bobManager: SessionManager;
    let aliceMessageService: MessageService;
    let bobMessageService: MessageService;

    const aliceDeviceId = crypto.randomUUID();
    const bobDeviceId = crypto.randomUUID();
    const conversationId = crypto.randomUUID();

    let aliceIdentityPriv: any;
    let aliceIdentityPub: any;
    
    let bobIdentityPriv: any;
    let bobIdentityPub: any;
    let bobSPKPriv: Uint8Array;
    let bobSPKPub: any;
    let bobOPKPriv: Uint8Array;
    let bobOPKPub: Uint8Array;

    beforeEach(async () => {
        // Reset DB and Memory KeyStore before each test
        MockDB.bundles.clear();
        _resetMemoryFallback();
        
        // Inicializar Managers en modo memoria
        aliceManager = new SessionManager(true);
        bobManager = new SessionManager(true);
        aliceMessageService = new MessageService(aliceManager);
        bobMessageService = new MessageService(bobManager);

        // 1. Setup Alice
        aliceIdentityPriv = generateIdentityKeyPair();
        aliceIdentityPub = generateKeyAgreementKeyPair();
        
        // Namespace mapping: since KeyStore is global in memory, we append deviceId to keys for the test
        // Actually, MemoryKeyStore uses `${namespace}::${keyId}`. So we will just use prefix for sessionId in test
        // Let's manually populate the Memory KeyStore with Alice and Bob's material.
        await saveProtectedDataMemory('identity', `local_device_identity_public_${aliceDeviceId}`, {
            device_id: aliceDeviceId,
            public_identity_key_b64: bytesToBase64(aliceIdentityPriv.publicKey),
            public_agreement_key_b64: bytesToBase64(aliceIdentityPub.publicKey)
        });
        await saveProtectedDataMemory('identity', `local_device_identity_private_${aliceDeviceId}`, {
            private_identity_key_b64: bytesToBase64(aliceIdentityPriv.privateKey),
            private_agreement_key_b64: bytesToBase64(aliceIdentityPub.privateKey)
        });

        // 2. Setup Bob
        bobIdentityPriv = generateIdentityKeyPair();
        bobIdentityPub = generateKeyAgreementKeyPair();
        
        const bobSPK = generateKeyAgreementKeyPair();
        bobSPKPriv = bobSPK.privateKey;
        const signedSPK = generateSignedPreKey(1, bobSPK.publicKey, bobIdentityPriv.privateKey);

        const bobOPK = generateKeyAgreementKeyPair();
        bobOPKPriv = bobOPK.privateKey;
        bobOPKPub = bobOPK.publicKey;

        await saveProtectedDataMemory('identity', `local_device_identity_public_${bobDeviceId}`, {
            device_id: bobDeviceId,
            public_identity_key_b64: bytesToBase64(bobIdentityPriv.publicKey),
            public_agreement_key_b64: bytesToBase64(bobIdentityPub.publicKey)
        });
        await saveProtectedDataMemory('identity', `local_device_identity_private_${bobDeviceId}`, {
            private_identity_key_b64: bytesToBase64(bobIdentityPriv.privateKey),
            private_agreement_key_b64: bytesToBase64(bobIdentityPub.privateKey)
        });

        await saveProtectedDataMemory('signed_pre_key', `private_1_${bobDeviceId}`, bytesToBase64(bobSPKPriv));
        await saveProtectedDataMemory('signed_pre_key', `public_1_${bobDeviceId}`, { public_key_b64: bytesToBase64(bobSPK.publicKey) });
        await saveProtectedDataMemory('one_time_pre_keys', `private_50_${bobDeviceId}`, bytesToBase64(bobOPKPriv));

        // Create Bundle for Bob in MockDB
        const bundle: PreKeyBundle = {
            deviceId: bobDeviceId,
            identitySigningKeyB64: bytesToBase64(bobIdentityPriv.publicKey),
            identityAgreementKeyB64: bytesToBase64(bobIdentityPub.publicKey),
            signedPreKey: signedSPK,
            oneTimePreKey: {
                keyId: 50,
                publicKeyB64: bytesToBase64(bobOPKPub)
            },
            protocolVersion: 1
        };
        MockDB.bundles.set(bobDeviceId, bundle);
    });

    it('should derive the exact same sharedSecret directly via SessionBootstrap', async () => {
        const bundle = MockDB.bundles.get(bobDeviceId)!;
        
        const { sharedSecret: aliceSecret, aliceEphemeral } = bootstrapAsAlice(
            aliceIdentityPub.privateKey,
            bundle
        );

        const bobSecret = bootstrapAsBob(
            bobIdentityPub.privateKey,
            bobSPKPriv,
            bytesToBase64(aliceIdentityPub.publicKey),
            bytesToBase64(aliceEphemeral.publicKey),
            bobOPKPriv
        );

        expect(bytesToBase64(aliceSecret)).toBe(bytesToBase64(bobSecret));
    });

    it('should reject Bootstrap if Signed Pre-Key signature is invalid', () => {
        const bundle = MockDB.bundles.get(bobDeviceId)!;
        // Manipulate signature
        bundle.signedPreKey.signatureB64 = bytesToBase64(randomBytes(64));

        expect(() => {
            bootstrapAsAlice(aliceIdentityPub.privateKey, bundle);
        }).toThrow(/Invalid Signed Pre-Key signature/);
    });

    // En los tests de MessageService, usaremos un flujo ligeramente adaptado porque 
    // MessageService.ts en producción llama a Supabase. Como no queremos mockear toda
    // la red, haremos el flujo de cifrado manualmente imitando a MessageService pero 
    // validando la lógica real de Ratchet y Sessions.
    
    it('E2EE Flow: Alice encrypts initial message and Bob decrypts it', async () => {
        // --- ALICE SIDE ---
        const bundle = MockDB.bundles.get(bobDeviceId)!;
        const sessionIdAB = `session_${aliceDeviceId}_${bobDeviceId}`;
        
        const { sharedSecret, aliceEphemeral } = bootstrapAsAlice(
            aliceIdentityPub.privateKey,
            bundle
        );

        await aliceManager.initializeSessionAsAlice(
            sessionIdAB,
            aliceDeviceId,
            bobDeviceId,
            bundle.identitySigningKeyB64,
            sharedSecret,
            base64ToBytes(bundle.signedPreKey.publicKeyB64)
        );

        const contentKey = randomBytes(32);
        const messageId = crypto.randomUUID();
        const plaintextStr = "Prueba E2EE 5.2";
        const contentAad = new TextEncoder().encode(`V1|${conversationId}|${messageId}`);
        const ciphertext = encryptSymmetric(new TextEncoder().encode(plaintextStr), contentKey, contentAad);

        const context = {
            protocol_version: 1,
            conversation_id: conversationId,
            message_id: messageId,
            sender_device_id: aliceDeviceId,
            recipient_device_id: bobDeviceId,
            session_id: sessionIdAB
        };

        const { header, ciphertext: ratchetCiphertext } = await aliceManager.encryptMessage(
            sessionIdAB,
            contentKey,
            context
        );

        const bootstrapMeta: BootstrapMetadata = {
            senderIdentityPubKeyB64: bytesToBase64(aliceIdentityPub.publicKey),
            senderEphemeralPubKeyB64: bytesToBase64(aliceEphemeral.publicKey),
            targetSignedPreKeyId: 1,
            targetOneTimePreKeyId: 50
        };

        const serializedEnvelope: SerializedRatchetMessage = {
            header,
            ratchetCiphertextB64: bytesToBase64(ratchetCiphertext),
            bootstrap: bootstrapMeta
        };

        // --- NETWORK MOCK (Supabase) ---
        // Se transmite: serializedEnvelope (JSON) y ciphertext
        
        // --- BOB SIDE ---
        const sessionIdBA = `session_${bobDeviceId}_${aliceDeviceId}`; // Session local a Bob
        
        const bMeta = serializedEnvelope.bootstrap!;
        const opkPrivB64 = await getProtectedDataMemory('one_time_pre_keys', `private_50_${bobDeviceId}`);
        
        const bobShared = bootstrapAsBob(
            bobIdentityPub.privateKey,
            bobSPKPriv,
            bMeta.senderIdentityPubKeyB64,
            bMeta.senderEphemeralPubKeyB64,
            base64ToBytes(opkPrivB64)
        );

        const spkPubB64 = await getProtectedDataMemory('signed_pre_key', `public_1_${bobDeviceId}`);
        await bobManager.initializeSessionAsBob(
            sessionIdBA,
            bobDeviceId,
            aliceDeviceId,
            bytesToBase64(aliceIdentityPriv.publicKey),
            bobShared,
            { privateKey: bobSPKPriv, publicKey: base64ToBytes(spkPubB64.public_key_b64) }
        );

        // Borrar OPK post bootstrap (consumida)
        await removeProtectedDataMemory('one_time_pre_keys', `private_50_${bobDeviceId}`);
        const opkCheck = await getProtectedDataMemory('one_time_pre_keys', `private_50_${bobDeviceId}`);
        expect(opkCheck).toBeUndefined(); // Inutilizada

        const bobContentKey = await bobManager.decryptMessage(
            sessionIdBA,
            serializedEnvelope.header,
            base64ToBytes(serializedEnvelope.ratchetCiphertextB64),
            { ...context, session_id: sessionIdBA },
            bytesToBase64(aliceIdentityPriv.publicKey)
        );

        const bobPlaintextBytes = decryptSymmetric(ciphertext, bobContentKey, contentAad);
        const bobPlaintext = new TextDecoder().decode(bobPlaintextBytes);

        expect(bobPlaintext).toBe(plaintextStr);

        // --- Mismo Sesión Posterior (BOB -> ALICE) ---
        // Responder sin bootstrap
        const contentKey2 = randomBytes(32);
        const messageId2 = crypto.randomUUID();
        const contentAad2 = new TextEncoder().encode(`V1|${conversationId}|${messageId2}`);
        const ciphertext2 = encryptSymmetric(new TextEncoder().encode("Prueba E2EE 2"), contentKey2, contentAad2);

        const { header: header2, ciphertext: ratchetCiphertext2 } = await bobManager.encryptMessage(
            sessionIdBA,
            contentKey2,
            { ...context, session_id: sessionIdBA, message_id: messageId2, sender_device_id: bobDeviceId, recipient_device_id: aliceDeviceId }
        );

        // Alice receives without OPK consumption
        const aliceContentKey2 = await aliceManager.decryptMessage(
            sessionIdAB,
            header2,
            ratchetCiphertext2,
            { ...context, session_id: sessionIdAB, message_id: messageId2, sender_device_id: bobDeviceId, recipient_device_id: aliceDeviceId },
            bundle.identitySigningKeyB64
        );

        const alicePlaintextBytes2 = decryptSymmetric(ciphertext2, aliceContentKey2, contentAad2);
        expect(new TextDecoder().decode(alicePlaintextBytes2)).toBe("Prueba E2EE 2");
    });
});
