import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getProtectedData } from '../crypto/KeyStore';
import { MessageService } from '../services/MessageService';
import { SessionManager } from '../crypto/SessionManager';
import { base64ToBytes, decryptSymmetric } from '../crypto/CryptoCore';
import { decryptMessageKeyFromEnvelope, EnvelopeContext } from '../crypto/EnvelopeEncryption';

export type DecryptionStatus = 'DECRYPTING' | 'READY' | 'SECURITY_ERROR' | 'FAILED';

export interface DecryptedMessageState {
    plaintext?: string;
    status: DecryptionStatus;
}

import { UnlockedDeviceIdentity } from '../crypto/DeviceIdentity';

export function useDecryptedMessages(
    conversationId: string, 
    messages: any[] | undefined, 
    localDeviceId: string | undefined,
    unlockedIdentity: UnlockedDeviceIdentity | null
) {
    const [decryptedMap, setDecryptedMap] = useState<Record<string, DecryptedMessageState>>({});

    useEffect(() => {
        if (!messages || messages.length === 0 || !localDeviceId) return;

        const sessionManager = new SessionManager();
        const messageService = new MessageService(sessionManager);

        async function processMessages() {
            const newMap = { ...decryptedMap };
            let hasChanges = false;

            if (!unlockedIdentity) {
                console.error("No local identity available for decryption");
                return;
            }

            for (const msg of messages) {
                if (newMap[msg.id] && (newMap[msg.id].status === 'READY' || newMap[msg.id].status === 'FAILED' || newMap[msg.id].status === 'SECURITY_ERROR')) {
                    continue; // Ya procesado
                }

                newMap[msg.id] = { status: 'DECRYPTING' };
                hasChanges = true;

                try {
                    // Encontrar el envelope para mi dispositivo
                    const myEnvelope = msg.message_key_envelopes?.find((e: any) => e.device_id === localDeviceId);

                    if (!myEnvelope) {
                        throw new Error("No envelope found for this device");
                    }

                    if (msg.sender_device_id === localDeviceId && myEnvelope.key_algorithm === 'SELF-X25519-ENVELOPE-v1') {
                        // SELF-ENVELOPE DECRYPTION
                        const envContext: EnvelopeContext = {
                            protocol_version: 1,
                            message_id: msg.id,
                            conversation_id: conversationId,
                            sender_device_id: localDeviceId,
                            recipient_device_id: localDeviceId,
                            key_algorithm: 'SELF-X25519-ENVELOPE-v1',
                            envelope_version: 1
                        };

                        const parsedEnvelope = JSON.parse(myEnvelope.encrypted_message_key);
                        
                        const contentKey = decryptMessageKeyFromEnvelope(
                            parsedEnvelope,
                            unlockedIdentity.privateAgreementKey,
                            envContext
                        );

                        const contentAad = new TextEncoder().encode(`V1|${conversationId}|${msg.id}`);
                        const plaintextBytes = decryptSymmetric(
                            base64ToBytes(msg.ciphertext),
                            contentKey,
                            contentAad
                        );

                        contentKey.fill(0);

                        newMap[msg.id] = {
                            status: 'READY',
                            plaintext: new TextDecoder().decode(plaintextBytes)
                        };
                    } else if (myEnvelope.key_algorithm === 'DOUBLE_RATCHET_AES256GCM') {
                        // REMOTE DECRYPTION
                        if (!msg.sender_device_id) {
                            throw new Error("Missing sender_device_id for remote envelope");
                        }

                        // Obtener el public key del autor
                        // Optimización: Podría cachearse, pero por ahora se consulta
                        const { data: senderDevice, error: sdErr } = await supabase
                            .from('authorized_devices')
                            .select('device_public_key')
                            .eq('id', msg.sender_device_id)
                            .single();
                        
                        if (sdErr || !senderDevice || !senderDevice.device_public_key) {
                            throw new Error("Could not fetch sender identity key");
                        }

                        const plaintext = await messageService.receiveAndDecrypt(
                            conversationId,
                            msg.id,
                            msg.sender_device_id,
                            localDeviceId,
                            senderDevice.device_public_key,
                            myEnvelope.encrypted_message_key,
                            msg.ciphertext,
                            unlockedIdentity
                        );

                        newMap[msg.id] = {
                            status: 'READY',
                            plaintext
                        };
                    } else {
                        throw new Error("Unknown encryption algorithm");
                    }

                } catch (err: any) {
                    console.error(`Failed to decrypt message ${msg.id}:`, err);
                    newMap[msg.id] = { status: 'FAILED' };
                }
            }

            if (hasChanges) {
                setDecryptedMap(newMap);
            }
        }

        processMessages();

    // No queremos re-ejecutar cada vez que el map cambia, solo cuando llegan nuevos mensajes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages, conversationId, localDeviceId, unlockedIdentity]);

    return decryptedMap;
}
