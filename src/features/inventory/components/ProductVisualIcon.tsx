import React, { useState, useEffect } from "react";
import { 
  Package, 
  Sparkles, 
  Layers, 
  Box, 
  CircleDot, 
  Disc, 
  Cpu, 
  FolderKanban,
  Flame
} from "lucide-react";

interface ProductVisualIconProps {
  name?: string;
  category?: string;
  type?: string;
  imageType?: string;
  imageUrl?: string;
  className?: string;
}

export function ProductVisualIcon({ 
  name, 
  category, 
  type, 
  imageType, 
  imageUrl,
  className = "size-20" 
}: ProductVisualIconProps) {
  const rawName = (name || type || imageType || "").toLowerCase().trim();
  const normType = (name || type || imageType || category || "").toLowerCase().trim();

  // Mapeo exacto a las fotos en "public/fotos de productos/" y respaldo en "public/products/"
  let primaryFileName = "";
  let fallbackFileName = "";

  if (rawName.includes("mamita")) {
    primaryFileName = "mamita.png";
    fallbackFileName = "mamitas.png";
  } else if (rawName.includes("tornillo")) {
    primaryFileName = "tornillos.png";
    fallbackFileName = "tornillo.png";
  } else if (rawName.includes("liso") || rawName.includes("gordo")) {
    primaryFileName = "gordos.png";
    fallbackFileName = "lisos.png";
  } else if (rawName.includes("largo")) {
    primaryFileName = "largos.png";
    fallbackFileName = "largos.png";
  } else if (rawName.includes("mini")) {
    primaryFileName = "minis.png";
    fallbackFileName = "minis.png";
  } else if (rawName.includes("roja")) {
    primaryFileName = "rojas.png";
    fallbackFileName = "rojas.png";
  } else if (rawName.includes("flor")) {
    primaryFileName = "flores.png";
    fallbackFileName = "flores.png";
  } else if (rawName.includes("balde")) {
    primaryFileName = "baldes.png";
    fallbackFileName = "baldes.png";
  } else if (rawName.includes("pre-roll") || rawName.includes("preroll") || rawName.includes("roll")) {
    primaryFileName = "pre rolls.png";
    fallbackFileName = "pre-roll.png";
  }

  // Lista de fuentes ordenadas por prioridad
  const sources = [
    imageUrl,
    primaryFileName ? `/fotos de productos/${primaryFileName}` : "",
    fallbackFileName ? `/products/${fallbackFileName}` : "",
  ].filter(Boolean) as string[];

  const [currentSrcIndex, setCurrentSrcIndex] = useState(0);
  const [hasFailedAll, setHasFailedAll] = useState(sources.length === 0);

  useEffect(() => {
    setCurrentSrcIndex(0);
    setHasFailedAll(sources.length === 0);
  }, [name, imageUrl]);

  const handleImgError = () => {
    if (currentSrcIndex < sources.length - 1) {
      setCurrentSrcIndex(prev => prev + 1);
    } else {
      setHasFailedAll(true);
    }
  };

  const currentSrc = sources[currentSrcIndex];

  // Si hay imagen válida y no ha fallado
  if (currentSrc && !hasFailedAll) {
    return (
      <div className={`relative flex items-center justify-center overflow-hidden rounded-2xl ${className}`}>
        <img 
          src={currentSrc} 
          alt={name || "Producto"} 
          className="size-full object-contain p-0.5 rounded-2xl transition-transform hover:scale-105 will-change-transform"
          onError={handleImgError}
          decoding="async"
          loading="eager"
          // @ts-ignore
          fetchpriority="high"
        />
      </div>
    );
  }

  // Íconos vectoriales modernos en paleta Obsidian Slate (Respaldo elegante si no hay foto)
  // 1. Blanco: Mamitas
  if (normType.includes("mamita")) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-900 border border-slate-700/60 shadow-md">
          <CircleDot className="size-7 text-sky-400 stroke-[2.2]" />
        </div>
      </div>
    );
  }

  // 2. Blanco: Tornillo
  if (normType.includes("tornillo")) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-900 border border-slate-700/60 shadow-md">
          <Cpu className="size-7 text-blue-400 stroke-[2.2]" />
        </div>
      </div>
    );
  }

  // 3. Verde: Lisos
  if (normType.includes("liso") || normType.includes("gordo")) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-900 border border-slate-700/60 shadow-md">
          <Box className="size-7 text-emerald-400 stroke-[2.2]" />
        </div>
      </div>
    );
  }

  // 4. Verde: Largos
  if (normType.includes("largo")) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-900 border border-slate-700/60 shadow-md">
          <FolderKanban className="size-7 text-emerald-300 stroke-[2.2]" />
        </div>
      </div>
    );
  }

  // 5. Verde: Minis
  if (normType.includes("mini")) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-900 border border-slate-700/60 shadow-md">
          <Disc className="size-7 text-teal-400 stroke-[2.2]" />
        </div>
      </div>
    );
  }

  // 6. Productos adicionales: Rojas
  if (normType.includes("roja")) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-900 border border-slate-700/60 shadow-md">
          <CircleDot className="size-7 text-red-500 stroke-[2.2]" />
        </div>
      </div>
    );
  }

  // 7. Productos adicionales: Flores
  if (normType.includes("flor")) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-900 border border-slate-700/60 shadow-md">
          <Sparkles className="size-7 text-rose-400 stroke-[2.2]" />
        </div>
      </div>
    );
  }

  // 8. Productos adicionales: Baldes
  if (normType.includes("balde")) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-900 border border-slate-700/60 shadow-md">
          <Layers className="size-7 text-amber-400 stroke-[2.2]" />
        </div>
      </div>
    );
  }

  // 9. Productos adicionales: Pre-roll
  if (normType.includes("pre-roll") || normType.includes("preroll") || normType.includes("roll")) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-900 border border-slate-700/60 shadow-md">
          <Flame className="size-7 text-orange-400 stroke-[2.2]" />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-900 border border-slate-700/60 shadow-md">
        <Package className="size-7 text-slate-300 stroke-[2.2]" />
      </div>
    </div>
  );
}
