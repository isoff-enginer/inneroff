import { createFileRoute } from "@tanstack/react-router";
import { Send } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/common/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MOCK_CONVERSATIONS, MOCK_MESSAGES } from "@/features/messages/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/messages")({
  head: () => ({
    meta: [
      { title: "Mensajes · Reserva Operaciones" },
      {
        name: "description",
        content: "Mensajería interna entre fábrica, bodegas y tiendas del equipo de operación.",
      },
      { property: "og:title", content: "Mensajes · Reserva Operaciones" },
      {
        property: "og:description",
        content: "Mensajería interna entre fábrica, bodegas y tiendas del equipo de operación.",
      },
    ],
  }),
  component: MessagesPage,
});

function MessagesPage() {
  const [activeId, setActiveId] = useState(MOCK_CONVERSATIONS[0]!.id);
  const active = MOCK_CONVERSATIONS.find((c) => c.id === activeId)!;
  const messages = MOCK_MESSAGES[activeId] ?? [];

  return (
    <>
      <PageHeader
        title="Mensajes"
        description="Estructura visual. El cifrado y Realtime se implementarán posteriormente."
      />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <section aria-label="Conversaciones" className="surface overflow-hidden">
          <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">Conversaciones</h2>
          <ul className="divide-y divide-border">
            {MOCK_CONVERSATIONS.map((conversation) => (
              <li key={conversation.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(conversation.id)}
                  aria-current={conversation.id === activeId ? "true" : undefined}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent",
                    conversation.id === activeId && "bg-accent",
                  )}
                >
                  <Avatar className="size-9">
                    <AvatarFallback className="text-xs">
                      {conversation.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{conversation.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {conversation.lastMessageAt}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                      {conversation.lastMessage}
                    </span>
                  </span>
                  {conversation.unreadCount > 0 ? (
                    <span className="tabular ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                      {conversation.unreadCount}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Conversación activa" className="surface flex min-h-[420px] flex-col">
          <header className="border-b border-border px-5 py-3.5">
            <h2 className="text-sm font-semibold">{active.name}</h2>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn("flex", message.outgoing ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[75%] rounded-lg px-3.5 py-2.5 text-sm",
                    message.outgoing
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  <p>{message.body}</p>
                  <p
                    className={cn(
                      "mt-1 text-[11px]",
                      message.outgoing ? "text-primary-foreground/70" : "text-muted-foreground",
                    )}
                  >
                    {message.sentAt}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <form
            className="flex items-center gap-2 border-t border-border p-3"
            onSubmit={(event) => event.preventDefault()}
          >
            <Input placeholder="Escribir mensaje…" aria-label="Escribir mensaje" disabled />
            <Button type="submit" size="icon" aria-label="Enviar mensaje" disabled>
              <Send className="size-4" />
            </Button>
          </form>
        </section>
      </div>
    </>
  );
}
