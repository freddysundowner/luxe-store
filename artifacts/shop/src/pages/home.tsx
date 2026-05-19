import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link } from "wouter";
import {
  Search, Sparkles, X, Gift, Heart, ShoppingBag, RefreshCw,
  MessageCircle, Share2, Droplets, Send
} from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useAddBundleToCart } from "@/lib/bundle-add";
import { ProductCard } from "@/components/ProductCard";
import { StoreLogo } from "@/components/StoreLogo";
import { TikTokFeed } from "@/components/TikTokFeed";
import {
  useListProducts, getListProductsQueryKey,
  useListCategories, getListCategoriesQueryKey,
  useGetSettings, getGetSettingsQueryKey,
  useCreateGift,
  Product,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useFavorites } from "@/lib/favorites-context";
import { isProductSoldOut } from "@/lib/stock";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyFeed } from "@/components/EmptyFeed";
import { ShareDialog, isCoarsePointer, type ShareTarget } from "@/components/ShareDialog";
import { QuickBuyDialog } from "@/components/QuickBuyDialog";
import { Helmet } from "react-helmet-async";

const fmt = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 });

// ── Desktop featured TikTok swiper (center column) ─────────────────────────

function FeaturedSwiper({
  products,
  onClear,
  selection,
}: {
  products: Product[];
  onClear?: () => void;
  /**
   * Optional external selection — when the parent (desktop home grid) clicks
   * a card we jump the swiper to that product. We use `{ id, nonce }` so
   * clicking the same card after swiping still re-snaps (object identity
   * changes even when id is unchanged). Snap is instant (no slide animation)
   * since the user is making a deliberate selection from another column.
   */
  selection?: { id: number; nonce: number } | null;
}) {
  const [index, setIndex] = useState(0);

  // Jump to externally-selected product (e.g. from the right-column grid).
  useEffect(() => {
    if (!selection) return;
    const idx = products.findIndex((p) => p.id === selection.id);
    if (idx >= 0) setIndex(idx);
    // Intentionally re-runs whenever the parent issues a new selection
    // (different nonce), even if the product id is the same.
  }, [selection, products]);
  const [giftProduct, setGiftProduct] = useState<Product | null>(null);
  const [giftRecipient, setGiftRecipient] = useState("");
  const [giftNote, setGiftNote] = useState("");
  const [giftSender, setGiftSender] = useState("");
  const [giftStep, setGiftStep] = useState<"form" | "pay" | "done">("form");
  const [giftLink, setGiftLink] = useState("");
  const { toast } = useToast();
  const [quickBuyProduct, setQuickBuyProduct] = useState<Product | null>(null);
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const { toggleFavorite, isFavorite } = useFavorites();
  const { openCart } = useCart();
  const { add: addBundle, ready: bundleReady } = useAddBundleToCart();

  // TikTok-style drag/swipe state. `dragOffset` follows the pointer/touch in
  // real-time (px). `slideDir` says which neighbour to render off-screen so it
  // glides in alongside the current card. `isAnimating` enables the snap/
  // complete CSS transition.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [vh, setVh] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [slideDir, setSlideDir] = useState<"up" | "down" | null>(null);
  const dragStartY = useRef(0);
  const liveOffset = useRef(0);
  const isDragging = useRef(false);

  // Measure the container height so swipes snap a full card distance, no
  // matter the desktop layout. Re-measure on window resize.
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) setVh(containerRef.current.clientHeight);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const featured = useMemo(() => products, [products]);

  const current = featured.length > 0 ? featured[index] : null;

  // Complete a slide programmatically (keyboard / wheel / tap). Mirrors the
  // mobile TikTokFeed `triggerSlide` so wheel + keyboard feel identical to
  // a real swipe — the card actually translates instead of crossfading.
  const triggerSlide = useCallback((dir: "up" | "down") => {
    if (isAnimating || featured.length < 2 || vh === 0) return;
    setSlideDir(dir);
    setIsAnimating(true);
    setDragOffset(0);
    requestAnimationFrame(() => {
      setDragOffset(dir === "up" ? -vh : vh);
      setTimeout(() => {
        setIndex((i) =>
          dir === "up" ? (i + 1) % featured.length : (i - 1 + featured.length) % featured.length
        );
        setDragOffset(0);
        setIsAnimating(false);
        setSlideDir(null);
        liveOffset.current = 0;
      }, 300);
    });
  }, [isAnimating, featured.length, vh]);

  // Keyboard ↑ ↓ — gated so it doesn't fight typing in modals or move the
  // feed while the gift sheet / quick-buy / share dialog is open.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      // Block while any overlay-style flow is active.
      if (giftProduct || quickBuyProduct || shareTarget) return;
      // Block while typing in an editable field.
      const t = document.activeElement as HTMLElement | null;
      if (t) {
        const tag = t.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable) return;
      }
      triggerSlide(e.key === "ArrowUp" ? "down" : "up");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [triggerSlide, giftProduct, quickBuyProduct, shareTarget]);

  // Mouse wheel — single slide per detent with a short cooldown so trackpad
  // inertia doesn't blast through the catalogue.
  const wheelCooldown = useRef(false);
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (isAnimating || wheelCooldown.current) return;
    if (Math.abs(e.deltaY) < 20) return;
    triggerSlide(e.deltaY > 0 ? "up" : "down");
    wheelCooldown.current = true;
    setTimeout(() => { wheelCooldown.current = false; }, 600);
  }, [isAnimating, triggerSlide]);

  // ── Touch drag (live) ──
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isAnimating) return;
    // Mirror the mouse-down guard: don't hijack drags that start on
    // interactive elements (the pinned drop icon, action rail buttons, etc.).
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, textarea, select")) return;
    dragStartY.current = e.touches[0].clientY;
    liveOffset.current = 0;
    isDragging.current = true;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (isAnimating || !isDragging.current) return;
    const diff = e.touches[0].clientY - dragStartY.current;
    liveOffset.current = diff;
    setDragOffset(diff);
    setSlideDir(diff < 0 ? "up" : diff > 0 ? "down" : null);
  };
  const endDrag = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (isAnimating) return;
    const offset = liveOffset.current;
    const threshold = (vh || 600) * 0.22;
    if (Math.abs(offset) > threshold && featured.length > 1) {
      const dir = offset < 0 ? "up" : "down";
      setIsAnimating(true);
      setDragOffset(dir === "up" ? -vh : vh);
      setTimeout(() => {
        setIndex((i) =>
          dir === "up" ? (i + 1) % featured.length : (i - 1 + featured.length) % featured.length
        );
        setDragOffset(0);
        setIsAnimating(false);
        setSlideDir(null);
        liveOffset.current = 0;
      }, 280);
      return;
    }
    // Snap back to centre
    setIsAnimating(true);
    setDragOffset(0);
    setTimeout(() => {
      setIsAnimating(false);
      setSlideDir(null);
      liveOffset.current = 0;
    }, 240);
  };

  // ── Mouse drag (click-and-drag on desktop) ──
  // Stash the active listeners in refs so we can always tear them down — both
  // on the normal mouseup *and* if the component unmounts mid-drag.
  const mouseMoveRef = useRef<((ev: MouseEvent) => void) | null>(null);
  const mouseUpRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    return () => {
      if (mouseMoveRef.current) window.removeEventListener("mousemove", mouseMoveRef.current);
      if (mouseUpRef.current) window.removeEventListener("mouseup", mouseUpRef.current);
      mouseMoveRef.current = null;
      mouseUpRef.current = null;
    };
  }, []);
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isAnimating) return;
    // Don't hijack drags that start on interactive elements (buttons, links).
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, textarea, select")) return;
    dragStartY.current = e.clientY;
    liveOffset.current = 0;
    isDragging.current = true;
    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const diff = ev.clientY - dragStartY.current;
      liveOffset.current = diff;
      setDragOffset(diff);
      setSlideDir(diff < 0 ? "up" : diff > 0 ? "down" : null);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      mouseMoveRef.current = null;
      mouseUpRef.current = null;
      endDrag();
    };
    mouseMoveRef.current = onMove;
    mouseUpRef.current = onUp;
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const createGiftMutation = useCreateGift({
    mutation: {
      onSuccess: (gift) => {
        const link = `${window.location.origin}/gift/${gift.claimToken}`;
        setGiftLink(link);
        setGiftStep("pay");
      },
      onError: () => toast({ variant: "destructive", title: "Could not create gift. Try again." }),
    },
  });

  const openGiftSheet = (product: Product) => {
    setGiftProduct(product);
    setGiftRecipient("");
    setGiftNote("");
    setGiftSender("");
    setGiftStep("form");
    setGiftLink("");
  };

  const closeGiftSheet = () => {
    setGiftProduct(null);
    setGiftStep("form");
    setGiftLink("");
  };

  const handleCreateGift = (method: "whatsapp" | "mpesa") => {
    if (!giftProduct) return;
    createGiftMutation.mutate({
      data: {
        productId: giftProduct.id,
        productName: giftProduct.name,
        productPrice: Number(giftProduct.price),
        productImageUrl: giftProduct.imageUrl ?? undefined,
        recipientName: giftRecipient.trim() || undefined,
        note: giftNote.trim() || undefined,
        senderName: giftSender.trim() || undefined,
        paymentMethod: method,
      },
    });
  };

  const sendGiftWhatsApp = () => {
    if (!giftProduct || !giftLink) return;
    const storeName = settings?.storeName || "Luxe Store";
    const price = fmt.format(giftProduct.price);
    const to = giftRecipient.trim() || "you";
    const notePreview = giftNote.trim() ? `\n\n"${giftNote.trim()}"` : "";
    const message =
      `🎁 Hey ${to}! I've sent you a gift!\n\n` +
      `*${giftProduct.name}*\n${price} — from ${storeName}${notePreview}\n\n` +
      `Unwrap your gift here: ${giftLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
    setGiftStep("done");
  };

  const copyGiftLink = () => {
    navigator.clipboard.writeText(giftLink);
    toast({ title: "Gift link copied!" });
  };

  const handleCart = (product: Product) => {
    // Bundles bypass QuickBuy (no variants/qty) — add component products as a
    // grouped hamper line via the shared bundle-add hook, matching ProductCard
    // / TikTokFeed / PDP behavior.
    if (product.kind === "bundle") {
      if (!bundleReady) {
        toast({ title: "Loading bundle… try again in a moment." });
        return;
      }
      // The hook handles toast + openCart on success.
      addBundle(product);
      return;
    }
    // Skip the cart drawer entirely — open the QuickBuy modal which collects
    // variant + quantity (if needed) and goes straight to the customer-info
    // checkout step on confirm. The dialog itself handles adding to cart, so
    // we don't mark the button as "added" here.
    setQuickBuyProduct(product);
  };

  const handleGift = () => {
    import("@/lib/gift-finder-trigger").then(m => m.triggerGiftFinder());
  };

  const handleShare = (product: Product) => {
    const url = `${window.location.origin}/product/${product.id}`;
    // On touch devices use the native share sheet (better UX, supports more apps).
    // On desktop, always show our custom modal instead of the browser's default.
    if (isCoarsePointer() && navigator.share) {
      navigator.share({ title: product.name, url }).catch(() => {});
      return;
    }
    setShareTarget({ title: product.name, url });
  };

  if (!current) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0a0a0a] overflow-hidden">
        <EmptyFeed
          message="No products found"
          sub="Try a different filter or category"
          onClear={onClear}
          clearLabel="Clear filters"
        />
      </div>
    );
  }

  // The card that slides in alongside the current one during a swipe.
  // `slideDir==="up"` means user is swiping the card upward → the *next*
  // product appears from below. `"down"` → the previous one appears from
  // above. Wrap around to mirror the existing crossfade behaviour.
  const adjacentIndex = slideDir === "up"
    ? (index + 1) % featured.length
    : slideDir === "down"
    ? (index - 1 + featured.length) % featured.length
    : null;
  const adjacentProduct = adjacentIndex !== null ? featured[adjacentIndex] : null;
  const adjacentBase = slideDir === "up" ? vh : -vh;
  const transition = isAnimating ? "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)" : "none";

  // Per-card visuals (image background + drop icon + right rail + bottom
  // info panel). Inactive cards (the one sliding in behind/ahead) get
  // no-op interactions so a half-drag doesn't trigger purchases or shares.
  const renderCardContent = (p: Product, isActive: boolean) => {
    const isSoldOut = isProductSoldOut(p);
    return (
      <>
        {/* Full-height image + scrim */}
        <div className="absolute inset-0">
          {p.imageUrl ? (
            <img
              key={p.id}
              src={p.imageUrl}
              alt={p.name}
              draggable={false}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />
          ) : (
            <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
              <ShoppingBag className="w-14 h-14 text-zinc-700" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/10 to-transparent pointer-events-none" />
        </div>

        {/* Action buttons */}
        <div
          className="absolute right-4 z-10 flex flex-col gap-3.5"
          style={{ bottom: "170px", filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.5))" }}
        >
          <button onClick={isActive ? () => openGiftSheet(p) : undefined} className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-black/80 border border-[#D4AF37]/70 ring-1 ring-black/30 flex items-center justify-center shadow-lg transition-colors hover:bg-[#D4AF37]/25">
              <Gift className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <span className="text-[9px] font-medium text-white" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.7)" }}>Gift</span>
          </button>
          <Link href={isActive ? `/product/${p.id}` : "#"} className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-black/80 border border-white/30 ring-1 ring-black/30 flex items-center justify-center shadow-lg hover:border-[#D4AF37]/60 transition-colors">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <span className="text-[9px] font-medium text-white" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.7)" }}>View</span>
          </Link>
          <button onClick={isActive ? () => handleShare(p) : undefined} className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-black/80 border border-white/30 ring-1 ring-black/30 flex items-center justify-center shadow-lg hover:border-[#D4AF37]/60 transition-colors">
              <Share2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-[9px] font-medium text-white" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.7)" }}>Share</span>
          </button>
        </div>

        {/* Product info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
          <Link href={`/product/${p.id}`}>
            <h2 className="text-xl font-light uppercase tracking-wide hover:text-[#D4AF37] transition-colors cursor-pointer leading-snug">
              {p.name}
            </h2>
          </Link>
          {p.categoryName && (
            <p className="text-[9px] uppercase tracking-wider text-[#D4AF37]/70 mt-0.5 mb-2">
              {p.categoryName}
            </p>
          )}
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-2xl text-[#D4AF37] font-light">{fmt.format(p.price)}</span>
            {p.originalPrice != null && p.originalPrice > p.price && (
              <span className="text-zinc-600 line-through text-sm">
                {fmt.format(p.originalPrice)}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={isActive && !isSoldOut ? () => handleCart(p) : undefined}
              disabled={isSoldOut}
              className={`flex-[3] py-3 text-xs uppercase tracking-widest font-semibold transition-colors ${
                isSoldOut
                  ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                  : "bg-[#D4AF37] text-black hover:bg-white"
              }`}
            >
              {isSoldOut ? "Sold Out" : "Buy Now →"}
            </button>
            <button
              onClick={isActive ? handleGift : undefined}
              className="gift-glow-btn flex-[2] py-3 text-[9px] uppercase tracking-widest font-semibold bg-black border border-[#D4AF37]/70 text-[#D4AF37] hover:bg-[#D4AF37]/5 transition-colors flex items-center justify-center gap-1"
            >
              <Sparkles className="w-3 h-3 shrink-0" />
              Find a Gift
            </button>
          </div>
        </div>
      </>
    );
  };

  return (
    <div
      ref={containerRef}
      id="featured-swiper"
      className="flex-1 relative overflow-hidden bg-black select-none cursor-grab active:cursor-grabbing"
      style={{ touchAction: "none" }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={endDrag}
      onTouchCancel={endDrag}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
    >
      <style>{`
        .gift-glow-btn { box-shadow: 0 0 12px rgba(212,175,55,0.45), inset 0 0 8px rgba(212,175,55,0.08); }
      `}</style>

      {/* Adjacent card (slides in alongside the current one). Inert by
          design — pointer-events disabled so partial drags can't tap through
          to the off-screen card's buttons or links. */}
      {adjacentProduct && (
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translateY(${adjacentBase + dragOffset}px)`,
            transition,
            willChange: "transform",
          }}
        >
          {renderCardContent(adjacentProduct, false)}
        </div>
      )}

      {/* Current card */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translateY(${dragOffset}px)`,
          transition,
          willChange: "transform",
        }}
      >
        {renderCardContent(current, true)}
      </div>

      {/* Pinned drop icon / favorite toggle — sits above the sliding cards
          so it stays in place during drags and slide transitions. Always
          reflects the currently-active product. */}
      {(() => {
        const fav = isFavorite(current.id);
        return (
          <div className="absolute top-3 left-0 right-0 flex justify-center z-30 pointer-events-none">
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                const wasFavorited = fav;
                toggleFavorite(current);
                toast({
                  title: wasFavorited ? "Removed from saved" : "Saved!",
                  description: current.name,
                  duration: 1500,
                });
              }}
              aria-label={fav ? "Remove from saved" : "Save to favorites"}
              aria-pressed={fav}
              className={`pointer-events-auto w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 ${
                fav
                  ? "bg-[#D4AF37]/25 border border-[#D4AF37]"
                  : "bg-black/60 border border-[#D4AF37]/40 hover:border-[#D4AF37]/80"
              }`}
              style={{ boxShadow: "0 0 12px rgba(212,175,55,0.25)" }}
            >
              <Droplets
                className={`w-6 h-6 transition-transform duration-300 ${fav ? "scale-110" : ""}`}
                style={
                  fav
                    ? { color: "#D4AF37", fill: "#D4AF37", filter: "drop-shadow(0 0 6px rgba(212,175,55,0.7))" }
                    : { color: "#D4AF37", filter: "drop-shadow(0 0 4px rgba(212,175,55,0.5))" }
                }
              />
            </button>
          </div>
        );
      })()}

      {/* Scroll hint */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-1 z-20 pointer-events-none">
        <span className="text-[8px] text-zinc-700 tracking-widest uppercase">
          drag · scroll · ↑ ↓ keyboard
        </span>
      </div>

      {/* Gift Sheet */}
      {giftProduct && (
        <>
          <div className="absolute inset-0 z-[200] bg-black/70" onClick={closeGiftSheet} />
          <div className="absolute bottom-0 left-0 right-0 z-[210] bg-[#0a0a0a] border-t border-[#D4AF37]/20"
            style={{ animation: "slideUp 0.28s cubic-bezier(0.16,1,0.3,1) forwards" }}>
            <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
            <div className="h-px w-full bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-0.5 bg-zinc-700 rounded-full" /></div>

            {/* Product header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-zinc-900">
              <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0">
                {giftProduct.imageUrl
                  ? <img src={giftProduct.imageUrl} alt={giftProduct.name} className="w-full h-full object-cover" />
                  : <Gift className="w-6 h-6 text-zinc-700 m-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wide text-zinc-300 font-light truncate">{giftProduct.name}</p>
                <p className="text-[#D4AF37] text-sm font-light mt-0.5">{fmt.format(giftProduct.price)}</p>
              </div>
              <button onClick={closeGiftSheet} className="text-zinc-600 hover:text-zinc-300 transition-colors p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step 1 — Fill details */}
            {giftStep === "form" && (
              <>
                <div className="px-5 pt-4 pb-3 space-y-3">
                  <div>
                    <label className="text-[9px] uppercase tracking-[0.2em] text-zinc-600 block mb-1.5">Recipient name</label>
                    <input type="text" value={giftRecipient} onChange={(e) => setGiftRecipient(e.target.value)}
                      placeholder="Who's the lucky one? (optional)"
                      className="w-full bg-zinc-900/80 border border-zinc-800 px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-[#D4AF37]/40 transition-colors" />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-[0.2em] text-zinc-600 block mb-1.5">Your name</label>
                    <input type="text" value={giftSender} onChange={(e) => setGiftSender(e.target.value)}
                      placeholder="So they know it's from you (optional)"
                      className="w-full bg-zinc-900/80 border border-zinc-800 px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-[#D4AF37]/40 transition-colors" />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-[0.2em] text-zinc-600 block mb-1.5">Personal note</label>
                    <textarea value={giftNote} onChange={(e) => setGiftNote(e.target.value)}
                      placeholder="Add a heartfelt message… (optional)" rows={2}
                      className="w-full bg-zinc-900/80 border border-zinc-800 px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-[#D4AF37]/40 transition-colors resize-none" />
                  </div>
                </div>
                <div className="px-5 pb-5 space-y-2">
                  <p className="text-[9px] text-zinc-600 uppercase tracking-widest text-center mb-3">How will you pay?</p>
                  <button
                    onClick={() => handleCreateGift("whatsapp")}
                    disabled={createGiftMutation.isPending}
                    className="w-full py-3.5 bg-[#D4AF37] text-black text-xs uppercase tracking-widest font-semibold hover:bg-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                    <MessageCircle className="w-3.5 h-3.5" />
                    {createGiftMutation.isPending ? "Creating…" : "Pay via WhatsApp checkout"}
                  </button>
                  <button
                    onClick={() => handleCreateGift("mpesa")}
                    disabled={createGiftMutation.isPending}
                    className="w-full py-3.5 border border-zinc-800 text-zinc-300 text-xs uppercase tracking-widest hover:border-[#D4AF37]/40 hover:text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                    <span className="text-green-400 font-bold text-[10px]">M</span>
                    {createGiftMutation.isPending ? "Creating…" : "Pay via M-Pesa"}
                  </button>
                </div>
              </>
            )}

            {/* Step 2 — Pay & share */}
            {giftStep === "pay" && (
              <div className="px-5 pt-4 pb-5 space-y-4">
                <div className="text-center space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-[#D4AF37]/60">Gift created!</p>
                  <p className="text-sm text-zinc-300 font-light">Complete your payment, then share the link below.</p>
                </div>
                {/* Gift link */}
                <div className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 flex items-center gap-2">
                  <p className="flex-1 text-[11px] text-zinc-400 truncate">{giftLink}</p>
                  <button onClick={copyGiftLink} className="text-[#D4AF37]/60 hover:text-[#D4AF37] transition-colors shrink-0">
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button onClick={sendGiftWhatsApp}
                  className="w-full py-4 bg-[#D4AF37] text-black text-xs uppercase tracking-widest font-semibold hover:bg-white transition-colors flex items-center justify-center gap-2">
                  <MessageCircle className="w-3.5 h-3.5" />Send & share via WhatsApp
                </button>
                <button onClick={copyGiftLink}
                  className="w-full py-3 border border-zinc-800 text-zinc-500 text-xs uppercase tracking-widest hover:border-zinc-600 hover:text-zinc-300 transition-colors">
                  Copy link only
                </button>
              </div>
            )}

            {/* Step 3 — Done */}
            {giftStep === "done" && (
              <div className="px-5 pt-4 pb-5 flex flex-col items-center gap-4 text-center">
                <div className="w-12 h-12 rounded-full border border-[#D4AF37]/40 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-light text-white">Gift sent!</p>
                  <p className="text-xs text-zinc-500">
                    {giftRecipient ? `${giftRecipient} will see a beautiful gift reveal` : "They'll see a beautiful gift reveal"} when they open the link.
                  </p>
                </div>
                <button onClick={closeGiftSheet}
                  className="w-full py-3 border border-zinc-800 text-zinc-500 text-xs uppercase tracking-widest hover:border-zinc-600 hover:text-zinc-300 transition-colors">
                  Done
                </button>
              </div>
            )}

            <div className="h-px w-full bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />
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

// ── Home page ───────────────────────────────────────────────────────────────

export default function Home() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [priceRanges, setPriceRanges] = useState<Set<string>>(new Set());
  const [availability, setAvailability] = useState<Set<string>>(new Set());
  // Drives the desktop centre swiper. Clicking a card in the right-column
  // grid sets this so the feed snaps to that product instead of navigating.
  // `nonce` bumps each click so re-selecting the same product still re-snaps.
  const [featuredSelection, setFeaturedSelection] = useState<{ id: number; nonce: number } | null>(null);

  const toggleSet = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, key: string) => {
    setter(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };
  const [isMobile, setIsMobile] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const { itemCount, openCart } = useCart();
  const { favoriteCount } = useFavorites();

  const { data: storeSettings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });

  const DEFAULT_PRICE_TIERS = [
    { name: "Under Ksh 500", min: 0, max: 500 },
    { name: "Ksh 500 – 2,000", min: 500, max: 2000 },
    { name: "Ksh 2,000 – 5,000", min: 2000, max: 5000 },
    { name: "Over Ksh 5,000", min: 5000, max: null },
  ] as const;
  const priceTiers: Array<{ name: string; min: number; max: number | null }> =
    (storeSettings?.priceTiers as Array<{ name: string; min: number; max: number | null }> | undefined) ?? [...DEFAULT_PRICE_TIERS];

  const { data: categories, isLoading: isLoadingCategories } = useListCategories({
    query: { queryKey: getListCategoriesQueryKey() },
  });

  const { data: products, isLoading: isLoadingProducts, isError, refetch } = useListProducts(
    { categoryId: selectedCategory, search: search || undefined },
    {
      query: {
        queryKey: getListProductsQueryKey({
          categoryId: selectedCategory,
          search: search || undefined,
        }),
        // Silently refresh on every navigation back to the home page. While
        // refetching, cached data stays on screen (isLoading is false), so
        // there's no skeleton flash — only fresh rows appear when ready.
        refetchOnMount: "always",
      },
    }
  );

  // All products (for featured swiper — unfiltered)
  const { data: allProducts } = useListProducts(
    {},
    { query: { queryKey: getListProductsQueryKey({}), refetchOnMount: "always" } }
  );

  // Count of new arrivals across the *unfiltered* feed (allProducts, not
  // the category/search-scoped products list) so the badge stays meaningful
  // regardless of which filters are active.
  const newArrivalCount = useMemo(
    () => (allProducts ?? []).filter(p => p.availabilityTag === "new").length,
    [allProducts]
  );

  const clearSearch = () => setSearch("");

  const displayProducts: Product[] = useMemo(() => {
    let list = [...(products ?? [])];

    if (priceRanges.size > 0) {
      list = list.filter(p => {
        const price = p.price;
        return priceTiers.some(tier =>
          priceRanges.has(tier.name) &&
          price >= tier.min &&
          (tier.max === null || price < tier.max)
        );
      });
    }

    if (availability.has("instock")) list = list.filter(p => p.inStock);
    // "Gifts only" narrows the unified feed to bundle products (kind=bundle).
    if (availability.has("gifts")) list = list.filter(p => p.kind === "bundle");
    const tagFilters = ["new", "sale", "hot", "bestseller", "limited", "coming_soon"].filter(t => availability.has(t));
    if (tagFilters.length > 0) {
      list = list.filter(p => p.availabilityTag != null && tagFilters.includes(p.availabilityTag));
    }

    return list.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
  }, [products, priceRanges, availability]);

  const isLoading = isLoadingProducts;

  // ── Mobile: true full-screen TikTok (bypasses RootLayout header) ──────────
  if (isMobile) {
    const availabilityOptions: { key: string; label: string; count?: number }[] = [
      { key: "instock",    label: "In Stock" },
      { key: "gifts",      label: "Gifts (Bundles)" },
      { key: "new",        label: "New Arrival", count: newArrivalCount },
      { key: "sale",       label: "Sale" },
      { key: "hot",        label: "Hot / Trending" },
      { key: "bestseller", label: "Bestseller" },
      { key: "limited",    label: "Limited Edition" },
      { key: "coming_soon", label: "Coming Soon" },
    ];
    const activeFilterCount =
      (search ? 1 : 0) +
      (selectedCategory !== undefined ? 1 : 0) +
      priceRanges.size +
      availability.size;
    const clearAllMobileFilters = () => {
      clearSearch();
      setSelectedCategory(undefined);
      setPriceRanges(new Set());
      setAvailability(new Set());
    };

    return (
      <div className="fixed inset-0 bg-black flex flex-col" style={{ zIndex: 100 }}>
        <Helmet>
          <title>Luxe Store — Curated Luxury Collection</title>
          <meta name="description" content="Shop curated luxury products at Luxe Store. Electronics, clothing, home & kitchen and more. M-Pesa & WhatsApp checkout. Fast delivery in Kenya." />
          <meta property="og:title" content="Luxe Store — Curated Luxury Collection" />
          <meta property="og:type" content="website" />
        </Helmet>
        <TikTokFeed
          products={displayProducts}
          isLoading={isLoading}
          topOffset={12}
          onOpenFilters={() => setMobileFiltersOpen(true)}
          newArrivalCount={availability.has("new") ? 0 : newArrivalCount}
          onShowNewArrivals={() => setAvailability(new Set(["new"]))}
        />

        {/* Mobile filter bottom sheet */}
        {mobileFiltersOpen && (
          <>
            <div
              className="fixed inset-0 z-[300] bg-black/70"
              onClick={() => setMobileFiltersOpen(false)}
            />
            <div
              className="fixed bottom-0 left-0 right-0 z-[310] bg-[#0a0a0a] border-t border-[#D4AF37]/20 max-h-[85vh] flex flex-col"
              style={{ animation: "slideUpFilters 0.28s cubic-bezier(0.16,1,0.3,1) forwards" }}
            >
              <style>{`@keyframes slideUpFilters { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
              <div className="h-px w-full bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-0.5 bg-zinc-700 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-900">
                <p className="text-xs uppercase tracking-widest text-zinc-300 font-light">
                  Filters {activeFilterCount > 0 && <span className="text-[#D4AF37]">({activeFilterCount})</span>}
                </p>
                <div className="flex items-center gap-3">
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearAllMobileFilters}
                      className="text-[10px] uppercase tracking-widest text-zinc-500 hover:text-[#D4AF37] transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                  <button
                    onClick={() => setMobileFiltersOpen(false)}
                    className="text-zinc-600 hover:text-zinc-300 transition-colors p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable filter body */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                {/* Search */}
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600 group-focus-within:text-[#D4AF37] transition-colors pointer-events-none" />
                  <input
                    type="search"
                    placeholder="Search collection..."
                    className="w-full pl-9 pr-7 py-2.5 rounded-full text-xs placeholder-zinc-600 focus:outline-none focus:ring-1 transition-all bg-zinc-900/60 border border-zinc-800 text-zinc-200 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button
                      onClick={clearSearch}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Categories */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Categories</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedCategory(undefined)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                        selectedCategory === undefined
                          ? "bg-[#D4AF37] text-black border-[#D4AF37] font-semibold"
                          : "text-zinc-400 border-zinc-800 hover:border-zinc-700"
                      }`}
                    >
                      All
                    </button>
                    {categories?.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                          selectedCategory === cat.id
                            ? "bg-[#D4AF37] text-black border-[#D4AF37] font-semibold"
                            : "text-zinc-400 border-zinc-800 hover:border-zinc-700"
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price range */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Price Range</p>
                  <div className="flex flex-col gap-2">
                    {priceTiers.map((tier) => (
                      <label key={tier.name} className="flex items-center gap-2 text-xs cursor-pointer select-none"
                        style={{ color: priceRanges.has(tier.name) ? "#D4AF37" : "#a1a1aa" }}>
                        <input type="checkbox" className="sr-only"
                          checked={priceRanges.has(tier.name)}
                          onChange={() => toggleSet(setPriceRanges, tier.name)} />
                        <span className="w-3.5 h-3.5 border rounded-sm flex-shrink-0 flex items-center justify-center transition-colors"
                          style={{ borderColor: priceRanges.has(tier.name) ? "#D4AF37" : "#3f3f46", background: priceRanges.has(tier.name) ? "#D4AF37" : "transparent" }}>
                          {priceRanges.has(tier.name) && <span className="block w-1.5 h-1.5 bg-black rounded-sm" />}
                        </span>
                        {tier.name}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Availability */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Availability</p>
                  <div className="flex flex-col gap-2">
                    {availabilityOptions.map(({ key, label, count }) => (
                      <label key={key} className="flex items-center gap-2 text-xs cursor-pointer select-none"
                        style={{ color: availability.has(key) ? "#D4AF37" : "#a1a1aa" }}>
                        <input type="checkbox" className="sr-only"
                          checked={availability.has(key)}
                          onChange={() => toggleSet(setAvailability, key)} />
                        <span className="w-3.5 h-3.5 border rounded-sm flex-shrink-0 flex items-center justify-center transition-colors"
                          style={{ borderColor: availability.has(key) ? "#D4AF37" : "#3f3f46", background: availability.has(key) ? "#D4AF37" : "transparent" }}>
                          {availability.has(key) && <span className="block w-1.5 h-1.5 bg-black rounded-sm" />}
                        </span>
                        <span className="flex-1">{label}</span>
                        {count !== undefined && count > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                            {count}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Apply footer */}
              <div className="px-5 py-3 border-t border-zinc-900">
                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  className="w-full py-3 bg-[#D4AF37] text-black text-xs uppercase tracking-widest font-semibold hover:bg-white transition-colors"
                >
                  Show {displayProducts.length} {displayProducts.length === 1 ? "result" : "results"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col" style={{ zIndex: 100 }}>
      <Helmet>
        <title>Luxe Store — Curated Luxury Collection</title>
        <meta name="description" content="Shop curated luxury products at Luxe Store. Electronics, clothing, home & kitchen and more. M-Pesa & WhatsApp checkout. Fast delivery in Kenya." />
        <meta property="og:title" content="Luxe Store — Curated Luxury Collection" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Store",
          "name": "Luxe Store",
          "description": "Curated luxury products with M-Pesa & WhatsApp checkout. Fast delivery in Kenya.",
          "currenciesAccepted": "KES",
          "paymentAccepted": "M-Pesa, WhatsApp",
          "areaServed": "KE",
        })}</script>
      </Helmet>
      {/* Floating top-right pills */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <Link
          href="/favorites"
          className="flex items-center gap-1.5 bg-[#0a0a0a]/80 backdrop-blur border border-zinc-800 rounded-full px-3 py-2 text-zinc-300 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition-all"
        >
          <Heart className={`w-4 h-4 transition-colors ${favoriteCount > 0 ? "fill-[#D4AF37] text-[#D4AF37]" : ""}`} />
          {favoriteCount > 0 && (
            <span className="bg-[#D4AF37] text-black text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {favoriteCount}
            </span>
          )}
        </Link>
        <button
          onClick={openCart}
          className="flex items-center gap-2 bg-[#0a0a0a]/80 border border-zinc-800 rounded-full px-3 py-2 text-zinc-300 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition-all"
        >
          <ShoppingBag className="w-4 h-4" />
          {itemCount > 0 && (
            <span className="bg-[#D4AF37] text-black text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Desktop: 3-column TikTok layout ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar — Filters */}
        <aside className="w-48 shrink-0 bg-zinc-950 border-r border-zinc-900 flex flex-col overflow-y-auto">
          <div className="p-4 flex flex-col gap-6 flex-1">
            {/* Logo */}
            <Link href="/" className="inline-flex">
              <StoreLogo />
            </Link>

            {/* Search bar */}
            <div className="relative group w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600 group-focus-within:text-[#D4AF37] transition-colors pointer-events-none" />
              <input
                type="search"
                placeholder="Search collection..."
                className="w-full pl-9 pr-7 py-2 rounded-full text-xs placeholder-zinc-600 focus:outline-none focus:ring-1 transition-all bg-zinc-900/60 border border-zinc-800 text-zinc-200 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={clearSearch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Search hint */}
            {search && (
              <div className="bg-zinc-900/60 border border-zinc-800 rounded px-3 py-2">
                <p className="text-[9px] uppercase tracking-widest text-zinc-600 mb-1">Searching</p>
                <p className="text-xs text-zinc-300 truncate">{search}</p>
                <button
                  onClick={clearSearch}
                  className="text-[9px] text-zinc-600 hover:text-[#D4AF37] mt-1 transition-colors"
                >
                  Clear ×
                </button>
              </div>
            )}

            {/* Categories */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3">
                Categories
              </p>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => setSelectedCategory(undefined)}
                  className={`text-left text-xs px-3 py-2 rounded transition-all ${
                    selectedCategory === undefined
                      ? "bg-[#D4AF37] text-black font-semibold"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
                  }`}
                >
                  All
                  <span className="float-right text-[10px] opacity-50">
                    {allProducts?.length ?? 0}
                  </span>
                </button>
                {isLoadingCategories
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full rounded bg-zinc-900" />
                    ))
                  : categories?.map((cat) => {
                      const count =
                        allProducts?.filter((p) => p.categoryId === cat.id).length ?? 0;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`text-left text-xs px-3 py-2 rounded transition-all ${
                            selectedCategory === cat.id
                              ? "bg-[#D4AF37] text-black font-semibold"
                              : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
                          }`}
                        >
                          {cat.name}
                          {count > 0 && (
                            <span className="float-right text-[10px] opacity-50">{count}</span>
                          )}
                        </button>
                      );
                    })}
              </div>
            </div>

            {/* Price range — tiers configured in Admin › Settings */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3">Price Range</p>
              <div className="flex flex-col gap-2">
                {priceTiers.map((tier) => (
                  <label key={tier.name} className="flex items-center gap-2 text-xs cursor-pointer hover:text-zinc-200 transition-colors select-none"
                    style={{ color: priceRanges.has(tier.name) ? "#D4AF37" : "#71717a" }}>
                    <input type="checkbox" className="sr-only"
                      checked={priceRanges.has(tier.name)}
                      onChange={() => toggleSet(setPriceRanges, tier.name)} />
                    <span className="w-3 h-3 border rounded-sm flex-shrink-0 flex items-center justify-center transition-colors"
                      style={{ borderColor: priceRanges.has(tier.name) ? "#D4AF37" : "#3f3f46", background: priceRanges.has(tier.name) ? "#D4AF37" : "transparent" }}>
                      {priceRanges.has(tier.name) && <span className="block w-1.5 h-1.5 bg-black rounded-sm" />}
                    </span>
                    {tier.name}
                  </label>
                ))}
              </div>
            </div>

            {/* Availability */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3">Availability</p>
              <div className="flex flex-col gap-2">
                {([
                  { key: "instock",    label: "In Stock" },
                  { key: "gifts",      label: "Gifts (Bundles)" },
                  { key: "new",        label: "New Arrival", count: newArrivalCount },
                  { key: "sale",       label: "Sale" },
                  { key: "hot",        label: "Hot / Trending" },
                  { key: "bestseller", label: "Bestseller" },
                  { key: "limited",    label: "Limited Edition" },
                  { key: "coming_soon", label: "Coming Soon" },
                ] as { key: string; label: string; count?: number }[]).map(({ key, label, count }) => (
                  <label key={key} className="flex items-center gap-2 text-xs cursor-pointer hover:text-zinc-200 transition-colors select-none"
                    style={{ color: availability.has(key) ? "#D4AF37" : "#71717a" }}>
                    <input type="checkbox" className="sr-only"
                      checked={availability.has(key)}
                      onChange={() => toggleSet(setAvailability, key)} />
                    <span className="w-3 h-3 border rounded-sm flex-shrink-0 flex items-center justify-center transition-colors"
                      style={{ borderColor: availability.has(key) ? "#D4AF37" : "#3f3f46", background: availability.has(key) ? "#D4AF37" : "transparent" }}>
                      {availability.has(key) && <span className="block w-1.5 h-1.5 bg-black rounded-sm" />}
                    </span>
                    <span className="flex-1">{label}</span>
                    {count !== undefined && count > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                        {count}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>

          </div>
        </aside>

        {/* Center — Featured swiper */}
        <div className="w-[460px] shrink-0 border-r border-zinc-900 flex flex-col overflow-hidden">
          {allProducts ? (
            <FeaturedSwiper
              products={displayProducts}
              selection={featuredSelection}
              onClear={() => { clearSearch(); setSelectedCategory(undefined); setPriceRanges(new Set()); setAvailability(new Set()); }}
            />
          ) : (
            <div className="flex-1 bg-[#0a0a0a] flex items-center justify-center">
              <Skeleton className="w-full h-full bg-zinc-900" />
            </div>
          )}
        </div>

        {/* Right — All products grid */}
        <div className="flex-1 overflow-y-auto bg-[#0a0a0a]">
          <div className="p-5 lg:p-6">

            {/* New arrivals badge — clickable filter shortcut. Hidden when the
                "new" availability filter is already active or there are no
                new arrivals. */}
            {newArrivalCount > 0 && !availability.has("new") && (
              <button
                onClick={() => setAvailability(new Set(["new"]))}
                className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#D4AF37] text-[11px] uppercase tracking-widest hover:bg-[#D4AF37]/20 hover:border-[#D4AF37] transition-colors animate-in fade-in slide-in-from-top-1 duration-300"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
                {newArrivalCount} New Arrival{newArrivalCount === 1 ? "" : "s"}
                <span className="text-[#D4AF37]/60">— view</span>
              </button>
            )}

            {/* Content */}
            {isError ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="bg-zinc-900 border border-zinc-800 p-3 mb-4 inline-flex">
                  <RefreshCw className="h-5 w-5 text-zinc-500" />
                </div>
                <h3 className="font-light text-base mb-1 text-zinc-200 uppercase tracking-wide">
                  Failed to load products
                </h3>
                <button
                  onClick={() => refetch()}
                  className="mt-4 bg-[#D4AF37] text-black px-5 py-2 text-xs uppercase tracking-widest font-medium hover:bg-white transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : isLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-3">
                    <Skeleton className="w-full aspect-[4/5] bg-zinc-900" />
                    <Skeleton className="h-3 w-1/2 bg-zinc-900" />
                    <Skeleton className="h-3 w-2/3 bg-zinc-900" />
                  </div>
                ))}
              </div>
            ) : displayProducts.length === 0 ? (
              <EmptyFeed
                message={search ? `Nothing matches "${search}"` : "No products found"}
                sub={search ? "Try a different search term" : "Try adjusting your filters"}
                onClear={(search || selectedCategory || priceRanges.size > 0 || availability.size > 0)
                  ? () => { clearSearch(); setSelectedCategory(undefined); setPriceRanges(new Set()); setAvailability(new Set()); }
                  : undefined}
              />
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {displayProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelect={(p) => setFeaturedSelection((prev) => ({ id: p.id, nonce: (prev?.nonce ?? 0) + 1 }))}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
