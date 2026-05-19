import { useState } from "react";
import { Link } from "wouter";
import { Product } from "@workspace/api-client-react";
import { ShoppingBag } from "lucide-react";
import { isProductSoldOut } from "@/lib/stock";
import { Gift } from "lucide-react";
import { ProductImage, getImageSettings } from "@/components/ProductImage";
import { BundleBoxCover } from "@/components/BundleBoxCover";
import { QuickBuyDialog } from "@/components/QuickBuyDialog";
import { GiftSheet } from "@/components/GiftSheet";

// Hoist the formatter so we allocate it once per app, not once per card per
// render — the grid can have 30+ cards and rerenders during scroll.
const PRICE_FMT = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 });

const TAG_CONFIG: Record<string, { label: string; color: string; textColor: string }> = {
  new:         { label: "New",          color: "#D4AF37", textColor: "#000" },
  sale:        { label: "Sale",         color: "#ef4444", textColor: "#fff" },
  hot:         { label: "Hot",          color: "#f97316", textColor: "#fff" },
  bestseller:  { label: "Bestseller",   color: "#3b82f6", textColor: "#fff" },
  limited:     { label: "Limited",      color: "#8b5cf6", textColor: "#fff" },
  coming_soon: { label: "Coming Soon",  color: "#71717a", textColor: "#fff" },
};

export function ProductCard({
  product,
  onSelect,
}: {
  product: Product;
  /**
   * When provided, clicking the card calls `onSelect(product)` instead of
   * navigating to the product details page. Used on desktop home so the right
   * column "feeds" the centre TikTok-style swiper. The inner Add-to-Bag
   * button still works because it calls `e.stopPropagation()`.
   */
  onSelect?: (product: Product) => void;
}) {
  const [quickBuyOpen, setQuickBuyOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);

  const isBundle = product.kind === "bundle";
  const activeVariants = (product.variants ?? []).filter((v) => v.isActive);
  const hasVariants = !isBundle && activeVariants.length > 0;

  const isSoldOut = isProductSoldOut(product);

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    // Prevent the click from bubbling to the card wrapper. In onSelect mode
    // the wrapper is a div with onClick that would otherwise re-select the
    // featured product when the user clicks Buy Now.
    e.stopPropagation();
    if (isSoldOut) return;
    if (isBundle) {
      // Bundles are always purchased as gifts — open the gift sheet
      // (preview → form → pay → share).
      setGiftOpen(true);
      return;
    }
    setQuickBuyOpen(true);
  };

  // "From KSh X" pricing: collect every active variant's effective price and
  // show the minimum with a "from" prefix when the variants disagree on price.
  const variantPrices = activeVariants.map((v) => (v.price ?? product.price));
  const distinctPrices = new Set(variantPrices);
  const showFromPrice = hasVariants && distinctPrices.size > 1;
  const displayPrice = showFromPrice ? Math.min(...variantPrices) : product.price;

  const tag = product.availabilityTag ? TAG_CONFIG[product.availabilityTag] : null;

  const inner = (
    <div className="group cursor-pointer">
        <div className="relative aspect-[4/5] overflow-hidden bg-zinc-900 border border-zinc-900 group-hover:border-[#D4AF37]/40 transition-colors duration-500 mb-3">
          {product.imageUrl ? (
            <ProductImage
              src={product.imageUrl}
              alt={product.name}
              settings={getImageSettings(product.imageUrl, product.imageSettings)}
              className="absolute inset-0"
              imgClassName="transition-transform duration-700 ease-out opacity-85 group-hover:opacity-100 group-hover:scale-105"
              showFallback={false}
            />
          ) : isBundle && (product.bundleProducts ?? []).some((bp) => !!bp.imageUrl) ? (
            <BundleBoxCover
              alt={product.name}
              itemImages={(product.bundleProducts ?? []).map((bp) => bp.imageUrl)}
              className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900">
              <ShoppingBag className="w-8 h-8 text-zinc-700" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-50 pointer-events-none" />

          {/* Shimmer — uses transform (GPU-only) instead of `left` to avoid
              triggering layout on every hover. During desktop scroll the
              cursor passes over many cards; `left` transitions would each
              reflow the card. translateX is composited and free. */}
          <div
            className="absolute inset-y-0 left-0 w-1/3 pointer-events-none opacity-0 group-hover:opacity-100 -translate-x-full group-hover:translate-x-[400%]"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.15), transparent)",
              transition: "transform 0.75s ease-out, opacity 0.05s",
              willChange: "transform",
            }}
          />

          {isSoldOut && (
            <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
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
                onClick={handleBuyNow}
                className="w-full py-3 bg-[#D4AF37] text-black text-[11px] uppercase tracking-widest font-medium hover:bg-white transition-colors flex items-center justify-center gap-1.5"
              >
                {isBundle
                  ? <><Gift className="w-3 h-3" />Buy this gift →</>
                  : hasVariants ? "Choose Options →" : "Buy Now →"}
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
                {PRICE_FMT.format(displayPrice)}
              </div>
              {!showFromPrice && product.originalPrice && product.originalPrice > product.price && (
                <div className="text-xs text-zinc-600 line-through">{PRICE_FMT.format(product.originalPrice)}</div>
              )}
            </div>
          </div>
        </div>
      </div>
  );

  // QuickBuy modal lives alongside the card so Buy Now works wherever the
  // card is rendered (home grid, category page, related products) without
  // requiring each parent to wire up its own dialog instance.
  const quickBuy = (
    <>
      <QuickBuyDialog
        open={quickBuyOpen}
        onOpenChange={(o) => { if (!o) setQuickBuyOpen(false); }}
        product={product}
      />
      <GiftSheet open={giftOpen} product={giftOpen ? product : null} onClose={() => setGiftOpen(false)} />
    </>
  );

  if (onSelect) {
    return (
      <>
        <div
          role="button"
          tabIndex={0}
          onClick={() => onSelect(product)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(product);
            }
          }}
        >
          {inner}
        </div>
        {quickBuy}
      </>
    );
  }

  return (
    <>
      <Link href={`/product/${product.id}`}>{inner}</Link>
      {quickBuy}
    </>
  );
}
