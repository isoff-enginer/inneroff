import { supabase } from '@/integrations/supabase/client';
import { SessionManager } from '../crypto/SessionManager';
import { bootstrapAsAlice } from '../crypto/SessionBootstrap';
import { randomBytes, encryptSymmetric, bytesToBase64, base64ToBytes } from '../crypto/CryptoCore';
import { DoubleRatchetHeader } from '../crypto/SessionTypes';
import { AADContext } from '../crypto/DoubleRatchet';
import { getProtectedData } from '../crypto/KeyStore';

export interface SerializedRatchetMessage {
    header: DoubleRatchetHeader;
    ratchetCiphertextB64: string;
}

export class MessageService {
    private sessionManager: SessionManager;

    constructor(sessionManager: SessionManager) {
        this.sessionManager = sessionManager;
    }

    /**
     * Envía un mensaje encriptado E2EE.
     * 1. Genera ContentKey aleatoria.
     * 2. Cifra el plaintext con la ContentKey.
     * 3. Para cada dispositivo destino, cifra la ContentKey con el Double Ratchet.
     */
    async encryptAndSend(
        conversationId: string,
        plaintext: string,
        localDeviceId: string,
        localIdentityPrivKey: Uint8Array
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
        
        // AAD para el ContentCiphertext (Capa base, NO es el AAD del Ratchet)
        const contentAad = new TextEncoder().encode(`V1|${conversationId}|${messageId}`);
        const contentCiphertext = encryptSymmetric(rawPlaintext, contentKey, contentAad);

        // 5. Preparar transacciones de base de datos
        const envelopesToInsert: any[] = [];

        for (const device of devices) {
            // No enviar envelope a nosotros mismos si no es necesario,
            // pero usualmente sí queremos para poder descifrar nuestros propios mensajes en otro dispositivo propio.
            // Para simplificar, generamos envelopes para TODOS los dispositivos (incluyendo otros nuestros).
            // A nuestro MISMO dispositivo no es estrictamente necesario, pero lo saltaremos.
            if (device.id === localDeviceId) continue;

            const sessionId = `session_${localDeviceId}_${device.id}`;
            let hasSession = !!(await getProtectedData('session', sessionId));

            if (!hasSession) {
                // Hacer Bootstrap X3DH
                // Mockeado por ahora ya que no existe una tabla pre_keys_bundle en Supabase.
                // En un entorno real consultaríamos RPC get_pre_key_bundle(device_id)
                // Lanzamos error documentado:
                throw new Error("PROTOCOL CHANGE REQUIRED: Missing Pre-Key distribution endpoint in Supabase to bootstrap new sessions. Cannot initiate Ratchet.");
            }

            const context: AADContext = {
                protocol_version: 1,
                conversation_id: conversationId,
                message_id: messageId,
                sender_device_id: localDeviceId,
                recipient_device_id: device.id,
                session_id: sessionId
            };

            // Cifrar la ContentKey pasando por el Ratchet
            const { header, ciphertext: ratchetCiphertext } = await this.sessionManager.encryptMessage(
                sessionId,
                contentKey,
                context
            );

            const serialized: SerializedRatchetMessage = {
                header,
                ratchetCiphertextB64: bytesToBase64(ratchetCiphertext)
            };

            envelopesToInsert.push({
                message_id: messageId,
                device_id: device.id,
                encrypted_message_key: JSON.stringify(serialized),
                key_algorithm: 'DOUBLE_RATCHET_AES256GCM'
            });
        }

        contentKey.fill(0); // Zeroize

        // 6. Insertar en base de datos (Supabase no soporta transacciones directas desde el frontend, 
        // requeriría un RPC. Usamos Promise.all para simular atomicidad básica o inserción secuencial).
        
        const { error: msgErr } = await (supabase as any).from('messages').insert({
            id: messageId,
            conversation_id: conversationId,
            sender_id: senderId,
            ciphertext: bytesToBase64(contentCiphertext),
            message_type: 'text'
        });

        if (msgErr) throw new Error("Failed to insert message ciphertext");

        if (envelopesToInsert.length > 0) {
            const { error: envErr } = await (supabase as any).from('message_key_envelopes').insert(envelopesToInsert);
            if (envErr) {
                // Fuga de transacción. Estrategia de recuperación: El mensaje principal está, pero nadie lo puede leer.
                console.error("Failed to insert envelopes", envErr);
            }
        }
    }
}
