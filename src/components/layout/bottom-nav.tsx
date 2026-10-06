import { Link } from "@tanstack/react-router";
import { MOBILE_NAV } from "@/config/navigation";

interface BottomNavProps {
  unreadCount?: number;
}

export function BottomNav({ unreadCount = 0 }: BottomNavProps) {
  return (
    <nav
      aria-label="Navegación inferior"
      className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-gray-200/60 pb-[env(safe-area-inset-bottom)] shadow-xs"
    >
      <div className="mx-auto max-w-md">
        <ul className="grid grid-cols-5 py-1.5">
          {MOBILE_NAV.map((item) => (
            <li key={item.to} className="flex justify-center">
              <Link
                to={item.to}
                className="relative flex flex-col items-center justify-center gap-0.5 py-1 px-2 text-[10px] font-bold text-gray-400 transition-colors"
                activeProps={{ className: "text-black", "aria-current": "page" }}
              >
                <div className="relative">
                  <item.icon className="size-5" aria-hidden="true" />
                  {item.to === "/notifications" && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 size-2 rounded-full bg-amber-400 border border-white" />
                  )}
                </div>
                <span className="tracking-tight">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
