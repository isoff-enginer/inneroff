import { supabase } from '@/integrations/supabase/client';
import { SessionManager } from '../crypto/SessionManager';
import { randomBytes, encryptSymmetric, decryptSymmetric, bytesToBase64, base64ToBytes } from '../crypto/CryptoCore';
import { DoubleRatchetHeader } from '../crypto/SessionTypes';
import { AADContext } from '../crypto/DoubleRatchet';
import { getProtectedData, removeProtectedData } from '../crypto/KeyStore';
import { bootstrapAsAlice, bootstrapAsBob } from '../crypto/SessionBootstrap';
import { PreKeyBundle } from '../crypto/PreKeyBundle';
import { encryptMessageKeyForDevice, EnvelopeContext } from '../crypto/EnvelopeEncryption';
import { UnlockedDeviceIdentity } from '../crypto/DeviceIdentity';

export interface BootstrapMetadata {
    senderIdentityPubKeyB64: string;
    senderEphemeralPubKeyB64: string;
    targetSignedPreKeyId: number;
    targetOneTimePreKeyId: number | null;
}

export interface SerializedRatchetMessage {
    header: DoubleRatchetHeader;
    ratchetCiphertextB64: string;
    bootstrap?: BootstrapMetadata;
}

export class MessageService {
    private sessionManager: SessionManager;

    constructor(sessionManager: SessionManager) {
        this.sessionManager = sessionManager;
    }

