import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Send, AlertCircle, ShieldAlert } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, getRoleLabel } from "@/lib/utils";
import { toast } from "sonner";

import { useSession } from "@/features/auth/session";
import { supabase } from "@/integrations/supabase/client";
import { MessageService } from "@/features/messages/services/MessageService";
import { SessionManager } from "@/features/messages/crypto/SessionManager";
import { bytesToBase64 } from "@/features/messages/crypto/CryptoCore";
import { useDecryptedMessages } from "@/features/messages/hooks/useDecryptedMessages";
import { getServerDeviceId, saveServerDeviceId } from "@/features/messages/crypto/DeviceIdentity";
import { useDeviceCrypto } from "@/features/messages/crypto/DeviceCryptoContext";

export const Route = createFileRoute("/_app/messages/$conversationId")({
  component: ChatFullscreenPage,
});

function ChatFullscreenPage() {
  const { conversationId } = Route.useParams();
  const { user } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { unlockedIdentity, isUnlocked } = useDeviceCrypto();
  const [text, setText] = useState("");
  const [cryptoStatus, setCryptoStatus] = useState<"LOADING" | "LOCKED" | "READY" | "ERROR">("LOADING");
  const [deviceInfo, setDeviceInfo] = useState<{ id: string; privKey: Uint8Array } | null>(null);

  // 1. Validar membresía y obtener meta de la conversación
  const { data: conversation, isLoading: isConvLoading, error: convErr } = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: async () => {
      if (!user?.id) return null;

      // Check if user is member
      const { data: mem, error: memErr } = await supabase
        .from("conversation_members")
        .select("id")
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id)
        .is("left_at", null)
        .single();

      if (memErr || !mem) {
        throw new Error("No tienes acceso a esta conversación");
      }

      const { data: conv, error: cErr } = await supabase
        .from("conversations")
        .select(`
          id,
          type,
          title,
          conversation_members (
            user_id,
            profiles (id, full_name, role)
          )
        `)
        .eq("id", conversationId)
        .single();

      if (cErr) throw cErr;
      return conv;
    },
    enabled: !!user?.id,
  });

  // Check if they failed the membership test -> redirect
  useEffect(() => {
    if (convErr) {
      toast.error(convErr.message);
      router.navigate({ to: "/messages" });
    }
  }, [convErr, router]);

  // 2. Intentar cargar claves E2EE
  useEffect(() => {
    async function loadCrypto() {
      if (!isUnlocked || !unlockedIdentity) {
        setCryptoStatus("LOCKED");
        return;
      }

      try {
        let deviceId = unlockedIdentity.deviceId || getServerDeviceId();

        // MIGRACIÓN / SELF-HEAL LOGIC
        if (!deviceId) {
           const { data: devices, error: devErr } = await supabase
              .from("authorized_devices")
              .select("id")
              .eq("device_public_key", bytesToBase64(unlockedIdentity.publicIdentityKey))
              .eq("status", "active");
              
           if (!devErr && devices && devices.length === 1) {
              deviceId = devices[0].id;
              saveServerDeviceId(deviceId);
           } else {
              throw new Error("DEVICE_ID_AMBIGUOUS");
           }
        }

        if (!deviceId) {
          throw new Error("No device ID found");
        }

        setDeviceInfo({
          id: deviceId,
          privKey: unlockedIdentity.privateAgreementKey
        });
        setCryptoStatus("READY");
      } catch (err) {
        console.error("Failed to load device info", err);
        setCryptoStatus("ERROR");
      }
    }
    loadCrypto();
  }, [isUnlocked, unlockedIdentity]);

  // 3. Fetch de mensajes (ciphertext)
  const { data: messages, isLoading: isMsgsLoading, status: msgsStatus, error: msgsError } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          id,
          sender_id,
          sender_device_id,
          sent_at,
          ciphertext,
          profiles (full_name),
          message_key_envelopes!inner(device_id, encrypted_message_key, key_algorithm)
        `)
        .eq("conversation_id", conversationId)
        .eq("message_key_envelopes.device_id", getServerDeviceId() || "")
        .order("sent_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    refetchInterval: 3000, // Polling temporal hasta integrar realtime channel
  });



  const decryptedMap = useDecryptedMessages(
    conversationId,
    messages || undefined,
    deviceInfo?.id,
    unlockedIdentity
  );

  // Auto-scroll al final
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 4. Enviar Mensaje
  const { mutate: sendMessage, isPending: isSending } = useMutation({
    mutationFn: async (plaintext: string) => {
      if (cryptoStatus !== "READY" || !deviceInfo) {
        throw new Error("No se pudo establecer una sesión segura.");
      }
      const sessionManager = new SessionManager();
      const messageService = new MessageService(sessionManager);
      
      await messageService.encryptAndSend(
        conversationId,
        plaintext,
        deviceInfo.id,
        deviceInfo.privKey
      );
    },
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Error al enviar mensaje");
    }
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isSending) return;
    sendMessage(text.trim());
  };

  // Determinar Nombre y Área a mostrar en el header
  let displayName = "Cargando...";
  let areaText = "";

  if (conversation) {
    if (conversation.type === "direct") {
      const otherMember = conversation.conversation_members?.find(
        (m: any) => m.user_id !== user?.id
      );
      if (otherMember) {
        displayName = otherMember.profiles.full_name;
        areaText = getRoleLabel(otherMember.profiles.role); 
      }
    } else {
      displayName = conversation.title || "Grupo";
    }
  }

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-background overflow-hidden relative z-50">
      {/* HEADER TIPO iOS */}
      <header className="flex-shrink-0 flex items-center justify-between px-2 pt-[env(safe-area-inset-top)] pb-2 bg-background/95 backdrop-blur border-b border-border z-10 min-h-[60px]">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.navigate({ to: "/messages" })}
          className="text-primary hover:bg-accent/50"
        >
          <ChevronLeft className="size-7" strokeWidth={2.5} />
        </Button>

        <div className="flex flex-col items-center flex-1 mx-2 overflow-hidden">
          {!isConvLoading && (
            <>
              <span className="font-semibold text-[15px] truncate max-w-full">
                {displayName}
              </span>
              {areaText && (
                <span className="text-[11px] text-muted-foreground truncate max-w-full">
                  {areaText.toUpperCase()}
                </span>
              )}
            </>
          )}
        </div>

        <div className="w-10">
          {/* Espaciador para centrar */}
        </div>
      </header>

      {/* MENSAJES (SCROLLABLE AREA) */}
      <main 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-muted/20"
      >
        {cryptoStatus === "ERROR" && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive text-sm rounded-lg mx-auto w-fit mb-4">
            <ShieldAlert className="size-4" />
            <span>Sesión E2EE no verificada en este dispositivo.</span>
          </div>
        )}



        {isMsgsLoading && (
          <div className="text-center text-xs text-muted-foreground py-4">
            Cargando mensajes...
          </div>
        )}

        {messages?.map((msg: any, i: number) => {
          const isMine = msg.sender_id === user?.id;
          const showAvatar = !isMine && (i === 0 || messages[i - 1].sender_id !== msg.sender_id);

          return (
            <div
              key={msg.id}
              className={cn(
                "flex w-full",
                isMine ? "justify-end" : "justify-start"
              )}
            >
              <div className="flex items-end gap-2 max-w-[80%]">
                {!isMine && (
                  <div className="w-6 shrink-0">
                    {showAvatar && (
                      <Avatar className="size-6 border border-border">
                        <AvatarFallback className="text-[9px] bg-secondary">
                          {msg.profiles?.full_name?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                )}
                
                <div
                  className={cn(
                    "px-3.5 py-2.5 text-[15px] rounded-[18px] leading-snug break-words",
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-secondary text-secondary-foreground rounded-bl-sm"
                  )}
                >
                  {decryptedMap[msg.id]?.status === 'READY' ? (
                    <span>{decryptedMap[msg.id].plaintext}</span>
                  ) : decryptedMap[msg.id]?.status === 'FAILED' ? (
                    <div className="flex items-center gap-2 opacity-70">
                      <AlertCircle className="size-3 text-destructive" />
                      <span className="text-[11px] italic text-destructive">Error al descifrar</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 opacity-70">
                      <ShieldAlert className="size-3" />
                      <span className="text-[11px] italic">Descifrando...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </main>

      {/* COMPOSER INFERIOR TIPO iOS */}
      <div className="flex-shrink-0 bg-background border-t border-border p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <form
          onSubmit={handleSend}
          className="flex items-end gap-2 bg-muted/50 rounded-2xl border border-border/50 p-1.5 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all"
        >
          <div className="flex-shrink-0 pl-1 pb-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 rounded-full text-muted-foreground bg-muted hover:bg-accent cursor-not-allowed"
              disabled
            >
              <span className="text-xl leading-none font-light pb-0.5">+</span>
            </Button>
          </div>
          
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={cryptoStatus === "READY" ? "Mensaje..." : "Sesión E2EE requerida"}
            disabled={cryptoStatus !== "READY" || isSending}
            className="flex-1 border-0 bg-transparent focus-visible:ring-0 shadow-none px-2 text-[15px]"
            autoComplete="off"
          />

          <Button
            type="submit"
            disabled={!text.trim() || cryptoStatus !== "READY" || isSending}
            size="icon"
            className={cn(
              "size-8 rounded-full transition-all shrink-0 mb-0.5 mr-0.5",
              text.trim() ? "bg-primary" : "bg-muted text-muted-foreground opacity-50"
            )}
          >
            <Send className="size-4 ml-0.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
