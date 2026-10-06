import { Link } from "@tanstack/react-router";
import { MOBILE_NAV } from "@/config/navigation";

interface BottomNavProps {
  unreadCount?: number;
}

export function BottomNav({ unreadCount = 0 }: BottomNavProps) {
  return (
    <nav
      aria-label="Navegación inferior"
      className="fixed bottom-0 inset-x-0 z-30 bg-[#1e152d]/90 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom)] shadow-2xl"
    >
      <div className="mx-auto max-w-md">
        <ul className="grid grid-cols-5 py-2">
          {MOBILE_NAV.map((item) => (
            <li key={item.to} className="flex justify-center">
              <Link
                to={item.to}
                className="relative flex flex-col items-center justify-center gap-1 py-1 px-2 text-[10px] font-bold text-[#a497be] transition-colors"
                activeProps={{ className: "text-[#246bfd]", "aria-current": "page" }}
              >
                <div className="relative">
                  <item.icon className="size-5" aria-hidden="true" />
                  {item.to === "/notifications" && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 size-2 rounded-full bg-[#f79193] border border-[#231934]" />
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
