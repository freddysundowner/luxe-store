import { useState, useCallback } from "react";
import { Link } from "wouter";
import { Heart, MessageCircle, Share2, ShoppingBag, Sparkles } from "lucide-react";
import { Product } from "@workspace/api-client-react";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

interface TikTokFeedProps {
  products: Product[];
  isLoading: boolean;
  onOpenGiftFinder?: () => void;
  topOffset?: number;
}

export function TikTokFeed({ products, isLoading, onOpenGiftFinder, topOffset = 12 }: TikTokFeedProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [cartAdded, setCartAdded] = useState<Set<number>>(new Set());
  const [touchStartY, setTouchStartY] = useState(0);
  const [isFading, setIsFading] = useState(false);

  const { addItem } = useCart();
  const { toast } = useToast();

  const navigate = useCallback(
    (dir: "up" | "down") => {
      if (isFading) return;
      if (dir === "up" && currentIndex >= products.length - 1) return;
      if (dir === "down" && currentIndex <= 0) return;
      setIsFading(true);
      setTimeout(() => {
        setCurrentIndex((i) => (dir === "up" ? i + 1 : i - 1));
        setIsFading(false);
      }, 150);
    },
    [isFading, currentIndex, products.length]
  );

  const toggleLike = (id: number) => {
    setLiked((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleAddToCart = (product: Product) => {
    addItem(product, 1);
    setCartAdded((prev) => new Set(prev).add(product.id));
    toast({ title: "Added to bag", description: `${product.name} added.`, duration: 2000 });
  };

  const handleShare = (product: Product) => {
    const url = `${window.location.origin}/product/${product.id}`;
    if (navigator.share) {
      navigator.share({ title: product.name, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: "Link copied!", duration: 1500 });
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 bg-[#0a0a0a]">
        <Skeleton className="w-full h-full bg-zinc-900" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex-1 bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-12 h-12 text-zinc-800 mx-auto mb-3" />
          <p className="text-zinc-600 text-sm uppercase tracking-widest">No products</p>
        </div>
      </div>
    );
  }

  const current = products[currentIndex];
  const visibleDots = Math.min(products.length, 8);

  return (
    <div
      className="flex-1 relative overflow-hidden bg-black"
      style={{ touchAction: "none" }}
      onTouchStart={(e) => setTouchStartY(e.touches[0].clientY)}
      onTouchEnd={(e) => {
        const diff = touchStartY - e.changedTouches[0].clientY;
        if (Math.abs(diff) > 45) navigate(diff > 0 ? "up" : "down");
      }}
    >
      {/* Full-screen image */}
      <div
        className="absolute inset-0 transition-opacity duration-150"
        style={{ opacity: isFading ? 0 : 1 }}
      >
        {current.imageUrl ? (
          <img
            key={current.id}
            src={current.imageUrl}
            alt={current.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
            <ShoppingBag className="w-16 h-16 text-zinc-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-[#0a0a0a]/40" />
      </div>

      {/* Progress bar — top */}
      <div className="absolute left-4 right-4 flex gap-1 z-10" style={{ top: `${topOffset}px` }}>
        {Array.from({ length: visibleDots }).map((_, i) => (
          <button
            key={i}
            onClick={() => !isFading && setCurrentIndex(i)}
            className="flex-1 h-0.5 rounded-full transition-all"
            style={{
              background:
                i === currentIndex
                  ? "#D4AF37"
                  : i < currentIndex
                  ? "rgba(212,175,55,0.35)"
                  : "rgba(255,255,255,0.15)",
            }}
          />
        ))}
      </div>

      {/* Counter */}
      <div className="absolute left-4 right-4 z-10 flex justify-between items-center" style={{ top: `${topOffset + 14}px` }}>
        <span className="text-[10px] text-white/30 uppercase tracking-widest">
          {currentIndex + 1} / {products.length}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => navigate("down")}
            disabled={currentIndex <= 0}
            className="w-7 h-7 flex items-center justify-center text-white/25 hover:text-white/60 disabled:opacity-10 transition-colors text-sm"
          >
            ↑
          </button>
          <button
            onClick={() => navigate("up")}
            disabled={currentIndex >= products.length - 1}
            className="w-7 h-7 flex items-center justify-center text-white/25 hover:text-white/60 disabled:opacity-10 transition-colors text-sm"
          >
            ↓
          </button>
        </div>
      </div>

      {/* Right-side action buttons */}
      <div
        className="absolute right-3 z-10 flex flex-col gap-4"
        style={{ bottom: "210px" }}
      >
        <button onClick={() => toggleLike(current.id)} className="flex flex-col items-center gap-1">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 ${
              liked.has(current.id)
                ? "bg-red-500 scale-110"
                : "bg-black/50 backdrop-blur-sm border border-white/10"
            }`}
          >
            <Heart
              className={`w-5 h-5 transition-all ${
                liked.has(current.id) ? "fill-white text-white" : "text-white"
              }`}
            />
          </div>
          <span className="text-[9px] text-white/35">
            {liked.has(current.id) ? "1" : "0"}
          </span>
        </button>

        <Link href={`/product/${current.id}`} className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-xl hover:border-[#D4AF37]/40 transition-colors">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <span className="text-[9px] text-white/35">View</span>
        </Link>

        <button onClick={() => handleShare(current)} className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-xl hover:border-[#D4AF37]/40 transition-colors">
            <Share2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-[9px] text-white/35">Share</span>
        </button>

        {onOpenGiftFinder && (
          <button onClick={onOpenGiftFinder} className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center shadow-xl">
              <Sparkles className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <span className="text-[9px] text-[#D4AF37]/55">AI</span>
          </button>
        )}
      </div>

      {/* Swipe hint */}
      {currentIndex < products.length - 1 && (
        <div
          className="absolute left-0 right-0 z-10 flex justify-center pointer-events-none"
          style={{ bottom: "197px" }}
        >
          <div className="flex flex-col items-center gap-1 animate-bounce">
            <span className="text-white text-base drop-shadow-lg">↑</span>
            <span className="text-[11px] text-white/90 tracking-widest font-medium drop-shadow-lg uppercase">swipe up</span>
          </div>
        </div>
      )}

      {/* Right progress bar */}
      <div className="absolute right-0 top-16 bottom-16 w-0.5 bg-white/5 z-10">
        <div
          className="bg-[#D4AF37]/50 w-full rounded-full transition-all duration-300"
          style={{ height: `${((currentIndex + 1) / products.length) * 100}%` }}
        />
      </div>

      {/* Bottom info panel */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 px-5 pt-14 pb-5 transition-opacity duration-150"
        style={{
          background:
            "linear-gradient(to top, rgba(10,10,10,1) 65%, rgba(10,10,10,0) 100%)",
          opacity: isFading ? 0 : 1,
        }}
      >
        <div className="flex gap-2 mb-2">
          {current.originalPrice != null && current.originalPrice > current.price && (
            <span className="text-[9px] border border-[#D4AF37]/40 text-[#D4AF37] px-2 py-0.5 uppercase tracking-wider">
              Sale
            </span>
          )}
          {!current.inStock && (
            <span className="text-[9px] border border-zinc-700 text-zinc-500 px-2 py-0.5 uppercase tracking-wider">
              Sold Out
            </span>
          )}
        </div>

        {current.categoryName && (
          <p className="text-[9px] uppercase tracking-widest text-[#D4AF37]/60 mb-1">
            {current.categoryName}
          </p>
        )}

        <Link href={`/product/${current.id}`}>
          <h2 className="text-lg font-light uppercase tracking-wide text-white mb-2 leading-snug hover:text-[#D4AF37] transition-colors cursor-pointer">
            {current.name}
          </h2>
        </Link>

        <div className="flex items-baseline gap-3 mb-4">
          <span className="text-2xl text-[#D4AF37] font-light">{fmt.format(current.price)}</span>
          {current.originalPrice != null && current.originalPrice > current.price && (
            <span className="text-zinc-600 line-through text-sm">
              {fmt.format(current.originalPrice)}
            </span>
          )}
        </div>

        <button
          onClick={() => current.inStock && handleAddToCart(current)}
          disabled={!current.inStock}
          className={`w-full py-3.5 text-sm uppercase tracking-widest font-semibold transition-all duration-200 ${
            !current.inStock
              ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
              : cartAdded.has(current.id)
              ? "bg-zinc-800 text-[#D4AF37] border border-[#D4AF37]/40"
              : "bg-[#D4AF37] text-black hover:bg-white"
          }`}
        >
          {!current.inStock
            ? "Sold Out"
            : cartAdded.has(current.id)
            ? "✓ Added to Bag"
            : "Add to Bag →"}
        </button>

        <div className="flex justify-center gap-1.5 mt-4">
          {Array.from({ length: visibleDots }).map((_, i) => (
            <button
              key={i}
              onClick={() => !isFading && setCurrentIndex(i)}
              className={`rounded-full transition-all duration-300 ${
                i === currentIndex ? "w-5 h-1.5 bg-[#D4AF37]" : "w-1.5 h-1.5 bg-white/15"
              }`}
            />
          ))}
          {products.length > 8 && (
            <span className="text-white/15 text-xs leading-none">···</span>
          )}
        </div>
      </div>

      {/* Tap zones for navigation */}
      <div
        className="absolute inset-x-0 z-5 pointer-events-none"
        style={{ top: "60px", bottom: "250px" }}
      >
        <div className="flex h-full pointer-events-auto">
          <div className="flex-1 cursor-pointer" onClick={() => navigate("down")} />
          <div className="w-16 pointer-events-none" />
          <div className="flex-1 cursor-pointer" onClick={() => navigate("up")} />
        </div>
      </div>
    </div>
  );
}
