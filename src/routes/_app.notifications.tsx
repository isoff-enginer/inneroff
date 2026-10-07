import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bell, CheckCheck, Send, Package, AlertTriangle, ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRealtimeNotifications, type AppNotification } from "@/hooks/use-realtime-notifications";
import { requestAndSubscribePush } from "@/lib/push-notifications";
import { useSession } from "@/features/auth/session";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/notifications")({
  head: () => ({
    meta: [
      { title: "Notificaciones · Operaciones" },
      {
        name: "description",
        content: "Centro de notificaciones en tiempo real y push de despachos y operaciones.",
      },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = useSession();
  const { notifications, unreadCount, isLoading, markAllAsRead, markAsRead } = useRealtimeNotifications();
  const navigate = useNavigate();

  const unread = notifications.filter((n) => !n.isRead);
  const read = notifications.filter((n) => n.isRead);

  const handleEnablePush = async () => {
    if (!user?.id) return;
    const granted = await requestAndSubscribePush(user.id);
    if (granted) {
      toast.success("Notificaciones Push activadas en este dispositivo");
    } else {
      toast.info("No se pudieron habilitar las notificaciones push (verifica los permisos de tu navegador)");
    }
  };

  const handleNotificationClick = async (n: AppNotification) => {
    if (!n.isRead) {
      await markAsRead(n.id);
    }

    if (n.referenceType === "dispatch") {
      navigate({ to: "/dispatches" });
    } else if (n.referenceType === "inventory") {
      navigate({ to: "/inventory" });
    }
  };

  const getIcon = (type: string) => {
    if (type === "dispatch") return <Send className="size-4 text-amber-500" />;
    if (type === "receipt") return <Package className="size-4 text-emerald-500" />;
    if (type === "security") return <ShieldCheck className="size-4 text-blue-500" />;
    if (type === "alert") return <AlertTriangle className="size-4 text-rose-500" />;
    return <Bell className="size-4 text-gray-500" />;
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-20 sm:pb-8">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 pt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Alertas operativas y avisos de despachos en tiempo real
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleEnablePush}
              className="text-xs font-semibold rounded-xl h-8 border-gray-200"
            >
              <Bell className="size-3.5 mr-1" />
              Activar Push
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs font-semibold h-8"
              >
                <CheckCheck className="size-3.5 mr-1" />
                Marcar leídas
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pt-3">
        <Tabs defaultValue="all">
          <TabsList className="bg-gray-100 p-1 rounded-xl">
            <TabsTrigger value="all" className="text-xs font-bold rounded-lg">
              Todas ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-xs font-bold rounded-lg">
              No leídas ({unread.length})
            </TabsTrigger>
            <TabsTrigger value="read" className="text-xs font-bold rounded-lg">
              Leídas
            </TabsTrigger>
          </TabsList>

          {(
            [
              ["all", notifications],
              ["unread", unread],
              ["read", read],
            ] as const
          ).map(([value, items]) => (
            <TabsContent key={value} value={value} className="mt-3">
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-gray-200 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <EmptyState
                  title="Sin notificaciones"
                  description="Aquí verás los avisos de despachos, recepciones de inventario y alertas del sistema."
                />
              ) : (
                <div className="space-y-2">
                  {items.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                        notification.isRead
                          ? "bg-white border-gray-100 opacity-80"
                          : "bg-white border-primary/20 shadow-xs ring-1 ring-primary/10"
                      }`}
                    >
                      <div className="p-2 rounded-xl bg-gray-50 border border-gray-100 shrink-0 mt-0.5">
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className={`text-sm truncate ${notification.isRead ? 'font-medium text-gray-800' : 'font-bold text-gray-900'}`}>
                            {notification.title}
                          </span>
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                            {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {notification.body && (
                          <p className="text-xs text-gray-600 line-clamp-2 mt-0.5 leading-relaxed">
                            {notification.body}
                          </p>
                        )}
                      </div>
                      {!notification.isRead && (
                        <div className="size-2 rounded-full bg-primary mt-2 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
}
