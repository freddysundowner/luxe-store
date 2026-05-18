import React, { useState, useEffect } from "react";
import { Search, ShoppingCart, Plus, CheckCircle2 } from "lucide-react";
import "./_ClassicPremium.css";

const CATEGORIES = ["All", "Electronics", "Clothing", "Home & Kitchen"];

const PRODUCTS = [
  {
    id: 1,
    name: "Wireless Earbuds Pro",
    category: "Electronics",
    price: 29.99,
    originalPrice: 59.99,
    image: "/__mockup/images/premium-earbuds.jpg",
    inStock: true,
  },
  {
    id: 2,
    name: "Smart Phone Case",
    category: "Electronics",
    price: 9.99,
    originalPrice: null,
    image: "/__mockup/images/premium-case.jpg",
    inStock: true,
  },
  {
    id: 3,
    name: "USB-C Fast Charger",
    category: "Electronics",
    price: 14.99,
    originalPrice: 24.99,
    image: "/__mockup/images/premium-charger.jpg",
    inStock: true,
  },
  {
    id: 4,
    name: "Oversized Hoodie",
    category: "Clothing",
    price: 24.99,
    originalPrice: 39.99,
    image: "/__mockup/images/premium-hoodie.jpg",
    inStock: true,
  },
  {
    id: 5,
    name: "Classic White Sneakers",
    category: "Clothing",
    price: 39.99,
    originalPrice: null,
    image: "/__mockup/images/premium-sneakers.jpg",
    inStock: true,
  },
  {
    id: 6,
    name: "Coffee Maker Deluxe",
    category: "Home & Kitchen",
    price: 49.99,
    originalPrice: 79.99,
    image: "/__mockup/images/premium-coffeemaker.jpg",
    inStock: true,
  },
  {
    id: 7,
    name: "Non-Stick Pan Set",
    category: "Home & Kitchen",
    price: 34.99,
    originalPrice: null,
    image: "/__mockup/images/premium-pans.jpg",
    inStock: true,
  },
  {
    id: 8,
    name: "Silk Face Serum",
    category: "Home & Kitchen",
    price: 22.99,
    originalPrice: null,
    image: "/__mockup/images/premium-serum.jpg",
    inStock: true,
  },
];

export function ClassicPremium() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const filteredProducts = PRODUCTS.filter(
    (p) => activeCategory === "All" || p.category === activeCategory
  );

  return (
    <div className="classic-premium min-h-screen text-stone-900 pb-24">
      {/* Header */}
      <header
        className={`sticky top-0 z-50 transition-colors duration-300 ${
          scrolled ? "bg-[#faf9f7]/90 backdrop-blur-md shadow-sm" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-400"></div>
            <h1 className="text-xl font-semibold tracking-tight text-stone-800">
              My Drop Shop
            </h1>
          </div>
          <button className="p-2 text-stone-700 hover:text-stone-900 transition-colors relative">
            <ShoppingCart className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full border border-white"></span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-8">
        {/* Search */}
        <div className="max-w-2xl mx-auto mb-10">
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-stone-400 group-focus-within:text-amber-500 transition-colors">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="Search for essentials..."
              className="w-full bg-stone-100 text-stone-800 placeholder:text-stone-400 rounded-2xl py-4 pl-12 pr-6 outline-none border border-transparent focus:border-amber-200 focus:bg-white transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex items-center justify-center gap-3 mb-16 overflow-x-auto no-scrollbar py-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                activeCategory === cat
                  ? "bg-amber-400 text-black shadow-sm"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Section Heading */}
        <div className="mb-10 text-center md:text-left">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-stone-900 mb-2">
            Everything You Need
          </h2>
          <p className="text-stone-400 text-lg">
            Curated daily essentials for a better life.
          </p>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-12">
          {filteredProducts.map((product) => (
            <div key={product.id} className="group cursor-pointer flex flex-col">
              <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-4 bg-stone-100">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                
                {/* Hover Add Button */}
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 group-hover:animate-scale-in">
                  <button className="bg-amber-400 hover:bg-amber-500 text-black w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-colors">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col flex-grow">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-amber-600 uppercase text-[10px] font-bold tracking-widest">
                    {product.category}
                  </span>
                </div>
                
                <h3 className="text-stone-800 font-semibold text-base mb-1.5 line-clamp-1">
                  {product.name}
                </h3>
                
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-stone-900 font-bold">
                    ${product.price.toFixed(2)}
                  </span>
                  {product.originalPrice && (
                    <span className="text-stone-400 line-through text-sm">
                      ${product.originalPrice.toFixed(2)}
                    </span>
                  )}
                </div>

                {product.inStock && (
                  <div className="flex items-center gap-1.5 mt-auto">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <span className="text-stone-500 text-xs font-medium">In stock</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default ClassicPremium;
