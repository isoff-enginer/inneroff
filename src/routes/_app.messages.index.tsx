import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { NewMessageModal } from "@/features/messages/components/NewMessageModal";
import { useSession } from "@/features/auth/session";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/messages/")({
  component: MessagesIndexPage,
});

function MessagesIndexPage() {
  const { user } = useSession();
  const [search, setSearch] = useState("");

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // 1. Get my active memberships
      const { data: myMemberships, error: memError } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", user.id)
        .is("left_at", null);

      if (memError) throw memError;
      if (!myMemberships || myMemberships.length === 0) return [];

      const conversationIds = myMemberships.map((m) => m.conversation_id);

      // 2. Fetch conversations + all active members
      const { data: convs, error: convError } = await supabase
        .from("conversations")
        .select(`
          id,
          updated_at,
          type,
          conversation_members (
            user_id,
            left_at,
            profiles (
              id,
              full_name,
              role
            )
          ),
          messages (
            id,
            sent_at
          )
        `)
        .in("id", conversationIds)
        .is("conversation_members.left_at", null)
        .order("updated_at", { ascending: false });

      if (convError) throw convError;

      // Transform to display format
      return convs.map((conv: any) => {
        // Find the "other" person in direct chats
        const otherMembers = conv.conversation_members.filter(
          (m: any) => m.user_id !== user.id
        );
        const displayMember = otherMembers[0]?.profiles;

        const displayName =
          conv.type === "direct" && displayMember
            ? displayMember.full_name
            : conv.title || "Grupo";

        // We only have the encrypted message, so we just show a generic text
        const hasMessages = conv.messages && conv.messages.length > 0;
        const lastMsgTime = hasMessages
          ? new Date(
              Math.max(...conv.messages.map((m: any) => new Date(m.sent_at).getTime()))
            )
          : new Date(conv.updated_at);

        return {
          id: conv.id,
          name: displayName,
          lastMessageAt: lastMsgTime,
          // We can't show ciphertext, so we show a placeholder
          lastMessageText: hasMessages ? "Mensaje cifrado" : "Nueva conversación",
          unreadCount: 0, // Pending unread implementation
        };
      }).sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
    },
    enabled: !!user?.id,
  });

  const filteredConversations = conversations?.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-background">
      {/* HEADER iOS STYLE */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 pb-4">
        <div className="flex items-center justify-between mb-4 mt-2">
          <h1 className="text-2xl font-bold tracking-tight">Mensajes</h1>
          <NewMessageModal>
            <Button size="sm" variant="ghost" className="text-primary hover:text-primary/80 font-medium px-2">
              Nuevo
            </Button>
          </NewMessageModal>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar"
            className="pl-9 bg-muted/50 border-none rounded-xl h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      {/* LISTA */}
      <main className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Cargando conversaciones...
          </div>
        ) : filteredConversations?.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {search ? "No se encontraron resultados" : "No tienes mensajes"}
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {filteredConversations?.map((conversation) => (
              <li key={conversation.id}>
                <Link
                  to="/messages/$conversationId"
                  params={{ conversationId: conversation.id }}
                  className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-accent/50 active:bg-accent"
                >
                  <Avatar className="size-12 border border-border/50">
                    <AvatarFallback className="bg-muted text-sm font-medium">
                      {conversation.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="truncate font-semibold text-[15px]">
                        {conversation.name}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTime(conversation.lastMessageAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[14px] text-muted-foreground">
                        {conversation.lastMessageText}
                      </span>
                      {conversation.unreadCount > 0 && (
                        <span className="flex-shrink-0 flex items-center justify-center size-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function formatTime(date: Date) {
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return "Ayer";
  }

  return date.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
}
