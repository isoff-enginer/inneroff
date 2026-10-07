import React from "react";
import { 
  Package, 
  Sparkles, 
  Layers, 
  Box, 
  CircleDot, 
  Disc, 
  Cpu, 
  ShieldCheck, 
  FolderKanban,
  CheckCircle2
} from "lucide-react";

interface ProductVisualIconProps {
  name?: string;
  category?: string;
  type?: string;
  imageType?: string;
  className?: string;
}

export function ProductVisualIcon({ name, category, type, imageType, className = "size-20" }: ProductVisualIconProps) {
  const normType = (name || type || imageType || category || "").toLowerCase();

  // Blanco: Mamitas
  if (normType.includes("mamita")) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f79193]/30 via-[#2d2244] to-[#231934] border border-[#f79193]/40 shadow-lg shadow-[#f79193]/10">
          <CircleDot className="size-7 text-[#f79193] stroke-[2.2]" />
        </div>
      </div>
    );
  }

  // Blanco: Tornillos
  if (normType.includes("tornillo")) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#246bfd]/30 via-[#2d2244] to-[#231934] border border-[#246bfd]/40 shadow-lg shadow-[#246bfd]/10">
          <Cpu className="size-7 text-[#246bfd] stroke-[2.2]" />
        </div>
      </div>
    );
  }

  // Blanco: Baldes
  if (normType.includes("balde")) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8ec97b]/30 via-[#2d2244] to-[#231934] border border-[#8ec97b]/40 shadow-lg shadow-[#8ec97b]/10">
          <Layers className="size-7 text-[#8ec97b] stroke-[2.2]" />
        </div>
      </div>
    );
  }

  // Verde: Gordos
  if (normType.includes("gordo")) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8ec97b]/30 via-[#2d2244] to-[#231934] border border-[#8ec97b]/40 shadow-lg shadow-[#8ec97b]/10">
          <Box className="size-7 text-[#8ec97b] stroke-[2.2]" />
        </div>
      </div>
    );
  }

  // Verde: Minis
  if (normType.includes("mini")) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#246bfd]/30 via-[#2d2244] to-[#231934] border border-[#246bfd]/40 shadow-lg shadow-[#246bfd]/10">
          <Disc className="size-7 text-[#246bfd] stroke-[2.2]" />
        </div>
      </div>
    );
  }

  // Verde: Largos
  if (normType.includes("largo")) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f79193]/30 via-[#2d2244] to-[#231934] border border-[#f79193]/40 shadow-lg shadow-[#f79193]/10">
          <FolderKanban className="size-7 text-[#f79193] stroke-[2.2]" />
        </div>
      </div>
    );
  }

  // Verde: Promo
  if (normType.includes("promo")) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#246bfd]/30 via-[#f79193]/20 to-[#231934] border border-[#246bfd]/40 shadow-lg shadow-[#246bfd]/10">
          <Sparkles className="size-7 text-[#246bfd] stroke-[2.2]" />
        </div>
      </div>
    );
  }

  // Default iOS Package
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-white/10 via-[#2d2244] to-[#231934] border border-white/10 shadow-lg">
        <Package className="size-7 text-white stroke-[2.2]" />
      </div>
    </div>
  );
}
