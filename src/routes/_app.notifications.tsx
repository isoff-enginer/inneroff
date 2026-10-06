import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bell, CheckCheck, Send, Package, AlertTriangle, ShieldCheck, Wallet } from "lucide-react";
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
    if (type === "dispatch") return <Send className="size-4 text-[#f79193]" />;
    if (type === "receipt") return <Package className="size-4 text-[#8ec97b]" />;
    if (type === "payment") return <Wallet className="size-4 text-[#8ec97b]" />;
    if (type === "security") return <ShieldCheck className="size-4 text-[#246bfd]" />;
    if (type === "alert") return <AlertTriangle className="size-4 text-[#f75555]" />;
    return <Bell className="size-4 text-[#a497be]" />;
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#231934] pb-24 text-white">
      <header className="sticky top-0 z-10 bg-[#1e152d]/90 backdrop-blur-md border-b border-white/10 px-5 pt-4 pb-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-black text-white">Notificaciones</h1>
            <p className="text-xs text-[#a497be] mt-0.5">
              Alertas operativas y recaudos en tiempo real
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleEnablePush}
              className="text-xs font-bold rounded-2xl h-8 border-white/10 bg-[#2d2244] text-white hover:bg-[#34274e]"
            >
              <Bell className="size-3.5 mr-1 text-[#246bfd]" />
              Push
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs font-bold h-8 text-[#a497be] hover:text-white"
              >
                <CheckCheck className="size-3.5 mr-1" />
                Leídas
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 px-5 pt-3 max-w-md mx-auto w-full">
        <Tabs defaultValue="all">
          <TabsList className="bg-[#2d2244] p-1 rounded-2xl border border-white/10 w-full grid grid-cols-3">
            <TabsTrigger value="all" className="text-xs font-bold rounded-xl data-[state=active]:bg-[#246bfd] data-[state=active]:text-white text-[#a497be]">
              Todas ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-xs font-bold rounded-xl data-[state=active]:bg-[#246bfd] data-[state=active]:text-white text-[#a497be]">
              No leídas ({unread.length})
            </TabsTrigger>
            <TabsTrigger value="read" className="text-xs font-bold rounded-xl data-[state=active]:bg-[#246bfd] data-[state=active]:text-white text-[#a497be]">
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
                    <div key={i} className="h-16 bg-[#2d2244] rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="py-16 text-center text-[#a497be]">
                  <Bell className="size-10 mx-auto mb-2 opacity-30 text-[#246bfd]" />
                  <p className="text-sm font-medium">Sin notificaciones en esta sección.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {items.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 rounded-[22px] border transition-all cursor-pointer flex items-start gap-3.5 ${
                        notification.isRead
                          ? "bg-[#2d2244]/60 border-white/5 opacity-80"
                          : "bg-[#2d2244] border-[#246bfd]/40 shadow-lg shadow-[#246bfd]/10 ring-1 ring-[#246bfd]/30"
                      }`}
                    >
                      <div className="p-2.5 rounded-2xl bg-[#231934] border border-white/10 shrink-0 mt-0.5">
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className={`text-sm truncate ${notification.isRead ? 'font-medium text-white/90' : 'font-black text-white'}`}>
                            {notification.title}
                          </span>
                          <span className="text-[11px] text-[#a497be] whitespace-nowrap shrink-0">
                            {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {notification.body && (
                          <p className="text-xs text-[#a497be] line-clamp-2 mt-0.5 leading-relaxed">
                            {notification.body}
                          </p>
                        )}
                      </div>
                      {!notification.isRead && (
                        <div className="size-2.5 rounded-full bg-[#f79193] mt-2 shrink-0" />
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
