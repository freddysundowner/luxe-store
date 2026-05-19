import { Link } from "wouter";
import { Product } from "@workspace/api-client-react";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";

const TAG_CONFIG: Record<string, { label: string; color: string; textColor: string }> = {
  new:         { label: "New",          color: "#D4AF37", textColor: "#000" },
  sale:        { label: "Sale",         color: "#ef4444", textColor: "#fff" },
  hot:         { label: "Hot",          color: "#f97316", textColor: "#fff" },
  bestseller:  { label: "Bestseller",   color: "#3b82f6", textColor: "#fff" },
  limited:     { label: "Limited",      color: "#8b5cf6", textColor: "#fff" },
  coming_soon: { label: "Coming Soon",  color: "#71717a", textColor: "#fff" },
};

export function ProductCard({ product }: { product: Product }) {
  const { addItem, openCart } = useCart();
  const { toast } = useToast();

  const activeVariants = (product.variants ?? []).filter((v) => v.isActive);
  const hasVariants = activeVariants.length > 0;

  // `stockQuantity` of exactly 0 means sold out (vs `null`/`undefined`, which
  // is "not tracked" and treated as available). Mirrors the rule used in the
  // mobile feed and Quick Buy dialog so the desktop grid stays consistent.
  const isSoldOut = !product.inStock || product.stockQuantity === 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isSoldOut || hasVariants) return;
    addItem(product, { quantity: 1 });
    openCart();
  };

  const formatter = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 });

  // "From KSh X" pricing: collect every active variant's effective price and
  // show the minimum with a "from" prefix when the variants disagree on price.
  const variantPrices = activeVariants.map((v) => (v.price ?? product.price));
  const distinctPrices = new Set(variantPrices);
  const showFromPrice = hasVariants && distinctPrices.size > 1;
  const displayPrice = showFromPrice ? Math.min(...variantPrices) : product.price;

  const tag = product.availabilityTag ? TAG_CONFIG[product.availabilityTag] : null;

  return (
    <Link href={`/product/${product.id}`}>
      <div className="group cursor-pointer">
        <div className="relative aspect-[4/5] overflow-hidden bg-zinc-900 border border-zinc-900 group-hover:border-[#D4AF37]/40 transition-colors duration-500 mb-3">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-700 ease-out opacity-85 group-hover:opacity-100 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900">
              <ShoppingBag className="w-8 h-8 text-zinc-700" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-50 pointer-events-none" />

          {/* Shimmer */}
          <div
            className="absolute inset-y-0 w-1/3 pointer-events-none opacity-0 group-hover:opacity-100 -left-1/3 group-hover:left-full"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.15), transparent)",
              transition: "left 0.75s ease-out, opacity 0.05s",
            }}
          />

          {isSoldOut && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
              <span className="text-xs uppercase tracking-widest text-zinc-300 px-3 py-1 border border-zinc-700">Sold Out</span>
            </div>
          )}

          {/* Availability tag badge — top right */}
          {tag && !isSoldOut && (
            <div
              className="absolute top-2 right-2 px-2 py-0.5 text-[10px] uppercase tracking-widest font-semibold"
              style={{ background: tag.color, color: tag.textColor }}
            >
              {tag.label}
            </div>
          )}

          {/* Fallback: show Sale badge only when no custom tag is set */}
          {!tag && product.originalPrice && product.originalPrice > product.price && !isSoldOut && (
            <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/80 border border-[#D4AF37]/30 text-[10px] uppercase tracking-widest text-[#D4AF37]">
              Sale
            </div>
          )}

          {!isSoldOut && (
            <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out">
              <button
                onClick={handleAddToCart}
                className="w-full py-3 bg-[#D4AF37] text-black text-[11px] uppercase tracking-widest font-medium hover:bg-white transition-colors"
              >
                {hasVariants ? "Choose Options" : "Add to Bag"}
              </button>
            </div>
          )}
        </div>

        <div className="px-0.5 space-y-1">
          {product.categoryName && (
            <p className="text-[10px] uppercase tracking-widest text-zinc-600">{product.categoryName}</p>
          )}
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-light text-zinc-100 uppercase tracking-wide leading-snug group-hover:text-[#D4AF37] transition-colors line-clamp-2 flex-1">
              {product.name}
            </h3>
            <div className="text-right shrink-0">
              <div className="text-sm text-[#D4AF37] font-medium">
                {showFromPrice && <span className="text-[10px] uppercase tracking-widest text-zinc-500 mr-1">From</span>}
                {formatter.format(displayPrice)}
              </div>
              {!showFromPrice && product.originalPrice && product.originalPrice > product.price && (
                <div className="text-xs text-zinc-600 line-through">{formatter.format(product.originalPrice)}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
