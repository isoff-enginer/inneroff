import React from "react";
import { Check } from "lucide-react";
import { ProductVisualIcon } from "./ProductVisualIcon";
import type { CatalogProduct } from "../product-catalog";

interface ProductCardProps {
  product: CatalogProduct;
  isSelected?: boolean;
  onToggleSelect?: (product: CatalogProduct) => void;
  onClick?: (product: CatalogProduct) => void;
  selectedPresentation?: string;
  onSelectPresentation?: (presentationName: string) => void;
}

export function ProductCard({
  product,
  isSelected = false,
  onToggleSelect,
  onClick,
  selectedPresentation,
  onSelectPresentation,
}: ProductCardProps) {
  const currentPres = product.presentations.find(p => p.name === selectedPresentation) || product.presentations[0];
  const priceDisplay = currentPres ? currentPres.price : product.defaultPrice;

  return (
    <div
      onClick={() => {
        if (onToggleSelect) {
          onToggleSelect(product);
        } else if (onClick) {
          onClick(product);
        }
      }}
      className={`relative flex flex-col justify-between p-4 rounded-[26px] transition-all cursor-pointer border backdrop-blur-md ${
        isSelected
          ? "bg-[#372b53] border-[#246bfd] shadow-lg shadow-[#246bfd]/20 ring-1 ring-[#246bfd]"
          : "bg-[#2d2244]/90 hover:bg-[#34274e] border-white/[0.07] shadow-md"
      }`}
    >
      {/* Top row: Selection circle & Category Tag */}
      <div className="flex items-center justify-between mb-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.(product);
          }}
          className={`size-5 rounded-full flex items-center justify-center transition-all border ${
            isSelected
              ? "bg-[#246bfd] border-[#246bfd] text-white shadow-sm shadow-[#246bfd]/50"
              : "border-white/20 bg-white/5 hover:border-white/40"
          }`}
        >
          {isSelected && <Check className="size-3 stroke-[3]" />}
        </button>

        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
          product.category === "Verde"
            ? "bg-[#8ec97b]/20 text-[#8ec97b] border border-[#8ec97b]/30"
            : "bg-[#f79193]/20 text-[#f79193] border border-[#f79193]/30"
        }`}>
          {product.category}
        </span>
      </div>

      {/* Center 3D/iOS Icon Asset */}
      <div className="my-2 flex items-center justify-center">
        <ProductVisualIcon type={product.imageType || product.name} className="size-16" />
      </div>

      {/* Product Details */}
      <div className="mt-1 flex flex-col gap-1">
        <h3 className="text-[15px] font-bold text-white leading-tight truncate">
          {product.name}
        </h3>

        {/* Presentation & Price */}
        <div className="flex items-baseline justify-between gap-1">
          <span className="text-[15px] font-black text-white tabular">
            ${priceDisplay.toLocaleString()}
          </span>
          {currentPres && (
            <span className="text-[10px] font-bold text-[#a497be] uppercase">
              /{currentPres.label}
            </span>
          )}
        </div>

        {/* Presentation Dropdown */}
        {product.presentations.length > 1 && (
          <div className="mt-1" onClick={(e) => e.stopPropagation()}>
            <select
              value={selectedPresentation || product.presentations[0].name}
              onChange={(e) => onSelectPresentation?.(e.target.value)}
              className="w-full text-[11px] font-bold bg-[#231934] border border-white/10 rounded-xl px-2.5 py-1.5 outline-none text-white focus:border-[#246bfd] transition-colors"
            >
              {product.presentations.map(p => (
                <option key={p.name} value={p.name} className="bg-[#231934] text-white">
                  {p.label} - ${p.price.toLocaleString()}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Stock Badge */}
        <div className="mt-2 flex items-center justify-between">
          <span className="inline-block bg-[#8ec97b]/15 text-[#8ec97b] border border-[#8ec97b]/25 text-[10px] font-bold rounded-full px-2.5 py-0.5 select-none">
            Stock: {product.stock}
          </span>
        </div>
      </div>
    </div>
  );
}