    /**
     * Envía un mensaje encriptado E2EE.
     */
    async encryptAndSend(
        conversationId: string,
        plaintext: string,
        localDeviceId: string,
        unlockedIdentity: UnlockedDeviceIdentity
    ): Promise<void> {
        // 1. Validar identidad local y obtener sender ID
        const { data: authData } = await supabase.auth.getUser();
        if (!authData.user) throw new Error("E2EE_SESSION_NOT_FOUND: User not authenticated");
        const senderId = authData.user.id;

        // 2. Obtener miembros de la conversación
        const { data: members, error: membersErr } = await supabase
            .from('conversation_members')
            .select('user_id')
            .eq('conversation_id', conversationId);
            
        if (membersErr || !members || members.length === 0) {
            throw new Error("E2EE_SESSION_NOT_FOUND: Cannot fetch conversation members");
        }

        const userIds = members.map(m => m.user_id);

        // 3. Obtener dispositivos autorizados
        const { data: devices, error: devErr } = await supabase
            .from('authorized_devices')
            .select('id, user_id, device_public_key, status')
            .in('user_id', userIds)
            .eq('status', 'active');
            
        if (devErr || !devices) {
            throw new Error("E2EE_SESSION_NOT_FOUND: Cannot fetch authorized devices");
        }

        // 4. Preparar ContentKey y cifrar el cuerpo del mensaje
        const contentKey = randomBytes(32);
        const messageId = crypto.randomUUID();
        const rawPlaintext = new TextEncoder().encode(plaintext);
        
        const contentAad = new TextEncoder().encode(`V1|${conversationId}|${messageId}`);
        const contentCiphertext = encryptSymmetric(rawPlaintext, contentKey, contentAad);

        const envelopesToInsert: any[] = [];

        for (const device of devices) {
            if (device.id === localDeviceId) {
                // Generar SELF-ENVELOPE

                const envContext: EnvelopeContext = {
                    protocol_version: 1,
                    message_id: messageId,
                    conversation_id: conversationId,
                    sender_device_id: localDeviceId,
                    recipient_device_id: localDeviceId,
                    key_algorithm: 'SELF-X25519-ENVELOPE-v1',
                    envelope_version: 1
                };

                const selfEnvelope = encryptMessageKeyForDevice(
                    contentKey,
                    unlockedIdentity.publicAgreementKey,
                    envContext
                );

                envelopesToInsert.push({
                    message_id: messageId,
                    device_id: localDeviceId,
                    encrypted_message_key: JSON.stringify(selfEnvelope),
                    key_algorithm: 'SELF-X25519-ENVELOPE-v1'
                });
                continue;
            }

            const sessionId = `session_${localDeviceId}_${device.id}`;
            let hasSession = !!(await getProtectedData('session', sessionId));
            
            let bootstrapMeta: BootstrapMetadata | undefined = undefined;

            if (!hasSession) {
                // Fetch Remote Pre-Key Bundle via RPC
                const { data: bundleData, error: bundleErr } = await supabase.rpc('get_device_prekey_bundle', {
                    p_device_id: device.id
                });
                
                if (bundleErr || !bundleData) {
                    throw new Error(`Failed to fetch Pre-Key bundle for device ${device.id}`);
                }

                // Type casting the response (the RPC returns snake_case for device_id, but camelCase for keys)
                const bundle = bundleData as any;
                const preKeyBundle: PreKeyBundle = {
                    identitySigningKeyB64: bundle.identitySigningKeyB64,
                    identityAgreementKeyB64: bundle.identityAgreementKeyB64,
                    signedPreKey: {
                        keyId: bundle.signedPreKey.keyId,
                        publicKeyB64: bundle.signedPreKey.publicKeyB64,
                        signatureB64: bundle.signedPreKey.signatureB64
                    },
                    oneTimePreKey: bundle.oneTimePreKey ? {
                        keyId: bundle.oneTimePreKey.keyId,
                        publicKeyB64: bundle.oneTimePreKey.publicKeyB64
                    } : undefined
                };

                // Execute Bootstrap
                const { sharedSecret, aliceEphemeral } = bootstrapAsAlice(
                    unlockedIdentity.privateAgreementKey,
                    preKeyBundle
                );

                await this.sessionManager.initializeSessionAsAlice(
                    sessionId,
                    localDeviceId,
                    device.id,
                    preKeyBundle.identitySigningKeyB64,
                    sharedSecret,
                    base64ToBytes(preKeyBundle.signedPreKey.publicKeyB64)
                );

                bootstrapMeta = {
                    senderIdentityPubKeyB64: bytesToBase64(unlockedIdentity.publicAgreementKey),
                    senderEphemeralPubKeyB64: bytesToBase64(aliceEphemeral.publicKey),
                    targetSignedPreKeyId: preKeyBundle.signedPreKey.keyId,
                    targetOneTimePreKeyId: preKeyBundle.oneTimePreKey ? preKeyBundle.oneTimePreKey.keyId : null
                };
            }

            const context: AADContext = {
                protocol_version: 1,
                conversation_id: conversationId,
                message_id: messageId,
                sender_device_id: localDeviceId,
                recipient_device_id: device.id,
                session_id: sessionId
            };

            const { header, ciphertext: ratchetCiphertext } = await this.sessionManager.encryptMessage(
                sessionId,
                contentKey,
                context
            );

            const serialized: SerializedRatchetMessage = {
                header,
                ratchetCiphertextB64: bytesToBase64(ratchetCiphertext),
                bootstrap: bootstrapMeta
            };

            envelopesToInsert.push({
                message_id: messageId,
                device_id: device.id,
                encrypted_message_key: JSON.stringify(serialized),
                key_algorithm: 'DOUBLE_RATCHET_AES256GCM'
            });
        }

        contentKey.fill(0);

        type PendingMessageInsert = { id: string, conversation_id: string, sender_id: string, sender_device_id: string, ciphertext: string, message_type: string };
        type PendingEnvelopeInsert = { message_id: string, device_id: string, encrypted_message_key: string, key_algorithm: string };
        
        // @ts-expect-error: Tablas pendientes de la Fase 5.2 (schema auditado)
        const { error: msgErr } = await supabase.from('messages').insert({
            id: messageId,
            conversation_id: conversationId,
            sender_id: senderId,
            sender_device_id: localDeviceId,
            ciphertext: bytesToBase64(contentCiphertext),
            message_type: 'text'
        } as PendingMessageInsert);

        if (msgErr) {
            console.error("Failed to insert message ciphertext:", msgErr);
            throw new Error(`Failed to insert message ciphertext: ${msgErr.message || JSON.stringify(msgErr)}`);
        }

        if (envelopesToInsert.length > 0) {
            // @ts-expect-error
            const { error: envErr } = await supabase.from('message_key_envelopes').insert(envelopesToInsert as PendingEnvelopeInsert[]);
            if (envErr) {
                console.error("Failed to insert envelopes", envErr);
            }
        }
    }

