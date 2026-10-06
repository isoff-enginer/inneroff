import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/features/auth/session";
import { toast } from "sonner";
import { showLocalNotification } from "@/lib/push-notifications";

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string | null;
  type: string;
  isRead: boolean;
  referenceId: string | null;
  referenceType: string | null;
  createdAt: string;
}

export function useRealtimeNotifications() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      try {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) {
          console.warn("[Notifications] Error fetching notifications:", error.message);
          return [];
        }

        return (data || []).map((n) => ({
          id: n.id,
          userId: n.user_id,
          title: n.title,
          body: n.body,
          type: n.type,
          isRead: n.is_read,
          referenceId: n.reference_id,
          referenceType: n.reference_type,
          createdAt: n.created_at,
        })) as AppNotification[];
      } catch (err) {
        console.warn("[Notifications] Catch error:", err);
        return [];
      }
    },
    enabled: !!user?.id,
  });

  // Subscribe to real-time notifications for the current user
  useEffect(() => {
    if (!user?.id) return;

    try {
      const channel = supabase
        .channel(`user-notifications-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotif = payload.new as any;
            
            // Show toast in app
            toast.info(newNotif.title, {
              description: newNotif.body,
              duration: 5000,
            });

            // Show browser notification if permitted
            showLocalNotification(newNotif.title, {
              body: newNotif.body || "",
              url: newNotif.reference_type === "dispatch"
                ? "/dispatches"
                : newNotif.reference_type === "inventory"
                ? "/inventory"
                : "/notifications",
            });

            // Invalidate operational queries
            queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
            queryClient.invalidateQueries({ queryKey: ["live_dispatches"] });
            queryClient.invalidateQueries({ queryKey: ["inventory_balances"] });
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (e) {
      console.warn("[Notifications] Channel error:", e);
    }
  }, [user?.id, queryClient]);

  const markAllAsRead = async () => {
    if (!user?.id) return;
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);

      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const unreadCount = (query.data || []).filter((n) => !n.isRead).length;

  return {
    notifications: query.data || [],
    unreadCount,
    isLoading: query.isLoading,
    markAllAsRead,
    markAsRead,
  };
}
