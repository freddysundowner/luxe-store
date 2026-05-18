import { Link } from "wouter";
import { Product } from "@workspace/api-client-react";
import { ShoppingBag, Pin } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";

const NEW_THRESHOLD_DAYS = 30;

function isNew(createdAt?: string | null) {
  if (!createdAt) return false;
  return Date.now() - new Date(createdAt).getTime() < NEW_THRESHOLD_DAYS * 86400000;
}

export function ProductCard({ product }: { product: Product }) {
  const { addItem, openCart } = useCart();
  const { toast } = useToast();
  const productIsNew = isNew(product.createdAt);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!product.inStock) return;
    addItem(product, 1);
    openCart();
  };

  const formatter = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 });

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

          {!product.inStock && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
              <span className="text-xs uppercase tracking-widest text-zinc-300 px-3 py-1 border border-zinc-700">Sold Out</span>
            </div>
          )}

          {product.isFeatured && product.inStock && (
            <div className="absolute top-3 left-3 drop-shadow-[0_2px_6px_rgba(212,175,55,0.6)]" style={{ transform: "rotate(-35deg)" }}>
              <Pin className="w-4 h-4 fill-[#D4AF37] text-[#D4AF37]" />
            </div>
          )}

          {productIsNew && product.inStock && !product.isFeatured && (
            <div className="absolute top-0 left-0 overflow-hidden w-16 h-16 pointer-events-none">
              <div
                className="absolute bg-[#D4AF37] text-black text-[8px] font-bold uppercase tracking-widest text-center leading-none py-1"
                style={{ width: "72px", top: "14px", left: "-16px", transform: "rotate(-45deg)" }}
              >
                New
              </div>
            </div>
          )}

          {product.originalPrice && product.originalPrice > product.price && product.inStock && (
            <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/80 border border-[#D4AF37]/30 text-[10px] uppercase tracking-widest text-[#D4AF37]">
              Sale
            </div>
          )}

          {product.inStock && (
            <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out">
              <button
                onClick={handleAddToCart}
                className="w-full py-3 bg-[#D4AF37] text-black text-[11px] uppercase tracking-widest font-medium hover:bg-white transition-colors"
              >
                Add to Bag
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
              <div className="text-sm text-[#D4AF37] font-medium">{formatter.format(product.price)}</div>
              {product.originalPrice && product.originalPrice > product.price && (
                <div className="text-xs text-zinc-600 line-through">{formatter.format(product.originalPrice)}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
