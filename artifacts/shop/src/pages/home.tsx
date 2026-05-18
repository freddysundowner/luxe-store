import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "wouter";
import {
  Search, Sparkles, X, Heart, ShoppingBag, RefreshCw,
  MessageCircle, Share2
} from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { ProductCard } from "@/components/ProductCard";
import { StoreLogo } from "@/components/StoreLogo";
import { TikTokFeed } from "@/components/TikTokFeed";
import {
  useListProducts, getListProductsQueryKey,
  useListCategories, getListCategoriesQueryKey,
  Product,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

// ── Desktop featured TikTok swiper (center column) ─────────────────────────

function FeaturedSwiper({ products }: { products: Product[] }) {
  const [index, setIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [cartAdded, setCartAdded] = useState<Set<number>>(new Set());
  const [touchStartY, setTouchStartY] = useState(0);
  const { addItem } = useCart();
  const { toast } = useToast();

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

  const toggleLike = (id: number) =>
    setLiked((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const handleCart = (product: Product) => {
    addItem(product, 1);
    setCartAdded((prev) => new Set(prev).add(product.id));
    toast({ title: "Added to bag", description: `${product.name} added.`, duration: 2000 });
  };

  if (!current) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0a0a0a]">
        <ShoppingBag className="w-10 h-10 text-zinc-800" />
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
        <span className="text-[9px] uppercase tracking-widest text-[#D4AF37]/50">
          Featured Drops
        </span>
      </div>

      {/* Vertical dot indicators — right edge */}
      {featured.length > 1 && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 z-10">
          {featured.map((_, i) => (
            <button
              key={i}
              onClick={() => !isFading && setIndex(i)}
              className="rounded-full transition-all"
              style={{
                width: "4px",
                height: i === index ? "20px" : "4px",
                background: i === index ? "#D4AF37" : "rgba(255,255,255,0.15)",
              }}
            />
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="absolute right-10 z-10 flex flex-col gap-4" style={{ bottom: "220px" }}>
        <button onClick={() => toggleLike(current.id)} className="flex flex-col items-center gap-0.5">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all ${
              liked.has(current.id) ? "bg-red-500" : "bg-black/60 backdrop-blur-sm border border-white/10"
            }`}
          >
            <Heart className={`w-4 h-4 ${liked.has(current.id) ? "fill-white text-white" : "text-white"}`} />
          </div>
          <span className="text-[9px] text-white/35">{liked.has(current.id) ? "1" : "0"}</span>
        </button>
        <button className="flex flex-col items-center gap-0.5">
          <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-lg">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <span className="text-[9px] text-white/35">12</span>
        </button>
        <button className="flex flex-col items-center gap-0.5">
          <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-lg">
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
        <button
          onClick={() => handleCart(current)}
          disabled={!current.inStock}
          className={`w-full py-3 text-xs uppercase tracking-widest font-semibold transition-colors ${
            !current.inStock
              ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
              : cartAdded.has(current.id)
              ? "bg-zinc-800 text-[#D4AF37] border border-[#D4AF37]/40"
              : "bg-[#D4AF37] text-black hover:bg-white"
          }`}
        >
          {!current.inStock ? "Sold Out" : cartAdded.has(current.id) ? "✓ Added to Bag" : "Add to Bag →"}
        </button>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-1 z-20 pointer-events-none">
        <span className="text-[8px] text-zinc-700 tracking-widest uppercase">
          scroll · ↑ ↓ keyboard
        </span>
      </div>
    </div>
  );
}

// ── Home page ───────────────────────────────────────────────────────────────

export default function Home() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const { itemCount } = useCart();

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

  const displayProducts: Product[] = useMemo(
    () => [...(products ?? [])].sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0)),
    [products]
  );

  const isLoading = isLoadingProducts;

  // ── Mobile: true full-screen TikTok (bypasses RootLayout header) ──────────
  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col" style={{ zIndex: 100 }}>
        <TikTokFeed products={displayProducts} isLoading={isLoading} topOffset={12} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col" style={{ zIndex: 100 }}>
      {/* Floating cart */}
      <Link
        href="/cart"
        className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-[#0a0a0a]/80 backdrop-blur border border-zinc-800 rounded-full px-3 py-2 text-zinc-300 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition-all"
      >
        <ShoppingBag className="w-4 h-4" />
        {itemCount > 0 && (
          <span className="bg-[#D4AF37] text-black text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {itemCount}
          </span>
        )}
      </Link>

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

            {/* Price range */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3">
                Price Range
              </p>
              <div className="flex flex-col gap-2">
                {["Under $20", "$20 – $50", "$50 – $100", "Over $100"].map((range) => (
                  <label
                    key={range}
                    className="flex items-center gap-2 text-xs text-zinc-500 cursor-pointer hover:text-zinc-300 transition-colors select-none"
                  >
                    <span className="w-3 h-3 border border-zinc-700 rounded-sm flex-shrink-0" />
                    {range}
                  </label>
                ))}
              </div>
            </div>

            {/* Availability */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3">
                Availability
              </p>
              <div className="flex flex-col gap-2">
                {["In Stock", "Sale Items", "New Arrivals"].map((opt) => (
                  <label
                    key={opt}
                    className="flex items-center gap-2 text-xs text-zinc-500 cursor-pointer hover:text-zinc-300 transition-colors select-none"
                  >
                    <span className="w-3 h-3 border border-zinc-700 rounded-sm flex-shrink-0" />
                    {opt}
                  </label>
                ))}
              </div>
            </div>

            {/* Gift Finder CTA */}
            <div className="mt-auto pt-4 border-t border-zinc-900">
              <button className="w-full py-2.5 bg-[#D4AF37]/10 border border-[#D4AF37]/25 text-[#D4AF37] text-[10px] tracking-widest uppercase rounded hover:bg-[#D4AF37]/20 transition-colors flex items-center justify-center gap-2">
                <Sparkles className="w-3 h-3" />
                Gift Finder
              </button>
            </div>
          </div>
        </aside>

        {/* Center — Featured swiper */}
        <div className="w-[460px] shrink-0 border-r border-zinc-900 flex flex-col overflow-hidden">
          {allProducts ? (
            <FeaturedSwiper products={allProducts} />
          ) : (
            <div className="flex-1 bg-[#0a0a0a] flex items-center justify-center">
              <Skeleton className="w-full h-full bg-zinc-900" />
            </div>
          )}
        </div>

        {/* Right — All products grid */}
        <div className="flex-1 overflow-y-auto bg-[#0a0a0a]">
          <div className="p-5 lg:p-6">
            {/* Header row */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-zinc-500">
                  {selectedCategory
                    ? categories?.find((c) => c.id === selectedCategory)?.name
                    : "All Products"}
                  {!isLoading && (
                    <span className="ml-2 text-zinc-700">· {displayProducts.length} items</span>
                  )}
                </p>
              </div>
              <select className="bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs px-3 py-1.5 rounded focus:outline-none focus:border-[#D4AF37]/30 transition-colors">
                <option>Featured first</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Newest</option>
              </select>
            </div>

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
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="bg-zinc-900 border border-zinc-800 p-4 mb-6 inline-flex">
                  <Search className="h-7 w-7 text-zinc-700" />
                </div>
                <h3 className="font-light text-base mb-2 text-zinc-200 uppercase tracking-wide">
                  No products found
                </h3>
                <p className="text-zinc-600 text-sm max-w-[240px]">
                  {search
                    ? `Nothing matches "${search}"`
                    : "No products in this category yet."}
                </p>
                {(search || selectedCategory) && (
                  <button
                    onClick={() => { clearSearch(); setSelectedCategory(undefined); }}
                    className="mt-6 text-[#D4AF37] text-xs uppercase tracking-widest hover:text-white transition-colors"
                  >
                    Clear filters
                  </button>
                )}
              </div>
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
