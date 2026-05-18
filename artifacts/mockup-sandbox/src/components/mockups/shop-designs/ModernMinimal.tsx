import React, { useState, useEffect } from "react";
import { Search, Plus, ShoppingBag, Menu, Check } from "lucide-react";

const PRODUCTS = [
  {
    id: 1,
    name: "Wireless Earbuds Pro",
    category: "Electronics",
    price: 29.99,
    originalPrice: 59.99,
    image: "/__mockup/images/mm-earbuds.jpg",
  },
  {
    id: 2,
    name: "Smart Phone Case",
    category: "Electronics",
    price: 9.99,
    originalPrice: null,
    image: "/__mockup/images/mm-phonecase.jpg",
  },
  {
    id: 3,
    name: "USB-C Fast Charger",
    category: "Electronics",
    price: 14.99,
    originalPrice: 24.99,
    image: "/__mockup/images/charger.jpg",
  },
  {
    id: 4,
    name: "Oversized Hoodie",
    category: "Clothing",
    price: 24.99,
    originalPrice: 39.99,
    image: "/__mockup/images/hoodie.jpg",
  },
  {
    id: 5,
    name: "Classic White Sneakers",
    category: "Clothing",
    price: 39.99,
    originalPrice: null,
    image: "/__mockup/images/sneakers.jpg",
  },
  {
    id: 6,
    name: "Coffee Maker Deluxe",
    category: "Home & Kitchen",
    price: 49.99,
    originalPrice: 79.99,
    image: "/__mockup/images/coffee-maker.jpg",
  },
  {
    id: 7,
    name: "Non-Stick Pan Set",
    category: "Home & Kitchen",
    price: 34.99,
    originalPrice: null,
    image: "/__mockup/images/pan-set.jpg",
  },
  {
    id: 8,
    name: "Silk Face Serum",
    category: "Beauty",
    price: 22.99,
    originalPrice: null,
    image: "/__mockup/images/mm-serum.jpg",
  },
];

const CATEGORIES = ["All", "Electronics", "Clothing", "Home & Kitchen", "Beauty"];

export function ModernMinimal() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [scrolled, setScrolled] = useState(false);
  const [addedToCart, setAddedToCart] = useState<number | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleAddToCart = (id: number) => {
    setAddedToCart(id);
    setCartCount((c) => c + 1);
    setTimeout(() => setAddedToCart(null), 1500);
  };

  const filteredProducts = PRODUCTS.filter(
    (p) =>
      (activeCategory === "All" || p.category === activeCategory) &&
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white font-sans text-zinc-900 selection:bg-zinc-200 selection:text-zinc-900">
      {/* Header */}
      <header
        className={`sticky top-0 z-50 w-full bg-white transition-shadow duration-200 ${
          scrolled ? "shadow-sm" : ""
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button className="md:hidden p-2 -ml-2 text-zinc-600 hover:text-zinc-900">
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
                  <span className="font-bold leading-none text-sm">M</span>
                </div>
                <span className="hidden sm:block text-lg font-medium tracking-tight">
                  My Drop Shop
                </span>
              </div>
            </div>

            <div className="flex flex-1 items-center justify-end md:justify-center px-4 max-w-2xl">
              <div className="relative w-full hidden md:block">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Search className="h-4 w-4 text-zinc-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-full rounded-full bg-zinc-100 pl-11 pr-4 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 transition-all"
                />
              </div>
              <button className="md:hidden p-2 text-zinc-600 hover:text-zinc-900">
                <Search className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center">
              <button className="relative p-2 text-zinc-600 hover:text-zinc-900 transition-colors">
                <ShoppingBag className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white ring-2 ring-white">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        <div className="mb-12">
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-zinc-900">
            Our Products
          </h1>
          <p className="mt-3 text-zinc-400 text-lg">
            Carefully curated essentials for your everyday life.
          </p>
        </div>

        <div className="mb-12 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-colors duration-200 ${
                activeCategory === cat
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4 xl:gap-x-6">
            {filteredProducts.map((product) => {
              const discount = product.originalPrice
                ? Math.round(
                    ((product.originalPrice - product.price) / product.originalPrice) * 100
                  )
                : null;

              return (
                <div key={product.id} className="group flex flex-col bg-white rounded-t-xl hover:shadow-md transition-shadow duration-300 pb-4">
                  <div className="relative aspect-[4/5] w-full overflow-hidden rounded-t-xl bg-zinc-50">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                    />
                    
                    {discount && (
                      <div className="absolute right-3 top-3 z-10 rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                        -{discount}%
                      </div>
                    )}
                  </div>

                  <div className="mt-5 px-1 flex flex-1 flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-zinc-900">
                        {product.name}
                      </h3>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        {product.category}
                      </p>
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-bold text-zinc-900">
                          ${product.price.toFixed(2)}
                        </span>
                        {product.originalPrice && (
                          <span className="text-xs text-zinc-400 line-through">
                            ${product.originalPrice.toFixed(2)}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleAddToCart(product.id)}
                        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200 ${
                          addedToCart === product.id
                            ? "bg-zinc-900 text-white"
                            : "bg-zinc-900 text-white hover:bg-[#D4AF37] hover:text-black"
                        }`}
                        aria-label="Add to cart"
                      >
                        {addedToCart === product.id ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-zinc-50/50 py-12">
            <div className="text-zinc-300">
              <Search className="h-12 w-12 mx-auto mb-4" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-medium text-zinc-900">No products found</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Try adjusting your search or category filters.
            </p>
            <button 
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("All");
              }}
              className="mt-6 rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
            >
              Clear filters
            </button>
          </div>
        )}
      </main>
      <footer className="border-t border-zinc-100 py-12 text-center">
        <p className="text-xs text-zinc-400">
          © 2025 My Drop Shop. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

export default ModernMinimal;
