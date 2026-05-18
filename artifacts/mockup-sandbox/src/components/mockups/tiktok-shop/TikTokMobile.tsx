import { useState } from "react";

const products = [
  { id: 1, name: "Wireless Earbuds Pro", category: "Electronics", price: 29.99, originalPrice: 59.99, image: "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=800&auto=format&fit=crop", sale: true },
  { id: 5, name: "Sneakers Classic White", category: "Clothing", price: 39.99, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop" },
  { id: 2, name: "Smart Phone Case", category: "Electronics", price: 9.99, image: "https://images.unsplash.com/photo-1601593346740-925612772716?w=800&auto=format&fit=crop", isNew: true },
  { id: 4, name: "Oversized Hoodie", category: "Clothing", price: 24.99, originalPrice: 39.99, image: "https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=800&auto=format&fit=crop", sale: true },
  { id: 6, name: "Coffee Maker Deluxe", category: "Home & Kitchen", price: 89.99, image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format&fit=crop", isNew: true },
  { id: 7, name: "Non-Stick Pan Set", category: "Home & Kitchen", price: 49.99, originalPrice: 79.99, image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&auto=format&fit=crop", sale: true },
  { id: 3, name: "USB-C Fast Charger", category: "Electronics", price: 14.99, image: "https://images.unsplash.com/photo-1588200618450-3a5b1d3b9aa5?w=800&auto=format&fit=crop", sale: true },
];

export function TikTokMobile() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [cartItems, setCartItems] = useState<Set<number>>(new Set());
  const [touchStartY, setTouchStartY] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"up" | "down" | null>(null);

  const current = products[currentIndex];

  const navigate = (dir: "up" | "down") => {
    if (isTransitioning) return;
    if (dir === "up" && currentIndex >= products.length - 1) return;
    if (dir === "down" && currentIndex <= 0) return;
    setSlideDirection(dir);
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((i) => (dir === "up" ? i + 1 : i - 1));
      setSlideDirection(null);
      setIsTransitioning(false);
    }, 250);
  };

  const toggleLike = () =>
    setLiked((prev) => {
      const n = new Set(prev);
      n.has(current.id) ? n.delete(current.id) : n.add(current.id);
      return n;
    });

  const addToCart = () =>
    setCartItems((prev) => {
      const n = new Set(prev);
      n.add(current.id);
      return n;
    });

  return (
    <div
      className="w-full h-screen bg-black relative overflow-hidden"
      style={{ fontFamily: "Inter, sans-serif", touchAction: "none" }}
      onTouchStart={(e) => setTouchStartY(e.touches[0].clientY)}
      onTouchEnd={(e) => {
        const diff = touchStartY - e.changedTouches[0].clientY;
        if (Math.abs(diff) > 40) navigate(diff > 0 ? "up" : "down");
      }}
    >
      {/* Full-screen product image */}
      <div
        className="absolute inset-0 transition-opacity duration-250"
        style={{ opacity: isTransitioning ? 0 : 1 }}
      >
        <img
          src={current.image}
          alt={current.name}
          className="w-full h-full object-cover"
        />
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-[#0a0a0a]/50" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0a0a0a]/20" />
      </div>

      {/* Header overlay */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex flex-col leading-none">
          <span
            className="text-[#D4AF37] font-light tracking-[0.3em]"
            style={{ fontFamily: "Georgia, serif", fontSize: "15px" }}
          >
            LUXE
          </span>
          <span
            className="text-[#D4AF37]/50 tracking-[0.4em]"
            style={{ fontSize: "6px" }}
          >
            STORE
          </span>
        </div>
        <div className="text-[10px] text-white/40 tracking-widest absolute left-0 right-0 text-center pointer-events-none">
          {currentIndex + 1} / {products.length}
        </div>
        <div className="relative">
          <span className="text-xl">🛒</span>
          {cartItems.size > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#D4AF37] text-black text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {cartItems.size}
            </span>
          )}
        </div>
      </div>

      {/* Right-side action buttons */}
      <div className="absolute right-3 z-20 flex flex-col gap-5"
        style={{ bottom: "200px" }}>
        {/* Like */}
        <button onClick={toggleLike} className="flex flex-col items-center gap-1">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-xl transition-all duration-200 ${
              liked.has(current.id)
                ? "bg-red-500 scale-110"
                : "bg-black/50 backdrop-blur-sm border border-white/15"
            }`}
          >
            ♥
          </div>
          <span className="text-[9px] text-white/50">
            {liked.has(current.id) ? "1" : "0"}
          </span>
        </button>

        {/* Comment */}
        <button className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm border border-white/15 flex items-center justify-center text-xl shadow-xl">
            💬
          </div>
          <span className="text-[9px] text-white/50">12</span>
        </button>

        {/* Share */}
        <button className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm border border-white/15 flex items-center justify-center shadow-xl">
            <span className="text-lg leading-none">↑</span>
          </div>
          <span className="text-[9px] text-white/50">Share</span>
        </button>

        {/* AI Gift Finder */}
        <button className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center shadow-xl">
            <span className="text-lg">✨</span>
          </div>
          <span className="text-[9px] text-[#D4AF37]/60">AI</span>
        </button>
      </div>

      {/* Swipe up hint */}
      {currentIndex < products.length - 1 && (
        <div className="absolute left-0 right-0 z-10 flex justify-center pointer-events-none"
          style={{ bottom: "185px" }}>
          <div className="flex flex-col items-center gap-0.5 animate-bounce">
            <span className="text-white/25 text-xs">↑</span>
            <span className="text-[8px] text-white/25 tracking-widest">swipe up</span>
          </div>
        </div>
      )}

      {/* Progress bar — right side */}
      <div className="absolute right-0 top-20 bottom-20 w-0.5 bg-white/5 z-10">
        <div
          className="bg-[#D4AF37]/60 w-full rounded-full transition-all duration-300"
          style={{
            height: `${((currentIndex + 1) / products.length) * 100}%`,
          }}
        />
      </div>

      {/* Bottom info panel */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 px-5 pt-12 pb-8"
        style={{
          background:
            "linear-gradient(to top, rgba(10,10,10,1) 70%, rgba(10,10,10,0) 100%)",
          opacity: isTransitioning ? 0 : 1,
          transition: "opacity 0.25s",
        }}
      >
        {/* Badges */}
        <div className="flex gap-2 mb-2">
          {current.sale && (
            <span className="text-[9px] border border-[#D4AF37]/40 text-[#D4AF37] px-2 py-0.5 uppercase tracking-widest">
              Sale
            </span>
          )}
          {current.isNew && (
            <span className="text-[9px] border border-white/20 text-white/60 px-2 py-0.5 uppercase tracking-widest">
              New
            </span>
          )}
        </div>

        <p className="text-[9px] uppercase tracking-widest text-[#D4AF37]/60 mb-1">
          {current.category}
        </p>
        <h2 className="text-lg font-light uppercase tracking-wide text-white mb-2 leading-snug">
          {current.name}
        </h2>
        <div className="flex items-baseline gap-3 mb-5">
          <span className="text-2xl text-[#D4AF37] font-light">
            ${current.price}
          </span>
          {current.originalPrice && (
            <span className="text-zinc-600 line-through text-sm">
              ${current.originalPrice}
            </span>
          )}
        </div>

        <button
          onClick={addToCart}
          className={`w-full py-3.5 text-sm uppercase tracking-widest font-semibold transition-all duration-200 ${
            cartItems.has(current.id)
              ? "bg-zinc-800 text-[#D4AF37] border border-[#D4AF37]/40"
              : "bg-[#D4AF37] text-black hover:bg-white"
          }`}
        >
          {cartItems.has(current.id) ? "✓ Added to Bag" : "Add to Bag →"}
        </button>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mt-4">
          {products.slice(0, 7).map((_, i) => (
            <button
              key={i}
              onClick={() => !isTransitioning && setCurrentIndex(i)}
              className={`rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? "w-5 h-1.5 bg-[#D4AF37]"
                  : "w-1.5 h-1.5 bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Invisible tap zones for prev/next */}
      <div className="absolute inset-x-0 z-10" style={{ top: "80px", height: "calc(100% - 320px)" }}>
        <div className="flex h-full">
          <div className="flex-1" onClick={() => navigate("down")} />
          <div className="w-20" />
          <div className="flex-1" onClick={() => navigate("up")} />
        </div>
      </div>
    </div>
  );
}
