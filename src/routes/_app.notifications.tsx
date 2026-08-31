import { createFileRoute } from "@tanstack/react-router";

import { NotificationItem } from "@/components/common/notification-item";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MOCK_NOTIFICATIONS } from "@/features/dashboard/mock-data";

export const Route = createFileRoute("/_app/notifications")({
  head: () => ({
    meta: [
      { title: "Notificaciones · Reserva Operaciones" },
      {
        name: "description",
        content: "Centro de notificaciones de despachos, recepciones, recaudos y mensajes internos.",
      },
      { property: "og:title", content: "Notificaciones · Reserva Operaciones" },
      {
        property: "og:description",
        content: "Centro de notificaciones de despachos, recepciones, recaudos y mensajes internos.",
      },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const unread = MOCK_NOTIFICATIONS.filter((n) => !n.read);
  const read = MOCK_NOTIFICATIONS.filter((n) => n.read);

  return (
    <>
      <PageHeader
        title="Notificaciones"
        description="Estructura visual del centro de notificaciones. Push se conectará después."
        actions={
          <Button variant="outline" disabled title="Disponible al conectar la lógica funcional">
            Marcar todo como leído
          </Button>
        }
      />

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="unread">No leídas ({unread.length})</TabsTrigger>
          <TabsTrigger value="read">Leídas</TabsTrigger>
        </TabsList>

        {(
          [
            ["all", MOCK_NOTIFICATIONS],
            ["unread", unread],
            ["read", read],
          ] as const
        ).map(([value, items]) => (
          <TabsContent key={value} value={value} className="mt-4">
            {items.length === 0 ? (
              <EmptyState title="Sin notificaciones" description="Aquí verás la actividad reciente." />
            ) : (
              <div className="surface p-2">
                {items.map((notification) => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}
