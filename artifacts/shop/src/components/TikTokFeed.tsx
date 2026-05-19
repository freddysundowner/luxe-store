import { useState, useCallback, useRef, useEffect } from "react";
import { Link } from "wouter";
import { Gift, Heart, MessageCircle, Share2, ShoppingBag, Sparkles, X, Send, SlidersHorizontal, Droplets } from "lucide-react";
import { Product, useGetSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { useCart } from "@/lib/cart-context";
import { useFavorites } from "@/lib/favorites-context";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyFeed } from "@/components/EmptyFeed";
import { ShareDialog, isCoarsePointer, type ShareTarget } from "@/components/ShareDialog";
import { QuickBuyDialog } from "@/components/QuickBuyDialog";

const fmt = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 });

interface TikTokFeedProps {
  products: Product[];
  isLoading: boolean;
  onOpenGiftFinder?: () => void;
  onOpenFilters?: () => void;
  topOffset?: number;
}

// Duration (ms) for the top progress bar before the drop icon reveals on a
// single-image product. Multi-image products use PER_IMAGE_MS_MULTI per
// segment instead, so longer galleries don't blur past too fast.
const PROGRESS_DURATION_MS = 5000;
const PER_IMAGE_MS_MULTI = 3000;

// Pull a product's gallery, falling back to the legacy single cover image so
// the feed keeps working for rows that pre-date the `images` column.
function getImages(product: Product): string[] {
  const arr = (product as Product & { images?: string[] | null }).images;
  if (arr && arr.length > 0) return arr;
  return product.imageUrl ? [product.imageUrl] : [];
}

