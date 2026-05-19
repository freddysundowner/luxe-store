import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "wouter";
import {
  Search, Sparkles, X, Gift, Heart, ShoppingBag, RefreshCw,
  MessageCircle, Share2, Droplets, Send
} from "lucide-react";
import { useCart } from "@/lib/cart-context";
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
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyFeed } from "@/components/EmptyFeed";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Helmet } from "react-helmet-async";

const fmt = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 });

// ── Desktop featured TikTok swiper (center column) ─────────────────────────

function FeaturedSwiper({ products, onClear }: { products: Product[]; onClear?: () => void }) {
  const [index, setIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [cartAdded, setCartAdded] = useState<Set<number>>(new Set());
  const [touchStartY, setTouchStartY] = useState(0);
  const [giftProduct, setGiftProduct] = useState<Product | null>(null);
  const [giftRecipient, setGiftRecipient] = useState("");
  const [giftNote, setGiftNote] = useState("");
  const [giftSender, setGiftSender] = useState("");
  const [giftStep, setGiftStep] = useState<"form" | "pay" | "done">("form");
  const [giftLink, setGiftLink] = useState("");
  const { addItem, openCart } = useCart();
  const { toast } = useToast();
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });

  const featured = useMemo(() => products, [products]);

  const current = featured.length > 0 ? featured[index] : null;

  const navigate = useCallback(
    (dir: "up" | "down") => {
      if (isFading || featured.length < 2) return;
      setIsFading(true);
      setTimeout(() => {
        setIndex((i) =>
          dir === "down" ? (i + 1) % featured.length : (i - 1 + featured.length) % featured.length
        );
        setIsFading(false);
      }, 150);
    },
    [isFading, featured.length]
  );

  // Keyboard ↑ ↓
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") navigate("up");
      if (e.key === "ArrowDown") navigate("down");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  // Mouse wheel
  useEffect(() => {
    const el = document.getElementById("featured-swiper");
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      navigate(e.deltaY > 0 ? "down" : "up");
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [navigate]);

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
    addItem(product, 1);
    setCartAdded((prev) => new Set(prev).add(product.id));
    openCart();
  };

  const handleGift = () => {
    import("@/lib/gift-finder-trigger").then(m => m.triggerGiftFinder());
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

  return (
    <div
      id="featured-swiper"
      className="flex-1 relative overflow-hidden bg-black select-none"
      style={{ touchAction: "none" }}
      onTouchStart={(e) => setTouchStartY(e.touches[0].clientY)}
      onTouchEnd={(e) => {
        const diff = touchStartY - e.changedTouches[0].clientY;
        if (Math.abs(diff) > 45) navigate(diff > 0 ? "down" : "up");
      }}
    >
      {/* Full-height image */}
      <div
        className="absolute inset-0 transition-opacity duration-150"
        style={{ opacity: isFading ? 0 : 1 }}
      >
        {current.imageUrl ? (
          <img
            key={current.id}
            src={current.imageUrl}
            alt={current.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
            <ShoppingBag className="w-14 h-14 text-zinc-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/10 to-transparent" />
      </div>

      {/* Top label */}
      <div className="absolute top-3 left-0 right-0 flex justify-center z-10 pointer-events-none">
        <div className="w-11 h-11 rounded-full bg-black/60 border border-[#D4AF37]/40 flex items-center justify-center"
          style={{ boxShadow: "0 0 12px rgba(212,175,55,0.25)" }}>
          <Droplets className="w-6 h-6" style={{ animation: "goldShimmer 2s ease-in-out infinite", color: "#D4AF37" }} />
        </div>
      </div>


      {/* Action buttons */}
      <div className="absolute right-10 z-10 flex flex-col gap-4" style={{ bottom: "220px" }}>
        <button onClick={() => openGiftSheet(current)} className="flex flex-col items-center gap-0.5">
          <div className="w-10 h-10 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/50 flex items-center justify-center shadow-lg transition-all hover:bg-[#D4AF37]/25">
            <Gift className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <span className="text-[9px] text-[#D4AF37]/60">Gift</span>
        </button>
        <Link href={`/product/${current.id}`} className="flex flex-col items-center gap-0.5">
          <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-lg hover:border-[#D4AF37]/40 transition-colors">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <span className="text-[9px] text-white/35">View</span>
        </Link>
        <button onClick={() => handleShare(current)} className="flex flex-col items-center gap-0.5">
          <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-lg hover:border-[#D4AF37]/40 transition-colors">
            <Share2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-[9px] text-white/35">Share</span>
        </button>
      </div>

      {/* Product info overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
        {current.categoryName && (
          <p className="text-[10px] uppercase tracking-widest text-[#D4AF37]/60 mb-1">
            {current.categoryName}
          </p>
        )}
        <Link href={`/product/${current.id}`}>
          <h2 className="text-xl font-light uppercase tracking-wide mb-2 hover:text-[#D4AF37] transition-colors cursor-pointer leading-snug">
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
        <style>{`
          @keyframes gift-glow {
            0%, 100% { box-shadow: 0 0 6px rgba(212,175,55,0.3), inset 0 0 6px rgba(212,175,55,0.05); }
            50% { box-shadow: 0 0 18px rgba(212,175,55,0.65), inset 0 0 10px rgba(212,175,55,0.1); }
          }
          .gift-glow-btn { animation: gift-glow 2.4s ease-in-out infinite; }
          @keyframes goldShimmer {
            0%, 100% { color: #D4AF37; filter: drop-shadow(0 0 3px rgba(212,175,55,0.4)); opacity: 0.85; }
            50% { color: #f5e27a; filter: drop-shadow(0 0 8px rgba(245,226,122,0.9)); opacity: 1; }
          }
        `}</style>
        <div className="flex gap-2">
          <button
            onClick={() => handleCart(current)}
            disabled={!current.inStock}
            className={`flex-[3] py-3 text-xs uppercase tracking-widest font-semibold transition-colors ${
              !current.inStock
                ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                : cartAdded.has(current.id)
                ? "bg-zinc-800 text-[#D4AF37] border border-[#D4AF37]/40"
                : "bg-[#D4AF37] text-black hover:bg-white"
            }`}
          >
            {!current.inStock ? "Sold Out" : cartAdded.has(current.id) ? "✓ Added" : "Buy Now →"}
          </button>
          <button
            onClick={handleGift}
            className="gift-glow-btn flex-[2] py-3 text-[9px] uppercase tracking-widest font-semibold bg-black border border-[#D4AF37]/70 text-[#D4AF37] hover:bg-[#D4AF37]/5 transition-colors flex items-center justify-center gap-1"
          >
            <Sparkles className="w-3 h-3 shrink-0" />
            Surprise Someone
          </button>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-1 z-20 pointer-events-none">
        <span className="text-[8px] text-zinc-700 tracking-widest uppercase">
          scroll · ↑ ↓ keyboard
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
    </div>
  );
}

// ── Home page ───────────────────────────────────────────────────────────────

export default function Home() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [priceRanges, setPriceRanges] = useState<Set<string>>(new Set());
  const [availability, setAvailability] = useState<Set<string>>(new Set());

  const toggleSet = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, key: string) => {
    setter(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
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
      },
    }
  );

  // All products (for featured swiper — unfiltered)
  const { data: allProducts } = useListProducts(
    {},
    { query: { queryKey: getListProductsQueryKey({}) } }
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
    const tagFilters = ["new", "sale", "hot", "bestseller", "limited", "coming_soon"].filter(t => availability.has(t));
    if (tagFilters.length > 0) {
      list = list.filter(p => p.availabilityTag != null && tagFilters.includes(p.availabilityTag));
    }

    return list.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
  }, [products, priceRanges, availability]);

  const isLoading = isLoadingProducts;

  // ── Mobile: true full-screen TikTok (bypasses RootLayout header) ──────────
  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col" style={{ zIndex: 100 }}>
        <Helmet>
          <title>Luxe Store — Curated Luxury Collection</title>
          <meta name="description" content="Shop curated luxury products at Luxe Store. Electronics, clothing, home & kitchen and more. M-Pesa & WhatsApp checkout. Fast delivery in Kenya." />
          <meta property="og:title" content="Luxe Store — Curated Luxury Collection" />
          <meta property="og:type" content="website" />
        </Helmet>
        <TikTokFeed products={displayProducts} isLoading={isLoading} topOffset={12} />
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
                  { key: "new",        label: "New Arrival" },
                  { key: "sale",       label: "Sale" },
                  { key: "hot",        label: "Hot / Trending" },
                  { key: "bestseller", label: "Bestseller" },
                  { key: "limited",    label: "Limited Edition" },
                  { key: "coming_soon", label: "Coming Soon" },
                ] as { key: string; label: string }[]).map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-xs cursor-pointer hover:text-zinc-200 transition-colors select-none"
                    style={{ color: availability.has(key) ? "#D4AF37" : "#71717a" }}>
                    <input type="checkbox" className="sr-only"
                      checked={availability.has(key)}
                      onChange={() => toggleSet(setAvailability, key)} />
                    <span className="w-3 h-3 border rounded-sm flex-shrink-0 flex items-center justify-center transition-colors"
                      style={{ borderColor: availability.has(key) ? "#D4AF37" : "#3f3f46", background: availability.has(key) ? "#D4AF37" : "transparent" }}>
                      {availability.has(key) && <span className="block w-1.5 h-1.5 bg-black rounded-sm" />}
                    </span>
                    {label}
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
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
