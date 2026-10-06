import React from "react";

interface ProductVisualIconProps {
  type?: string;
  imageType?: string;
  className?: string;
  imageUrl?: string;
}

export function ProductVisualIcon({ type, imageType, className = "size-20", imageUrl }: ProductVisualIconProps) {
  const normType = (type || imageType || "").toLowerCase();

  if (imageUrl) {
    return (
      <div className={`relative flex items-center justify-center overflow-hidden rounded-2xl bg-[#18181e] border border-white/10 ${className}`}>
        <img src={imageUrl} alt={normType} className="size-full object-cover rounded-2xl" />
      </div>
    );
  }

  // 1. VERDE: GORDOS
  if (normType.includes("gordo")) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <div className="relative flex size-16 items-center justify-center rounded-2xl bg-gradient-to-b from-[#1c2e24] to-[#121a15] border border-[#10b981]/30 shadow-lg shadow-[#10b981]/10">
          <svg viewBox="0 0 64 64" className="size-11 drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="12" y="14" width="40" height="38" rx="8" fill="#1b4332" stroke="#2d6a4f" strokeWidth="2" />
            <rect x="16" y="18" width="32" height="14" rx="4" fill="#2d6a4f" opacity="0.8" />
            <circle cx="32" cy="40" r="6" fill="#52b788" />
            <path d="M22 25H42" stroke="#74c69d" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M26 31H38" stroke="#95d5b2" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="absolute -bottom-1 -right-1 bg-[#10b981] text-[#052e16] text-[9px] font-black px-1.5 py-0.2 rounded-md shadow-sm">
            GRD
          </span>
        </div>
      </div>
    );
  }

  // 2. VERDE: MINIS
  if (normType.includes("mini")) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <div className="relative flex size-16 items-center justify-center rounded-2xl bg-gradient-to-b from-[#1c2e24] to-[#121a15] border border-[#10b981]/30 shadow-lg shadow-[#10b981]/10">
          <svg viewBox="0 0 64 64" className="size-11 drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="14" y="20" width="16" height="24" rx="4" fill="#2d6a4f" stroke="#40916c" strokeWidth="1.5" />
            <rect x="34" y="20" width="16" height="24" rx="4" fill="#1b4332" stroke="#40916c" strokeWidth="1.5" />
            <circle cx="22" cy="32" r="3" fill="#74c69d" />
            <circle cx="42" cy="32" r="3" fill="#95d5b2" />
          </svg>
          <span className="absolute -bottom-1 -right-1 bg-[#10b981] text-[#052e16] text-[9px] font-black px-1.5 py-0.2 rounded-md shadow-sm">
            MIN
          </span>
        </div>
      </div>
    );
  }

  // 3. VERDE: LARGOS
  if (normType.includes("largo")) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <div className="relative flex size-16 items-center justify-center rounded-2xl bg-gradient-to-b from-[#1c2e24] to-[#121a15] border border-[#10b981]/30 shadow-lg shadow-[#10b981]/10">
          <svg viewBox="0 0 64 64" className="size-11 drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="18" y="10" width="10" height="44" rx="5" fill="#2d6a4f" stroke="#52b788" strokeWidth="1.5" />
            <rect x="36" y="10" width="10" height="44" rx="5" fill="#1b4332" stroke="#52b788" strokeWidth="1.5" />
            <line x1="23" y1="16" x2="23" y2="48" stroke="#74c69d" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" />
            <line x1="41" y1="16" x2="41" y2="48" stroke="#95d5b2" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" />
          </svg>
          <span className="absolute -bottom-1 -right-1 bg-[#10b981] text-[#052e16] text-[9px] font-black px-1.5 py-0.2 rounded-md shadow-sm">
            LRG
          </span>
        </div>
      </div>
    );
  }

  // 4. VERDE: PROMO
  if (normType.includes("promo")) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <div className="relative flex size-16 items-center justify-center rounded-2xl bg-gradient-to-b from-[#2e261a] to-[#1a150e] border border-[#f59e0b]/40 shadow-lg shadow-[#f59e0b]/10">
          <svg viewBox="0 0 64 64" className="size-11 drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M32 10L37.5 23.5L52 24.5L41 34.5L44.5 49L32 41.5L19.5 49L23 34.5L12 24.5L26.5 23.5L32 10Z" fill="#d97706" stroke="#fbbf24" strokeWidth="2" />
          </svg>
          <span className="absolute -bottom-1 -right-1 bg-[#f59e0b] text-[#451a03] text-[9px] font-black px-1.5 py-0.2 rounded-md shadow-sm">
            PROMO
          </span>
        </div>
      </div>
    );
  }

  // 5. BLANCO: BALDES
  if (normType.includes("balde")) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <div className="relative flex size-16 items-center justify-center rounded-2xl bg-gradient-to-b from-[#252830] to-[#14161b] border border-white/20 shadow-lg">
          <svg viewBox="0 0 64 64" className="size-11 drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="32" cy="18" rx="18" ry="5" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="2" />
            <path d="M14 18L18 48C18 51.5 24.3 54 32 54C39.7 54 46 51.5 46 48L50 18" fill="#94a3b8" stroke="#cbd5e1" strokeWidth="2" />
            <path d="M14 22C14 22 20 10 32 10C44 10 50 22 50 22" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="absolute -bottom-1 -right-1 bg-white text-black text-[9px] font-black px-1.5 py-0.2 rounded-md shadow-sm">
            BLD
          </span>
        </div>
      </div>
    );
  }

  // 6. BLANCO: MAMITAS
  if (normType.includes("mamita")) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <div className="relative flex size-16 items-center justify-center rounded-2xl bg-gradient-to-b from-[#2e1d24] to-[#1a1014] border border-[#fb7185]/30 shadow-lg shadow-[#fb7185]/10">
          <svg viewBox="0 0 64 64" className="size-11 drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="18" y="16" width="28" height="36" rx="8" fill="#e11d48" stroke="#fda4af" strokeWidth="2" />
            <circle cx="32" cy="30" r="7" fill="#ffe4e6" />
            <path d="M25 44C25 40 28 38 32 38C36 38 39 40 39 44" stroke="#ffe4e6" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="absolute -bottom-1 -right-1 bg-[#fb7185] text-[#4c0519] text-[9px] font-black px-1.5 py-0.2 rounded-md shadow-sm">
            MAM
          </span>
        </div>
      </div>
    );
  }

  // 7. BLANCO: TORNILLOS
  if (normType.includes("tornillo")) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <div className="relative flex size-16 items-center justify-center rounded-2xl bg-gradient-to-b from-[#252830] to-[#14161b] border border-white/20 shadow-lg">
          <svg viewBox="0 0 64 64" className="size-11 drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="22" y="12" width="20" height="8" rx="2" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
            <path d="M26 20V48L32 54L38 48V20H26Z" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2" />
            <line x1="26" y1="28" x2="38" y2="30" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
            <line x1="26" y1="36" x2="38" y2="38" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
            <line x1="26" y1="44" x2="38" y2="46" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="absolute -bottom-1 -right-1 bg-white text-black text-[9px] font-black px-1.5 py-0.2 rounded-md shadow-sm">
            TRN
          </span>
        </div>
      </div>
    );
  }

  // DEFAULT
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <div className="relative flex size-16 items-center justify-center rounded-2xl bg-[#18181e] border border-white/10 shadow-lg">
        <svg viewBox="0 0 64 64" className="size-9 opacity-80" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 20L32 10L52 20L32 30L12 20Z" fill="#26262e" />
          <path d="M12 20V44L32 54V30L12 20Z" fill="#1c1c24" />
          <path d="M52 20V44L32 54V30L52 20Z" fill="#15151c" />
        </svg>
      </div>
    </div>
  );
}
