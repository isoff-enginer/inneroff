import { Bell, MessageSquare, PackageCheck, Receipt, Truck } from "lucide-react";

import { cn } from "@/lib/utils";
import type { NotificationItemData, NotificationKind } from "@/types/domain";

const ICONS: Record<NotificationKind, typeof Bell> = {
  dispatch: Truck,
  receipt: PackageCheck,
  payment: Receipt,
  message: MessageSquare,
  system: Bell,
};

interface NotificationItemProps {
  notification: NotificationItemData;
  onOpen?: (notification: NotificationItemData) => void;
}

export function NotificationItem({ notification, onOpen }: NotificationItemProps) {
  const Icon = ICONS[notification.kind];

  return (
    <button
      type="button"
      onClick={() => onOpen?.(notification)}
      className={cn(
        "flex w-full items-start gap-3 rounded-md px-3 py-3 text-left transition-colors hover:bg-accent",
        !notification.read && "bg-accent/40",
      )}
      aria-label={`${notification.read ? "Notificación leída" : "Notificación no leída"}: ${notification.title}`}
    >
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          {!notification.read ? (
            <span className="size-1.5 shrink-0 rounded-full bg-info" aria-hidden="true" />
          ) : null}
          <span className="truncate text-sm font-medium">{notification.title}</span>
        </span>
        {notification.body ? (
          <span className="mt-0.5 block truncate text-sm text-muted-foreground">
            {notification.body}
          </span>
        ) : null}
        <span className="mt-1 block text-xs text-muted-foreground">{notification.createdAt}</span>
      </span>
    </button>
  );
}