// ── Card background (image + gradient) ───────────────────────────────────────
function CardBg({ product, imageIndex = 0 }: { product: Product; imageIndex?: number }) {
  const images = getImages(product);
  const src = images[Math.min(imageIndex, images.length - 1)] ?? null;
  return (
    <>
      {src ? (
        <img
          key={src}
          src={src}
          alt={product.name}
          className="absolute inset-0 w-full h-full object-cover animate-in fade-in duration-300"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
          <ShoppingBag className="w-16 h-16 text-zinc-700" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-[#0a0a0a]/40" />
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function TikTokFeed({ products, isLoading, onOpenGiftFinder, onOpenFilters, topOffset = 12 }: TikTokFeedProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cartAdded, setCartAdded] = useState<Set<number>>(new Set());
  const [giftProduct, setGiftProduct] = useState<Product | null>(null);
  const [giftRecipient, setGiftRecipient] = useState("");
  const [giftNote, setGiftNote] = useState("");

  // ── Slide animation state ──
  const [dragOffset, setDragOffset] = useState(0);       // px, follows finger live
  const [isAnimating, setIsAnimating] = useState(false); // true during snap/complete
  const [slideDir, setSlideDir] = useState<"up" | "down" | null>(null);
  const touchStartY = useRef(0);
  const liveOffset = useRef(0); // mirror of dragOffset for use inside handlers
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerH, setContainerH] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerH(el.clientHeight));
    ro.observe(el);
    setContainerH(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  const vh = containerH || (typeof window !== "undefined" ? window.innerHeight : 700);

  useCart(); // cart context kept mounted (drawer reads it)
  const { toggleFavorite, isFavorite } = useFavorites();
  const { toast } = useToast();
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });

  // Clamp currentIndex when the products list shrinks (e.g. user changes a
  // filter and the previously-current item is no longer in the result set).
  useEffect(() => {
    if (currentIndex > products.length - 1) {
      setCurrentIndex(Math.max(0, products.length - 1));
    }
  }, [products.length, currentIndex]);

  // ── Stories-style segmented progress bar.
  // For each product we walk through its images one at a time. The top bar
  // splits into one segment per image; the current segment fills left→right,
  // earlier segments stay full, later ones stay empty. Once the last segment
  // completes, the gold "drop" icon fades in (matches the desktop look).
  // All segment + done state resets when the user moves to a different
  // product (by id, so filter changes also reset).
  const activeProduct = products[currentIndex] ?? null;
  const activeProductId = activeProduct?.id ?? null;
  const activeImages = activeProduct ? getImages(activeProduct) : [];
  const segmentCount = Math.max(1, activeImages.length);
  const perSegmentMs = segmentCount === 1 ? PROGRESS_DURATION_MS : PER_IMAGE_MS_MULTI;

  const [imageIndex, setImageIndex] = useState(0);
  const [progressDone, setProgressDone] = useState(false);

  // Reset to first image whenever the active product changes.
  useEffect(() => {
    setImageIndex(0);
    setProgressDone(false);
  }, [activeProductId]);

  // Drive segment advance. When the current segment finishes, either move to
  // the next image or — on the final segment — mark progressDone (revealing
  // the drop icon). We re-arm whenever activeProductId or imageIndex changes.
  useEffect(() => {
    if (activeProductId == null) return;
    const isLast = imageIndex >= segmentCount - 1;
    const t = setTimeout(() => {
      if (isLast) {
        setProgressDone(true);
      } else {
        setImageIndex((i) => i + 1);
      }
    }, perSegmentMs);
    return () => clearTimeout(t);
  }, [activeProductId, imageIndex, segmentCount, perSegmentMs]);

  // Tap left/right halves of the image to skip between segments manually.
  const skipImage = useCallback((dir: 1 | -1) => {
    setProgressDone(false);
    setImageIndex((i) => {
      const next = i + dir;
      if (next < 0) return 0;
      if (next > segmentCount - 1) return segmentCount - 1;
      return next;
    });
  }, [segmentCount]);

  // ── Complete a slide programmatically (button / tap zone) ──
  const triggerSlide = useCallback((dir: "up" | "down") => {
    if (isAnimating) return;
    if (dir === "up" && currentIndex >= products.length - 1) return;
    if (dir === "down" && currentIndex <= 0) return;

    setSlideDir(dir);
    setIsAnimating(true);
    // Jump to final offset instantly so transition runs from there
    setDragOffset(0);
    // Give React one frame then snap to final position
    requestAnimationFrame(() => {
      setDragOffset(dir === "up" ? -vh : vh);
      setTimeout(() => {
        setCurrentIndex((i) => (dir === "up" ? i + 1 : i - 1));
        setDragOffset(0);
        setIsAnimating(false);
        setSlideDir(null);
        liveOffset.current = 0;
      }, 300);
    });
  }, [isAnimating, currentIndex, products.length, vh]);

  // ── Touch handlers ──
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isAnimating) return;
    touchStartY.current = e.touches[0].clientY;
    liveOffset.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isAnimating) return;
    const diff = e.touches[0].clientY - touchStartY.current;
    // Block at boundaries
    if (diff < 0 && currentIndex >= products.length - 1) return;
    if (diff > 0 && currentIndex <= 0) return;
    liveOffset.current = diff;
    setDragOffset(diff);
    setSlideDir(diff < 0 ? "up" : diff > 0 ? "down" : null);
  };

  const handleTouchEnd = () => {
    if (isAnimating) return;
    const offset = liveOffset.current;
    const threshold = vh * 0.22;

    if (Math.abs(offset) > threshold) {
      const dir = offset < 0 ? "up" : "down";
      const canGo = dir === "up"
        ? currentIndex < products.length - 1
        : currentIndex > 0;

      if (canGo) {
        // Complete the swipe
        setIsAnimating(true);
        setDragOffset(dir === "up" ? -vh : vh);
        setTimeout(() => {
          setCurrentIndex((i) => (dir === "up" ? i + 1 : i - 1));
          setDragOffset(0);
          setIsAnimating(false);
          setSlideDir(null);
          liveOffset.current = 0;
        }, 280);
        return;
      }
    }

    // Snap back
    setIsAnimating(true);
    setDragOffset(0);
    setTimeout(() => {
      setIsAnimating(false);
      setSlideDir(null);
      liveOffset.current = 0;
    }, 280);
  };

  // ── Wheel (desktop scroll) ──
  const wheelCooldown = useRef(false);
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (isAnimating || wheelCooldown.current) return;
    if (Math.abs(e.deltaY) < 20) return;
    const dir = e.deltaY > 0 ? "up" : "down";
    triggerSlide(dir);
    wheelCooldown.current = true;
    setTimeout(() => { wheelCooldown.current = false; }, 600);
  }, [isAnimating, triggerSlide]);

  // ── Cart / gift / share ──
  const [quickBuyProduct, setQuickBuyProduct] = useState<Product | null>(null);

  const handleAddToCart = (product: Product) => {
    // Open the QuickBuy modal: it asks for variant (if any) + quantity and
    // jumps straight to checkout. No more cart drawer review step.
    setQuickBuyProduct(product);
    setCartAdded((prev) => new Set(prev).add(product.id));
  };

  const handleGift = () => {
    import("@/lib/gift-finder-trigger").then(m => m.triggerGiftFinder());
  };

  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);

  const handleShare = (product: Product) => {
    const url = `${window.location.origin}/product/${product.id}`;
    // Native share sheet on touch devices; custom modal on desktop.
    if (isCoarsePointer() && navigator.share) {
      navigator.share({ title: product.name, url }).catch(() => {});
      return;
    }
    setShareTarget({ title: product.name, url });
  };

  const openGiftSheet = (product: Product) => {
    setGiftProduct(product);
    setGiftRecipient("");
    setGiftNote("");
  };

  const sendGiftViaWhatsApp = () => {
    if (!giftProduct) return;
    const storeName = settings?.storeName || "Luxe Store";
    const price = fmt.format(giftProduct.price);
    const to = giftRecipient.trim() ? giftRecipient.trim() : "you";
    const params = new URLSearchParams();
    if (giftRecipient.trim()) params.set("recipient", giftRecipient.trim());
    if (giftNote.trim()) params.set("note", giftNote.trim());
    params.set("store", storeName);
    const giftUrl = `${window.location.origin}/gift/${giftProduct.id}?${params.toString()}`;
    const notePreview = giftNote.trim() ? `\n\n"${giftNote.trim()}"` : "";
    const message =
      `🎁 Hey ${to}! I'd love to gift you something special.\n\n` +
      `*${giftProduct.name}*\n${price} — from ${storeName}${notePreview}\n\n` +
      `Unwrap your gift here: ${giftUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
    setGiftProduct(null);
  };

  // ── Loading / empty ──
  if (isLoading) {
    return <div className="flex-1 bg-[#0a0a0a]"><Skeleton className="w-full h-full bg-zinc-900" /></div>;
  }
  if (products.length === 0) {
    return (
      <div className="flex-1 bg-[#0a0a0a] flex items-center justify-center">
        <EmptyFeed message="No matches" sub="Adjust your filters to explore the collection" />
      </div>
    );
  }

  const current = products[currentIndex];

  // The "adjacent" card that slides in/out alongside the current card
  const adjacentIndex = slideDir === "up"
    ? currentIndex + 1
    : slideDir === "down"
    ? currentIndex - 1
    : null;
  const adjacentProduct = adjacentIndex !== null ? products[adjacentIndex] : null;

  // CSS transform helpers
  const transition = isAnimating
    ? "transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)"
    : "none";

  // Adjacent card starts off-screen opposite to drag direction
  const adjacentBase = slideDir === "up" ? vh : -vh;

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden bg-black select-none"
      style={{ touchAction: "none" }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      {/* ── Adjacent card (slides in) ── */}
      {adjacentProduct && (
        <div
          className="absolute inset-0"
          style={{
            transform: `translateY(${adjacentBase + dragOffset}px)`,
            transition,
            willChange: "transform",
          }}
        >
          <CardBg product={adjacentProduct} />
          <BottomPanel product={adjacentProduct} cartAdded={cartAdded} isActive={false}
            onAddToCart={() => {}} onGift={() => {}} onGiftSheet={() => {}}
            onShare={() => {}} onOpenGiftFinder={onOpenGiftFinder ?? null} />
        </div>
      )}

      {/* ── Current card ── */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translateY(${dragOffset}px)`,
          transition,
          willChange: "transform",
        }}
      >
        <CardBg product={current} imageIndex={imageIndex} />

        {/* Stories-style segmented progress bar — flush to the top edge,
            edge-to-edge, one segment per image. Earlier segments are full,
            the active one fills left→right, future ones are empty. */}
        <div
          className="absolute top-0 left-0 right-0 z-20 flex gap-1 px-1 pt-1"
          aria-label={`Image ${imageIndex + 1} of ${segmentCount}`}
        >
          {Array.from({ length: segmentCount }).map((_, i) => {
            const state: "past" | "active" | "future" =
              i < imageIndex ? "past" : i === imageIndex ? "active" : "future";
            return (
              <div
                key={i}
                className="flex-1 h-0.5 bg-white/20 overflow-hidden rounded-full"
              >
                {state === "active" ? (
                  <div
                    key={`${activeProductId}-${i}`}
                    className="h-full bg-[#D4AF37]"
                    style={{
                      width: "100%",
                      transformOrigin: "left center",
                      animation: `tiktokProgress ${perSegmentMs}ms linear forwards`,
                    }}
                  />
                ) : state === "past" ? (
                  <div className="h-full w-full bg-[#D4AF37]" />
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Top bar: filter button on the right. The drop icon below is
            absolutely centered so its position never depends on the bar. */}
        <div className="absolute left-4 right-4 z-10 flex items-center justify-end" style={{ top: `${topOffset}px` }}>
          <button
            onClick={() => onOpenFilters?.()}
            aria-label="Filters"
            className="w-9 h-9 rounded-full bg-black/60 border border-white/15 flex items-center justify-center hover:border-[#D4AF37]/60 transition-colors shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Tap zones — left/right halves cycle through images of the current
            product. Vertical center band only, so the bottom panel buttons
            and right-side actions stay clickable. */}
        {segmentCount > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={() => skipImage(-1)}
              className="absolute left-0 top-[15%] bottom-[35%] w-1/3 z-[5] cursor-default"
            />
            <button
              type="button"
              aria-label="Next image"
              onClick={() => skipImage(1)}
              className="absolute right-0 top-[15%] bottom-[35%] w-1/3 z-[5] cursor-default"
            />
          </>
        )}

        {/* Drop icon — absolutely centered at the top, independent of the
            filter button on either side. Fades in once the final segment of
            the progress bar completes. */}
        <div
          className="absolute left-1/2 -translate-x-1/2 z-10 w-9 h-9 rounded-full bg-black/60 border border-[#D4AF37]/40 flex items-center justify-center transition-opacity duration-500 pointer-events-none"
          style={{
            top: `${topOffset - 4}px`,
            opacity: progressDone ? 1 : 0,
            boxShadow: progressDone ? "0 0 12px rgba(212,175,55,0.25)" : "none",
          }}
          aria-hidden={!progressDone}
        >
          <Droplets className="w-5 h-5" style={{ animation: "goldShimmer 2s ease-in-out infinite", color: "#D4AF37" }} />
        </div>

        <style>{`
          @keyframes tiktokProgress {
            from { transform: scaleX(0); }
            to { transform: scaleX(1); }
          }
          @keyframes goldShimmer {
            0%, 100% { color: #D4AF37; filter: drop-shadow(0 0 3px rgba(212,175,55,0.4)); opacity: 0.85; }
            50% { color: #f5e27a; filter: drop-shadow(0 0 8px rgba(245,226,122,0.9)); opacity: 1; }
          }
        `}</style>

        {/* Right-side actions */}
        <div
          className="absolute right-2 z-10 flex flex-col gap-3"
          style={{ bottom: "170px", filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.55))" }}
        >
          <button
            onClick={() => { toggleFavorite(current); toast({ title: isFavorite(current.id) ? "Removed from saved" : "Saved!", description: current.name, duration: 1500 }); }}
            className="flex flex-col items-center gap-1"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xl ring-1 ring-black/30 transition-all duration-200 ${isFavorite(current.id) ? "bg-[#D4AF37]/25 border border-[#D4AF37]" : "bg-black/70 backdrop-blur-md border border-white/30 hover:border-[#D4AF37]/60"}`}>
              <Heart className={`w-5 h-5 transition-all duration-200 ${isFavorite(current.id) ? "fill-[#D4AF37] text-[#D4AF37] scale-110" : "text-white"}`} />
            </div>
            <span className="text-[9px] font-medium text-white" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.7)" }}>Save</span>
          </button>

          <button onClick={() => openGiftSheet(current)} className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full bg-black/70 backdrop-blur-md border border-[#D4AF37]/70 ring-1 ring-black/30 flex items-center justify-center shadow-xl transition-all duration-200 hover:bg-[#D4AF37]/25">
              <Gift className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <span className="text-[9px] font-medium text-white" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.7)" }}>Gift</span>
          </button>

          <Link href={`/product/${current.id}`} className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full bg-black/70 backdrop-blur-md border border-white/30 ring-1 ring-black/30 flex items-center justify-center shadow-xl hover:border-[#D4AF37]/60 transition-colors">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-[9px] font-medium text-white" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.7)" }}>View</span>
          </Link>

          <button onClick={() => handleShare(current)} className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full bg-black/70 backdrop-blur-md border border-white/30 ring-1 ring-black/30 flex items-center justify-center shadow-xl hover:border-[#D4AF37]/60 transition-colors">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-[9px] font-medium text-white" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.7)" }}>Share</span>
          </button>

          {onOpenGiftFinder && (
            <button onClick={onOpenGiftFinder} className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 rounded-full bg-black/70 backdrop-blur-md border border-[#D4AF37]/60 ring-1 ring-black/30 flex items-center justify-center shadow-xl">
                <Sparkles className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <span className="text-[9px] font-medium text-white" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.7)" }}>AI</span>
            </button>
          )}
        </div>

        {/* Swipe hint */}
        {currentIndex < products.length - 1 && dragOffset === 0 && !isAnimating && (
          <div className="absolute left-0 right-0 z-10 flex justify-center pointer-events-none" style={{ bottom: "197px" }}>
            <div className="flex flex-col items-center gap-1 animate-bounce">
              <span className="text-white text-base drop-shadow-lg">↑</span>
              <span className="text-[11px] text-white/90 tracking-widest font-medium drop-shadow-lg uppercase">swipe up</span>
            </div>
          </div>
        )}

        {/* Bottom info panel */}
        <BottomPanel
          product={current}
          cartAdded={cartAdded}
          isActive={true}
          onAddToCart={() => handleAddToCart(current)}
          onGift={handleGift}
          onGiftSheet={() => openGiftSheet(current)}
          onShare={() => handleShare(current)}
          onOpenGiftFinder={onOpenGiftFinder ?? null}
        />

        {/* Tap zones */}
        <div className="absolute inset-x-0 z-5 pointer-events-none" style={{ top: "60px", bottom: "250px" }}>
          <div className="flex h-full pointer-events-auto">
            <div className="flex-1 cursor-pointer" onClick={() => triggerSlide("down")} />
            <div className="w-16 pointer-events-none" />
            <div className="flex-1 cursor-pointer" onClick={() => triggerSlide("up")} />
          </div>
        </div>
      </div>

      {/* Gift sheet */}
      {giftProduct && (
        <>
          <div className="absolute inset-0 z-[200] bg-black/70" onClick={() => setGiftProduct(null)} />
          <div
            className="absolute bottom-0 left-0 right-0 z-[210] bg-[#0a0a0a] border-t border-[#D4AF37]/20"
            style={{ animation: "slideUp 0.28s cubic-bezier(0.16,1,0.3,1) forwards" }}
          >
            <style>{`
              @keyframes slideUp {
                from { transform: translateY(100%); opacity: 0; }
                to   { transform: translateY(0);    opacity: 1; }
              }
            `}</style>
            <div className="h-px w-full bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-0.5 bg-zinc-700 rounded-full" />
            </div>
            <div className="flex items-center gap-3 px-5 py-3 border-b border-zinc-900">
              <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0">
                {giftProduct.imageUrl
                  ? <img src={giftProduct.imageUrl} alt={giftProduct.name} className="w-full h-full object-cover" />
                  : <Gift className="w-6 h-6 text-zinc-700 m-auto mt-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wide text-zinc-300 font-light truncate">{giftProduct.name}</p>
                <p className="text-[#D4AF37] text-sm font-light mt-0.5">{fmt.format(giftProduct.price)}</p>
              </div>
              <button onClick={() => setGiftProduct(null)} className="text-zinc-600 hover:text-zinc-300 transition-colors p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 pt-4 pb-3 space-y-3">
              <div>
                <label className="text-[9px] uppercase tracking-[0.2em] text-zinc-600 block mb-1.5">Who's the lucky one?</label>
                <input type="text" value={giftRecipient} onChange={(e) => setGiftRecipient(e.target.value)}
                  placeholder="Their name (optional)"
                  className="w-full bg-zinc-900/80 border border-zinc-800 px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-[#D4AF37]/40 transition-colors" />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-[0.2em] text-zinc-600 block mb-1.5">Personal note</label>
                <textarea value={giftNote} onChange={(e) => setGiftNote(e.target.value)}
                  placeholder="Add a heartfelt message… (optional)" rows={2}
                  className="w-full bg-zinc-900/80 border border-zinc-800 px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-[#D4AF37]/40 transition-colors resize-none" />
              </div>
            </div>
            <div className="px-5 pb-6">
              <button onClick={sendGiftViaWhatsApp}
                className="w-full py-4 bg-[#D4AF37] text-black text-xs uppercase tracking-widest font-semibold hover:bg-white transition-colors flex items-center justify-center gap-2">
                <Send className="w-3.5 h-3.5" />Send Gift via WhatsApp
              </button>
              <p className="text-[9px] text-zinc-700 text-center tracking-widest uppercase mt-2">Opens WhatsApp — you pick who to send it to</p>
            </div>
          </div>
        </>
      )}

      <ShareDialog
        open={shareTarget !== null}
        onOpenChange={(o) => { if (!o) setShareTarget(null); }}
        target={shareTarget}
      />

      <QuickBuyDialog
        open={quickBuyProduct !== null}
        onOpenChange={(o) => { if (!o) setQuickBuyProduct(null); }}
        product={quickBuyProduct}
      />
    </div>
  );
}

// ── Bottom panel (shared between current + adjacent card) ─────────────────────
function BottomPanel({
  product, cartAdded, isActive,
  onAddToCart, onGift, onGiftSheet, onShare, onOpenGiftFinder,
}: {
  product: Product;
  cartAdded: Set<number>;
  isActive: boolean;
  onAddToCart: () => void;
  onGift: () => void;
  onGiftSheet: () => void;
  onShare: () => void;
  onOpenGiftFinder: (() => void) | null;
}) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-10 px-5 pt-14 pb-5"
      style={{ background: "linear-gradient(to top, rgba(10,10,10,1) 65%, rgba(10,10,10,0) 100%)" }}
    >
      <div className="flex gap-2 mb-2">
        {product.originalPrice != null && product.originalPrice > product.price && (
          <span className="text-[9px] border border-[#D4AF37]/40 text-[#D4AF37] px-2 py-0.5 uppercase tracking-wider">Sale</span>
        )}
        {!product.inStock && (
          <span className="text-[9px] border border-zinc-700 text-zinc-500 px-2 py-0.5 uppercase tracking-wider">Sold Out</span>
        )}
      </div>
      <Link href={`/product/${product.id}`}>
        <h2 className="text-lg font-light uppercase tracking-wide text-white leading-snug hover:text-[#D4AF37] transition-colors cursor-pointer">
          {product.name}
        </h2>
      </Link>
      {product.categoryName && (
        <p className="text-[9px] uppercase tracking-wider text-[#D4AF37]/70 mt-0.5 mb-2">{product.categoryName}</p>
      )}
      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-2xl text-[#D4AF37] font-light">{fmt.format(product.price)}</span>
        {product.originalPrice != null && product.originalPrice > product.price && (
          <span className="text-zinc-600 line-through text-sm">{fmt.format(product.originalPrice)}</span>
        )}
      </div>
      <style>{`
        @keyframes gift-glow {
          0%, 100% { box-shadow: 0 0 6px rgba(212,175,55,0.3), inset 0 0 6px rgba(212,175,55,0.05); }
          50%       { box-shadow: 0 0 18px rgba(212,175,55,0.65), inset 0 0 10px rgba(212,175,55,0.1); }
        }
        .gift-glow-btn { animation: gift-glow 2.4s ease-in-out infinite; }
      `}</style>
      <div className="flex gap-2">
        <button
          onClick={isActive ? onAddToCart : undefined}
          disabled={!product.inStock}
          className={`flex-[3] py-3.5 text-sm uppercase tracking-widest font-semibold transition-all duration-200 ${
            !product.inStock
              ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
              : cartAdded.has(product.id)
              ? "bg-zinc-800 text-[#D4AF37] border border-[#D4AF37]/40"
              : "bg-[#D4AF37] text-black hover:bg-white"
          }`}
        >
          {!product.inStock ? "Sold Out" : cartAdded.has(product.id) ? "✓ Added" : "Buy Now →"}
        </button>
        <button
          onClick={isActive ? onGift : undefined}
          className="gift-glow-btn flex-[2] py-3.5 text-[10px] uppercase tracking-widest font-semibold bg-black border border-[#D4AF37]/70 text-[#D4AF37] hover:bg-[#D4AF37]/5 transition-colors flex items-center justify-center gap-1.5"
        >
          <Sparkles className="w-3 h-3 shrink-0" />Surprise Someone
        </button>
      </div>
    </div>
  );
}
