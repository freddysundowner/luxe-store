import { useState } from "react";

const products = [
  { id: 1, name: "Wireless Earbuds Pro", category: "Electronics", price: 29.99, originalPrice: 59.99, image: "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=600&auto=format&fit=crop", featured: true, sale: true },
  { id: 5, name: "Sneakers Classic White", category: "Clothing", price: 39.99, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop", featured: true },
  { id: 2, name: "Smart Phone Case", category: "Electronics", price: 9.99, image: "https://images.unsplash.com/photo-1601593346740-925612772716?w=600&auto=format&fit=crop", isNew: true },
  { id: 3, name: "USB-C Fast Charger", category: "Electronics", price: 14.99, image: "https://images.unsplash.com/photo-1588200618450-3a5b1d3b9aa5?w=600&auto=format&fit=crop", sale: true },
  { id: 4, name: "Oversized Hoodie", category: "Clothing", price: 24.99, originalPrice: 39.99, image: "https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=600&auto=format&fit=crop", sale: true },
  { id: 6, name: "Coffee Maker Deluxe", category: "Home & Kitchen", price: 89.99, image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&auto=format&fit=crop", isNew: true },
  { id: 7, name: "Non-Stick Pan Set", category: "Home & Kitchen", price: 49.99, originalPrice: 79.99, image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&auto=format&fit=crop", sale: true },
];

const categories = ["All", "Clothing", "Electronics", "Home & Kitchen"];

export function TikTokDesktop() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [cartItems, setCartItems] = useState<Set<number>>(new Set());

  const featured = products.filter((p) => p.featured);
  const currentFeatured = featured[featuredIndex % featured.length];
  const filtered =
    selectedCategory === "All"
      ? products
      : products.filter((p) => p.category === selectedCategory);

  const handlePrev = () =>
    setFeaturedIndex((i) => (i - 1 + featured.length) % featured.length);
  const handleNext = () =>
    setFeaturedIndex((i) => (i + 1) % featured.length);

  const toggleLike = (id: number) =>
    setLiked((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const toggleCart = (id: number) =>
    setCartItems((prev) => {
      const n = new Set(prev);
      n.add(id);
      return n;
    });

  return (
    <div
      className="min-h-screen bg-[#0a0a0a] text-white flex flex-col select-none"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* ── Header ── */}
      <header className="h-14 bg-[#0a0a0a]/95 border-b border-[#D4AF37]/20 flex items-center px-6 gap-4 sticky top-0 z-20 backdrop-blur">
        <div className="flex flex-col leading-none shrink-0 mr-4">
          <span
            className="text-[#D4AF37] font-light tracking-[0.3em]"
            style={{ fontFamily: "Georgia, serif", fontSize: "18px" }}
          >
            LUXE
          </span>
          <span
            className="text-[#D4AF37]/50 tracking-[0.4em]"
            style={{ fontSize: "7px" }}
          >
            STORE
          </span>
        </div>
        <div className="flex-1 max-w-md">
          <input
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-full px-4 py-1.5 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-[#D4AF37]/40 transition-colors"
            placeholder="Search collection..."
          />
        </div>
        <div className="ml-auto flex items-center gap-2 cursor-pointer group">
          <span className="text-lg">🛒</span>
          <span className="text-xs text-zinc-400 group-hover:text-[#D4AF37] transition-colors">
            {cartItems.size > 0 ? `${cartItems.size} item${cartItems.size > 1 ? "s" : ""}` : "Cart"}
          </span>
        </div>
      </header>

      {/* ── Body ── */}
      <div
        className="flex flex-1 overflow-hidden"
        style={{ height: "calc(100vh - 56px)" }}
      >
        {/* Left sidebar — Filters */}
        <aside className="w-48 bg-zinc-950 border-r border-zinc-900 flex flex-col p-4 gap-6 shrink-0 overflow-y-auto">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3">
              Categories
            </p>
            <div className="flex flex-col gap-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-left text-xs px-3 py-2 rounded transition-all ${
                    selectedCategory === cat
                      ? "bg-[#D4AF37] text-black font-semibold"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
                  }`}
                >
                  {cat}
                  <span className="float-right text-[10px] opacity-50">
                    {cat === "All"
                      ? products.length
                      : products.filter((p) => p.category === cat).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3">
              Price Range
            </p>
            <div className="flex flex-col gap-2">
              {["Under $20", "$20 – $50", "$50 – $100", "Over $100"].map(
                (range) => (
                  <label
                    key={range}
                    className="flex items-center gap-2 text-xs text-zinc-500 cursor-pointer hover:text-zinc-300 transition-colors"
                  >
                    <span className="w-3 h-3 border border-zinc-700 inline-block rounded-sm flex-shrink-0" />
                    {range}
                  </label>
                )
              )}
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3">
              Availability
            </p>
            <div className="flex flex-col gap-2">
              {["In Stock", "Sale Items", "New Arrivals"].map((opt) => (
                <label
                  key={opt}
                  className="flex items-center gap-2 text-xs text-zinc-500 cursor-pointer hover:text-zinc-300 transition-colors"
                >
                  <span className="w-3 h-3 border border-zinc-700 inline-block rounded-sm flex-shrink-0" />
                  {opt}
                </label>
              ))}
            </div>
          </div>

          <div className="mt-auto pt-4 border-t border-zinc-900">
            <button className="w-full py-2.5 bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-[10px] tracking-widest uppercase rounded hover:bg-[#D4AF37]/20 transition-colors">
              ✨ Gift Finder
            </button>
          </div>
        </aside>

        {/* Center — TikTok Featured Swiper */}
        <div className="w-[500px] shrink-0 bg-[#0a0a0a] border-r border-zinc-900 flex flex-col relative overflow-hidden">
          {/* Nav bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-900 z-10">
            <button
              onClick={handlePrev}
              className="text-[#D4AF37]/70 hover:text-[#D4AF37] text-xs px-2 py-1 transition-colors"
            >
              ◄
            </button>
            <span className="text-[10px] uppercase tracking-widest text-[#D4AF37]/70">
              Featured Drops
            </span>
            <button
              onClick={handleNext}
              className="text-[#D4AF37]/70 hover:text-[#D4AF37] text-xs px-2 py-1 transition-colors"
            >
              ►
            </button>
          </div>

          {/* Full-height product card */}
          <div className="flex-1 relative overflow-hidden">
            {/* Background image */}
            <div className="absolute inset-0">
              <img
                src={currentFeatured.image}
                alt={currentFeatured.name}
                className="w-full h-full object-cover transition-opacity duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/20 to-transparent" />
            </div>

            {/* Dot indicators */}
            <div className="absolute top-3 left-0 right-0 flex justify-center gap-1.5 z-10">
              {featured.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setFeaturedIndex(i)}
                  className={`rounded-full transition-all ${
                    i === featuredIndex % featured.length
                      ? "w-5 h-1.5 bg-[#D4AF37]"
                      : "w-1.5 h-1.5 bg-white/30"
                  }`}
                />
              ))}
            </div>

            {/* Right-side action buttons */}
            <div className="absolute right-3 bottom-52 flex flex-col gap-4 z-10">
              <button
                onClick={() => toggleLike(currentFeatured.id)}
                className="flex flex-col items-center gap-0.5"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-base shadow-lg transition-all ${
                    liked.has(currentFeatured.id)
                      ? "bg-red-500"
                      : "bg-black/60 backdrop-blur-sm border border-white/10"
                  }`}
                >
                  ♥
                </div>
                <span className="text-[9px] text-white/50">
                  {liked.has(currentFeatured.id) ? "1" : "0"}
                </span>
              </button>
              <button className="flex flex-col items-center gap-0.5">
                <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center text-base shadow-lg">
                  💬
                </div>
                <span className="text-[9px] text-white/50">12</span>
              </button>
              <button className="flex flex-col items-center gap-0.5">
                <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-lg">
                  <span className="text-sm">↑</span>
                </div>
                <span className="text-[9px] text-white/50">Share</span>
              </button>
            </div>

            {/* Bottom product info */}
            <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
              <p className="text-[10px] uppercase tracking-widest text-[#D4AF37]/60 mb-1">
                {currentFeatured.category}
              </p>
              <h2 className="text-xl font-light uppercase tracking-wide mb-2">
                {currentFeatured.name}
              </h2>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl text-[#D4AF37] font-light">
                  ${currentFeatured.price}
                </span>
                {currentFeatured.originalPrice && (
                  <span className="text-zinc-600 line-through text-sm">
                    ${currentFeatured.originalPrice}
                  </span>
                )}
                {currentFeatured.sale && (
                  <span className="text-[9px] border border-[#D4AF37]/30 text-[#D4AF37] px-1.5 py-0.5 uppercase tracking-wider">
                    Sale
                  </span>
                )}
              </div>
              <button
                onClick={() => toggleCart(currentFeatured.id)}
                className="w-full py-3 bg-[#D4AF37] text-black text-xs uppercase tracking-widest font-semibold hover:bg-white transition-colors"
              >
                {cartItems.has(currentFeatured.id)
                  ? "✓ Added to Bag"
                  : "Add to Bag →"}
              </button>
            </div>
          </div>

          {/* Swipe hint */}
          <div className="py-2 text-center border-t border-zinc-900">
            <span className="text-[9px] text-zinc-700 tracking-widest uppercase">
              ◄ swipe to browse ►
            </span>
          </div>
        </div>

        {/* Right — All Products Grid */}
        <div className="flex-1 overflow-y-auto bg-[#0a0a0a]">
          <div className="p-5">
            <div className="flex items-center justify-between mb-5">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500">
                All Products · {filtered.length} items
              </p>
              <select className="bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs px-3 py-1.5 rounded focus:outline-none focus:border-[#D4AF37]/30 transition-colors">
                <option>Sort: Featured</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Newest</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {filtered.map((product) => (
                <div key={product.id} className="group cursor-pointer">
                  <div className="relative aspect-square bg-zinc-900 border border-zinc-900 group-hover:border-[#D4AF37]/40 overflow-hidden transition-all duration-300 mb-2">
                    <img
                      src={product.image ?? ""}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    {/* Badges */}
                    {product.sale && (
                      <div className="absolute top-2 right-2 bg-black/80 border border-[#D4AF37]/30 text-[#D4AF37] text-[8px] px-1.5 py-0.5 uppercase tracking-wider">
                        Sale
                      </div>
                    )}
                    {product.isNew && (
                      <div className="absolute top-0 left-0 w-0 h-0 border-t-[36px] border-r-[36px] border-t-[#D4AF37] border-r-transparent" />
                    )}
                    {/* Hover CTA */}
                    <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
                      <button
                        onClick={() => toggleCart(product.id)}
                        className="w-full py-2 bg-[#D4AF37] text-black text-[9px] uppercase tracking-widest font-semibold"
                      >
                        {cartItems.has(product.id) ? "✓ Added" : "Add to Bag"}
                      </button>
                    </div>
                  </div>
                  <p className="text-[8px] uppercase tracking-widest text-zinc-600 mb-0.5">
                    {product.category}
                  </p>
                  <p className="text-[11px] font-light text-zinc-300 uppercase tracking-wide leading-snug mb-1 line-clamp-2 group-hover:text-[#D4AF37] transition-colors">
                    {product.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[#D4AF37] text-sm font-medium">
                      ${product.price}
                    </span>
                    {product.originalPrice && (
                      <span className="text-zinc-700 text-xs line-through">
                        ${product.originalPrice}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
