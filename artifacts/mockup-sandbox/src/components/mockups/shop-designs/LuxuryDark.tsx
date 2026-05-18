import React, { useState } from "react";
import { Search, ShoppingBag, Menu, X } from "lucide-react";

const PRODUCTS = [
  {
    id: 1,
    name: "Luxury Mechanical Watch",
    price: 4999.00,
    originalPrice: null,
    image: "/__mockup/images/watch.jpg",
    category: "Accessories",
  },
  {
    id: 2,
    name: "Wireless Earbuds Pro",
    price: 299.00,
    originalPrice: 349.00,
    image: "/__mockup/images/earbuds.jpg",
    category: "Electronics",
  },
  {
    id: 3,
    name: "Oversized Cashmere Hoodie",
    price: 450.00,
    originalPrice: null,
    image: "/__mockup/images/hoodie.jpg",
    category: "Clothing",
  },
  {
    id: 4,
    name: "Titanium Phone Case",
    price: 120.00,
    originalPrice: 150.00,
    image: "/__mockup/images/case.jpg",
    category: "Electronics",
  },
  {
    id: 5,
    name: "Coffee Maker Deluxe",
    price: 890.00,
    originalPrice: 1100.00,
    image: "/__mockup/images/coffee.jpg",
    category: "Home & Kitchen",
  },
  {
    id: 6,
    name: "Classic White Sneakers",
    price: 320.00,
    originalPrice: null,
    image: "/__mockup/images/sneakers.jpg",
    category: "Clothing",
  },
  {
    id: 7,
    name: "Professional Pan Set",
    price: 450.00,
    originalPrice: 600.00,
    image: "/__mockup/images/pan.jpg",
    category: "Home & Kitchen",
  },
  {
    id: 8,
    name: "GaN Fast Charger",
    price: 85.00,
    originalPrice: 100.00,
    image: "/__mockup/images/charger.jpg",
    category: "Electronics",
  },
];

const CATEGORIES = ["All", "Electronics", "Clothing", "Home & Kitchen", "Accessories"];

export function LuxuryDark() {
  const [activeCategory, setActiveCategory] = useState("All");
  
  const filteredProducts = activeCategory === "All" 
    ? PRODUCTS 
    : PRODUCTS.filter(p => p.category === activeCategory);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 font-sans selection:bg-[#D4AF37] selection:text-black pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-[#0a0a0a]/90 backdrop-blur-md border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex-1 flex items-center">
              <button className="p-2 -ml-2 mr-2 md:hidden text-zinc-400 hover:text-[#D4AF37] transition-colors">
                <Menu size={24} />
              </button>
              <h1 className="text-2xl tracking-[0.2em] font-light text-[#D4AF37] uppercase">
                Aura
              </h1>
            </div>
            
            <div className="hidden md:flex flex-1 max-w-md mx-4 relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-zinc-600 group-focus-within:text-[#D4AF37] transition-colors" />
              </div>
              <input 
                type="text" 
                placeholder="Search collection..." 
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-full py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-all"
              />
            </div>
            
            <div className="flex-1 flex justify-end items-center space-x-4 md:space-x-6">
              <button className="md:hidden p-2 text-zinc-400 hover:text-[#D4AF37] transition-colors">
                <Search size={22} />
              </button>
              <button className="relative p-2 text-zinc-400 hover:text-[#D4AF37] transition-colors">
                <ShoppingBag size={22} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-[#D4AF37] rounded-full"></span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div>
            <h2 className="text-3xl font-light text-white tracking-wide mb-2">Curated Selection</h2>
            <p className="text-zinc-500 font-light tracking-wide text-sm uppercase">Exclusive pieces for the discerning</p>
          </div>
          
          <div className="flex flex-wrap gap-2 md:gap-3">
            {CATEGORIES.map(category => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-5 py-2 text-xs uppercase tracking-widest rounded-full transition-all duration-300 ${
                  activeCategory === category 
                    ? 'bg-[#D4AF37] text-black font-medium' 
                    : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
          {filteredProducts.map(product => (
            <div key={product.id} className="group cursor-pointer">
              <div className="relative aspect-[4/5] overflow-hidden bg-zinc-900 mb-4 border border-zinc-900 group-hover:border-[#D4AF37]/50 transition-colors duration-500">
                {product.originalPrice && (
                  <div className="absolute top-3 right-3 z-10 px-2 py-1 bg-black/80 backdrop-blur text-[10px] uppercase tracking-widest text-[#D4AF37] border border-[#D4AF37]/30">
                    Sale
                  </div>
                )}
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out opacity-80 group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-60"></div>
                
                {/* Quick Add Button */}
                <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out">
                  <button className="w-full py-3 bg-[#D4AF37] text-black text-xs uppercase tracking-widest font-medium hover:bg-white hover:text-black transition-colors">
                    Add to Bag
                  </button>
                </div>
              </div>
              
              <div className="flex flex-col space-y-1 px-1">
                <div className="flex justify-between items-start gap-4">
                  <h3 className="text-sm font-light text-zinc-100 uppercase tracking-wide leading-relaxed group-hover:text-[#D4AF37] transition-colors">
                    {product.name}
                  </h3>
                  <div className="flex flex-col items-end text-sm">
                    <span className="text-[#D4AF37] font-medium">${product.price.toFixed(2)}</span>
                    {product.originalPrice && (
                      <span className="text-zinc-600 line-through text-xs mt-0.5">${product.originalPrice.toFixed(2)}</span>
                    )}
                  </div>
                </div>
                <p className="text-zinc-600 text-xs tracking-wider">{product.category}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
