/** DATOS MOCK — SOLO UI. El cifrado y Realtime se implementarán después. */
import type { ChatMessage, ConversationSummary } from "@/types/domain";

export const MOCK_CONVERSATIONS: ConversationSummary[] = [
  { id: "c1", name: "Coordinación Bodega", lastMessage: "Confirmo recepción del despacho #2", lastMessageAt: "09:42", unreadCount: 2 },
  { id: "c2", name: "Fábrica Prueba", lastMessage: "Producción lista para despachar", lastMessageAt: "08:15", unreadCount: 0 },
  { id: "c3", name: "Tienda Centro", lastMessage: "Recaudo enviado", lastMessageAt: "Ayer", unreadCount: 0 },
];

export const MOCK_MESSAGES: Record<string, ChatMessage[]> = {
  c1: [
    { id: "m1", conversationId: "c1", author: "Bodega", outgoing: false, body: "Recibimos el despacho #2 completo.", sentAt: "09:31" },
    { id: "m2", conversationId: "c1", author: "Tú", outgoing: true, body: "Perfecto, registro la recepción.", sentAt: "09:38" },
    { id: "m3", conversationId: "c1", author: "Bodega", outgoing: false, body: "Confirmo recepción del despacho #2", sentAt: "09:42" },
  ],
  c2: [
    { id: "m4", conversationId: "c2", author: "Fábrica", outgoing: false, body: "Producción lista para despachar", sentAt: "08:15" },
  ],
  c3: [
    { id: "m5", conversationId: "c3", author: "Tienda Centro", outgoing: false, body: "Recaudo enviado", sentAt: "Ayer" },
  ],
};
