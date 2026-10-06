import React from "react";

interface ProductVisualIconProps {
  type?: string;
  imageType?: string;
  className?: string;
}

export function ProductVisualIcon({ type, imageType, className = "size-24" }: ProductVisualIconProps) {
  const normType = (type || imageType || "").toLowerCase();

  if (normType.includes("mamita")) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        {/* 3D Grandma Character stylized clay render */}
        <div className="relative flex size-20 items-center justify-center rounded-full bg-gradient-to-tr from-amber-200 via-rose-100 to-amber-50 shadow-md">
          <span className="text-3xl select-none" role="img" aria-label="Mamita">👵</span>
        </div>
      </div>
    );
  }

  if (normType.includes("tornillo")) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        {/* 3D Metallic Screw object render */}
        <div className="relative flex size-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-slate-300 via-slate-100 to-white shadow-md border border-slate-200">
          <span className="text-3xl select-none" role="img" aria-label="Tornillo">🔩</span>
        </div>
      </div>
    );
  }

  if (normType.includes("balde")) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        {/* 3D Bucket plastic container render */}
        <div className="relative flex size-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-200 via-blue-100 to-white shadow-md border border-sky-100">
          <span className="text-3xl select-none" role="img" aria-label="Balde">🪣</span>
        </div>
      </div>
    );
  }

  if (normType.includes("gordo")) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        {/* 3D Chubby character render */}
        <div className="relative flex size-20 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-200 via-green-100 to-yellow-50 shadow-md">
          <span className="text-3xl select-none" role="img" aria-label="Gordo">🧔‍♂️</span>
        </div>
      </div>
    );
  }

  if (normType.includes("mini")) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        {/* 3D Mini character render */}
        <div className="relative flex size-20 items-center justify-center rounded-full bg-gradient-to-tr from-lime-200 via-emerald-100 to-white shadow-md">
          <span className="text-3xl select-none" role="img" aria-label="Mini">🧒</span>
        </div>
      </div>
    );
  }

  if (normType.includes("largo")) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        {/* 3D Long roll item render */}
        <div className="relative flex size-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-100 via-orange-50 to-white shadow-md border border-amber-200/50">
          <span className="text-3xl select-none" role="img" aria-label="Largo">🥖</span>
        </div>
      </div>
    );
  }

  if (normType.includes("promo")) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        {/* 3D Green Promo special badge */}
        <div className="relative flex size-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-400 via-green-300 to-lime-200 shadow-md">
          <span className="text-3xl select-none" role="img" aria-label="Promo">✨</span>
        </div>
      </div>
    );
  }

  // Generic 3D Package item fallback
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <div className="relative flex size-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-gray-200 via-gray-100 to-white shadow-md">
        <span className="text-3xl select-none" role="img" aria-label="Producto">📦</span>
      </div>
    </div>
  );
}
