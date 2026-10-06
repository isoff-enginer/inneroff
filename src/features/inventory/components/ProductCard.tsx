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
      className={`relative flex flex-col justify-between p-4 rounded-[26px] transition-all cursor-pointer border ${
        isSelected
          ? "bg-[#FEF08A] border-amber-300 shadow-sm"
          : "bg-[#F5F4F0] hover:bg-[#EFECE6] border-transparent"
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
          className={`size-5 rounded-full flex items-center justify-center transition-colors border ${
            isSelected
              ? "bg-black border-black text-white"
              : "border-gray-300 bg-white/80 hover:border-gray-400"
          }`}
        >
          {isSelected && <Check className="size-3 stroke-[3]" />}
        </button>

        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
          {product.category}
        </span>
      </div>

      {/* Center 3D Image Asset */}
      <div className="my-2 flex items-center justify-center">
        <ProductVisualIcon type={product.imageType || product.name} className="size-20" />
      </div>

      {/* Product Details */}
      <div className="mt-1 flex flex-col gap-1">
        <h3 className="text-[15px] font-bold text-gray-900 leading-tight truncate">
          {product.name}
        </h3>

        {/* Presentation & Price */}
        <div className="flex items-baseline justify-between gap-1">
          <span className="text-[14px] font-black text-gray-900 tabular">
            ${priceDisplay.toLocaleString()}
          </span>
          {currentPres && (
            <span className="text-[10px] font-bold text-gray-500 uppercase">
              /{currentPres.label}
            </span>
          )}
        </div>

        {/* Presentation Dropdown if available */}
        {product.presentations.length > 1 && (
          <div className="mt-1" onClick={(e) => e.stopPropagation()}>
            <select
              value={selectedPresentation || product.presentations[0].name}
              onChange={(e) => onSelectPresentation?.(e.target.value)}
              className="w-full text-[11px] font-bold bg-white/80 border border-gray-200 rounded-lg px-2 py-1 outline-none text-gray-700"
            >
              {product.presentations.map(p => (
                <option key={p.name} value={p.name}>
                  {p.label} - ${p.price.toLocaleString()}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Stock Badge */}
        <div className="mt-2">
          <span className="inline-block bg-emerald-100/90 text-emerald-800 text-[10px] font-bold rounded-full px-2.5 py-0.5 select-none">
            In stock: {product.stock}
          </span>
        </div>
      </div>
    </div>
  );
}
