import { Link } from "@tanstack/react-router";

import { MOBILE_NAV } from "@/config/navigation";

export function BottomNav() {
  return (
    <nav
      aria-label="Navegación inferior"
      className="fixed bottom-4 inset-x-4 z-40 flex justify-center pb-[env(safe-area-inset-bottom)] pointer-events-none"
    >
      <div className="pointer-events-auto bg-[#131620]/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded-full px-3 py-2 flex items-center justify-around w-full max-w-sm">
        {MOBILE_NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex flex-col items-center justify-center size-11 rounded-full text-slate-400 transition-all hover:text-white"
            activeProps={{
              className: "!bg-[#CCFF00] !text-black font-black shadow-md scale-105",
              "aria-current": "page"
            }}
          >
            <item.icon className="size-5" aria-hidden="true" />
            <span className="sr-only">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