    /**
     * Bob recibe el mensaje, realiza el X3DH inverso si es necesario,
     * y descifra el ciphertext.
     */
    async receiveAndDecrypt(
        conversationId: string,
        messageId: string,
        senderDeviceId: string,
        localDeviceId: string,
        senderIdentitySigningKeyB64: string, // Se conoce del sender desde antes (e.g., al cargar miembros)
        serializedEnvelope: string,
        baseCiphertextB64: string,
        unlockedIdentity: UnlockedDeviceIdentity
    ): Promise<string> {
        const envelope: SerializedRatchetMessage = JSON.parse(serializedEnvelope);
        const sessionId = `session_${localDeviceId}_${senderDeviceId}`;
        
        let hasSession = !!(await getProtectedData('session', sessionId));

        if (!hasSession) {
            if (!envelope.bootstrap) {
                throw new Error("Missing session and no bootstrap metadata provided.");
            }

            const spkPriv = await getProtectedData('signed_pre_key', `private_${envelope.bootstrap.targetSignedPreKeyId}`);
            if (!spkPriv) throw new Error("Missing required Signed Pre-Key for bootstrap");

            let opkPriv: Uint8Array | undefined = undefined;
            if (envelope.bootstrap.targetOneTimePreKeyId !== null) {
                opkPriv = await getProtectedData('one_time_pre_keys', `private_${envelope.bootstrap.targetOneTimePreKeyId}`);
                if (!opkPriv) {
                    throw new Error("Missing required One-Time Pre-Key for bootstrap. Message might be a replay or OPK already consumed.");
                }
            }

            const sharedSecret = bootstrapAsBob(
                unlockedIdentity.privateAgreementKey,
                base64ToBytes(spkPriv),
                envelope.bootstrap.senderIdentityPubKeyB64,
                envelope.bootstrap.senderEphemeralPubKeyB64,
                opkPriv ? base64ToBytes(opkPriv) : undefined
            );

            // Reconstruir la key pair del SPK para inicializar el estado del Ratchet de Bob
            const spkPub = await getProtectedData('signed_pre_key', `public_${envelope.bootstrap.targetSignedPreKeyId}`);
            const bobDHs = {
                privateKey: base64ToBytes(spkPriv),
                publicKey: base64ToBytes(spkPub.public_key_b64)
            };

            await this.sessionManager.initializeSessionAsBob(
                sessionId,
                localDeviceId,
                senderDeviceId,
                senderIdentitySigningKeyB64,
                sharedSecret,
                bobDHs
            );

            // Inutilizar la OPK solo DESPUÉS de un bootstrap exitoso
            if (envelope.bootstrap.targetOneTimePreKeyId !== null) {
                await removeProtectedData('one_time_pre_keys', `private_${envelope.bootstrap.targetOneTimePreKeyId}`);
            }
        } else if (envelope.bootstrap) {
            // Replay del bootstrap inicial, la sesión ya existe.
            // Ignoramos el bootstrap y procesamos normalmente con el Ratchet.
            // El Ratchet manejará si el message_id (header) es un duplicado o está out-of-order.
        }

        const context: AADContext = {
            protocol_version: 1,
            conversation_id: conversationId,
            message_id: messageId,
            sender_device_id: senderDeviceId,
            recipient_device_id: localDeviceId,
            session_id: sessionId
        };

        const contentKey = await this.sessionManager.decryptMessage(
            sessionId,
            envelope.header,
            base64ToBytes(envelope.ratchetCiphertextB64),
            context,
            senderIdentitySigningKeyB64
        );

        const contentAad = new TextEncoder().encode(`V1|${conversationId}|${messageId}`);
        const plaintextBytes = decryptSymmetric(
            base64ToBytes(baseCiphertextB64),
            contentKey,
            contentAad
        );

        contentKey.fill(0); // Zeroize

        return new TextDecoder().decode(plaintextBytes);
    }
}
