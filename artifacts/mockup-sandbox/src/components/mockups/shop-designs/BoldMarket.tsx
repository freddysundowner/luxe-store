import React, { useState } from "react";
import { Search, ShoppingCart, Menu, Star, ChevronDown } from "lucide-react";

export function BoldMarket() {
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = ["All", "Electronics", "Clothing", "Home & Kitchen", "Accessories"];

  const products = [
    {
      id: 1,
      name: "Wireless Earbuds Pro",
      price: 49.99,
      originalPrice: 89.99,
      image: "/__mockup/images/earbuds.jpg",
      rating: 4.8,
      reviews: 124,
      featured: true,
      category: "Electronics"
    },
    {
      id: 2,
      name: "Oversized Street Hoodie",
      price: 34.99,
      originalPrice: null,
      image: "/__mockup/images/hoodie.jpg",
      rating: 4.6,
      reviews: 89,
      featured: false,
      category: "Clothing"
    },
    {
      id: 3,
      name: "Minimalist Phone Case",
      price: 14.99,
      originalPrice: 24.99,
      image: "/__mockup/images/phone-case.jpg",
      rating: 4.9,
      reviews: 210,
      featured: false,
      category: "Accessories"
    },
    {
      id: 4,
      name: "Coffee Maker Deluxe",
      price: 45.00,
      originalPrice: 60.00,
      image: "/__mockup/images/coffee-maker.jpg",
      rating: 4.7,
      reviews: 56,
      featured: true,
      category: "Home & Kitchen"
    },
    {
      id: 5,
      name: "Classic White Sneakers",
      price: 39.99,
      originalPrice: 59.99,
      image: "/__mockup/images/sneakers.jpg",
      rating: 4.5,
      reviews: 312,
      featured: false,
      category: "Clothing"
    },
    {
      id: 6,
      name: "Non-Stick Pan Set",
      price: 42.50,
      originalPrice: null,
      image: "/__mockup/images/pan-set.jpg",
      rating: 4.8,
      reviews: 78,
      featured: false,
      category: "Home & Kitchen"
    },
    {
      id: 7,
      name: "USB-C Fast Charger",
      price: 9.99,
      originalPrice: 19.99,
      image: "/__mockup/images/charger.jpg",
      rating: 4.9,
      reviews: 504,
      featured: false,
      category: "Electronics"
    },
    {
      id: 8,
      name: "Smart Watch Elite",
      price: 49.99,
      originalPrice: 99.99,
      image: "/__mockup/images/smart-watch.jpg",
      rating: 4.7,
      reviews: 156,
      featured: true,
      category: "Electronics"
    }
  ];

  const filteredProducts = activeCategory === "All" 
    ? products 
    : products.filter(p => p.category === activeCategory);

  return (
    <div className="min-h-screen bg-[#f5f5f5] font-sans">
      {/* Header */}
      <header className="bg-[#1a1200] text-white sticky top-0 z-50 shadow-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button className="lg:hidden text-white hover:text-[#ffc800] transition-colors">
              <Menu size={24} />
            </button>
            <div className="text-[#ffc800] font-black text-2xl tracking-tight uppercase flex items-center gap-1">
              <span className="bg-[#ffc800] text-[#1a1200] px-2 py-0.5 rounded-sm">B</span>
              OLDMARKET
            </div>
          </div>
          
          <div className="flex-1 max-w-2xl hidden md:flex items-center bg-white/10 rounded-full border border-white/20 focus-within:border-[#ffc800] focus-within:bg-white transition-all group overflow-hidden">
            <div className="pl-4 text-white/50 group-focus-within:text-[#1a1200]">
              <Search size={18} />
            </div>
            <input 
              type="text" 
              placeholder="Search for bold deals..." 
              className="w-full bg-transparent border-none py-2 px-3 text-sm text-white group-focus-within:text-[#1a1200] focus:outline-none placeholder:text-white/50 group-focus-within:placeholder:text-black/40"
            />
            <button className="bg-[#ffc800] text-[#1a1200] font-bold px-4 py-2 hover:bg-[#ffb400] transition-colors">
              SEARCH
            </button>
          </div>

          <div className="flex items-center gap-6">
            <button className="hidden md:flex items-center gap-1 text-sm font-bold hover:text-[#ffc800] transition-colors">
              ACCOUNT <ChevronDown size={14} />
            </button>
            <button className="relative p-2 text-white hover:text-[#ffc800] transition-colors">
              <ShoppingCart size={24} />
              <span className="absolute top-0 right-0 bg-[#ffc800] text-[#1a1200] text-xs font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#1a1200]">
                3
              </span>
            </button>
          </div>
        </div>
        
        {/* Mobile Search */}
        <div className="md:hidden px-4 pb-3">
          <div className="flex items-center bg-white/10 rounded-full border border-white/20 focus-within:border-[#ffc800] focus-within:bg-white transition-all group overflow-hidden">
            <div className="pl-3 text-white/50 group-focus-within:text-[#1a1200]">
              <Search size={16} />
            </div>
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full bg-transparent border-none py-2 px-2 text-sm text-white group-focus-within:text-[#1a1200] focus:outline-none placeholder:text-white/50 group-focus-within:placeholder:text-black/40"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Categories */}
        <div className="flex items-center gap-3 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`whitespace-nowrap px-6 py-2.5 rounded-full font-bold text-sm transition-all shadow-sm border-2 ${
                activeCategory === category 
                  ? "bg-[#ffc800] text-[#1a1200] border-[#ffc800]" 
                  : "bg-white text-[#1a1200] border-transparent hover:border-[#ffc800]"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Sales Banner */}
        <div className="bg-[#1a1200] rounded-2xl p-6 md:p-10 mb-8 flex flex-col md:flex-row items-center justify-between text-white overflow-hidden relative shadow-lg">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#ffc800] rounded-full blur-[100px] opacity-20 -mr-20 -mt-20"></div>
          <div className="relative z-10 max-w-lg mb-6 md:mb-0">
            <div className="inline-block bg-[#ffc800] text-[#1a1200] font-black text-xs px-3 py-1 uppercase tracking-widest rounded-sm mb-4">
              Flash Sale
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-2 leading-tight uppercase">
              Bold deals <br/>
              <span className="text-[#ffc800]">drop daily.</span>
            </h2>
            <p className="text-white/80 font-medium mb-6">
              Up to 60% off top electronics, clothing, and home goods. Don't miss out.
            </p>
            <button className="bg-[#ffc800] text-[#1a1200] font-black px-8 py-3 rounded-full hover:bg-white hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,200,0,0.3)]">
              SHOP DEALS NOW
            </button>
          </div>
          <div className="relative z-10 grid grid-cols-2 gap-4">
            <img src="/__mockup/images/earbuds.jpg" alt="Earbuds" className="w-32 h-32 md:w-40 md:h-40 object-cover rounded-xl border-4 border-white/10 shadow-xl rotate-[-5deg]" />
            <img src="/__mockup/images/smart-watch.jpg" alt="Watch" className="w-32 h-32 md:w-40 md:h-40 object-cover rounded-xl border-4 border-white/10 shadow-xl rotate-[5deg] translate-y-4" />
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-black text-[#1a1200] uppercase tracking-tight">
            {activeCategory === "All" ? "Trending Now" : activeCategory}
          </h3>
          <span className="text-sm font-bold text-gray-500">{filteredProducts.length} items</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-5">
          {filteredProducts.map((product) => (
            <div 
              key={product.id} 
              className="bg-[#fffbf0] rounded-2xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_24px_rgba(26,18,0,0.12)] transition-all group flex flex-col h-full border border-[#1a1200]/5"
            >
              <div className="relative aspect-square overflow-hidden bg-white">
                {product.featured && (
                  <div className="absolute top-3 left-0 bg-[#ffc800] text-[#1a1200] font-black text-[10px] sm:text-xs px-3 py-1 uppercase tracking-wider z-10 rounded-r-md shadow-md">
                    FEATURED
                  </div>
                )}
                <button className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-white shadow-sm transition-colors opacity-0 group-hover:opacity-100">
                  <Star size={16} />
                </button>
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              
              <div className="p-4 flex flex-col flex-1">
                <div className="flex items-center gap-1 mb-1.5">
                  <Star size={12} className="fill-[#ffc800] text-[#ffc800]" />
                  <span className="text-xs font-bold text-[#1a1200]">{product.rating}</span>
                  <span className="text-xs text-gray-400">({product.reviews})</span>
                </div>
                
                <h4 className="font-bold text-[#1a1200] text-sm md:text-base mb-2 line-clamp-2 leading-tight">
                  {product.name}
                </h4>
                
                <div className="mt-auto pt-3 flex items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="font-black text-lg md:text-xl text-[#1a1200] leading-none">
                      ${product.price.toFixed(2)}
                    </span>
                    {product.originalPrice && (
                      <span className="text-xs font-bold text-gray-400 line-through mt-0.5">
                        ${product.originalPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <button className="w-10 h-10 md:w-auto md:h-auto md:px-4 md:py-2 bg-[#1a1200] md:bg-[#ffc800] text-[#ffc800] md:text-[#1a1200] rounded-full font-black text-sm hover:scale-105 active:scale-95 transition-transform flex items-center justify-center shrink-0">
                    <ShoppingCart size={18} className="md:hidden" />
                    <span className="hidden md:inline">ADD</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
