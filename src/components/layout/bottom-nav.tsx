import { Link } from "@tanstack/react-router";

import { MOBILE_NAV } from "@/config/navigation";

export function BottomNav() {
  return (
    <nav
      aria-label="Navegación inferior"
      className="fixed bottom-3 inset-x-3 z-30 flex justify-center pb-[env(safe-area-inset-bottom)] pointer-events-none lg:hidden"
    >
      <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-stone-200/70 shadow-lg rounded-full px-2 py-1.5 flex items-center justify-around w-full max-w-sm">
        {MOBILE_NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex flex-col items-center justify-center size-11 rounded-full text-stone-500 transition-all hover:text-stone-900"
            activeProps={{
              className: "!bg-[#FEE867] !text-stone-950 font-bold shadow-xs scale-105",
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
