import React, { useState } from "react";
import { Search, ShoppingCart, Menu } from "lucide-react";

export function BoldMarket() {
  const [activeTab, setActiveTab] = useState("All");

  const categories = ["All", "Electronics", "Clothing", "Home & Kitchen", "Beauty"];

  const products = [
    {
      id: 1,
      name: "Wireless Earbuds Pro",
      category: "Electronics",
      price: 29.99,
      originalPrice: 59.99,
      image: "/__mockup/images/earbuds.jpg",
      featured: true,
    },
    {
      id: 2,
      name: "Smart Phone Case",
      category: "Electronics",
      price: 9.99,
      originalPrice: null,
      image: "/__mockup/images/phone-case.jpg",
      featured: false,
    },
    {
      id: 3,
      name: "USB-C Fast Charger",
      category: "Electronics",
      price: 14.99,
      originalPrice: 24.99,
      image: "/__mockup/images/charger.jpg",
      featured: false,
    },
    {
      id: 4,
      name: "Oversized Hoodie",
      category: "Clothing",
      price: 24.99,
      originalPrice: 39.99,
      image: "/__mockup/images/hoodie.jpg",
      featured: true,
    },
    {
      id: 5,
      name: "Classic White Sneakers",
      category: "Clothing",
      price: 39.99,
      originalPrice: null,
      image: "/__mockup/images/sneakers.jpg",
      featured: false,
    },
    {
      id: 6,
      name: "Coffee Maker Deluxe",
      category: "Home & Kitchen",
      price: 49.99,
      originalPrice: 79.99,
      image: "/__mockup/images/coffee-maker.jpg",
      featured: true,
    },
    {
      id: 7,
      name: "Non-Stick Pan Set",
      category: "Home & Kitchen",
      price: 34.99,
      originalPrice: null,
      image: "/__mockup/images/pan-set.jpg",
      featured: false,
    },
    {
      id: 8,
      name: "Silk Face Serum",
      category: "Beauty",
      price: 22.99,
      originalPrice: null,
      image: "/__mockup/images/serum.jpg",
      featured: false,
    },
  ];

  const filteredProducts = activeTab === "All" 
    ? products 
    : products.filter(p => p.category === activeTab);

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a] border-b border-amber-400">
        <div className="bg-[#0a0a0a] py-1.5 border-b border-white/10 hidden md:block">
          <p className="text-center text-amber-400 text-xs font-bold uppercase tracking-wider">
            Free shipping on orders over $50
          </p>
        </div>
        <div className="px-4 md:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center justify-between w-full md:w-auto">
            <h1 className="text-2xl font-black uppercase tracking-tighter text-white">
              MY DROP SHOP
            </h1>
            <div className="flex gap-4 items-center md:hidden">
              <button className="relative text-white hover:text-amber-400 transition-colors">
                <ShoppingCart className="w-6 h-6" />
                <span className="absolute -top-1 -right-2 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center text-[10px] font-black text-black">
                  3
                </span>
              </button>
              <Menu className="w-6 h-6 text-white" />
            </div>
          </div>
          
          <div className="w-full md:flex-1 max-w-md relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" />
            <input
              type="text"
              placeholder="Search products..."
              className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-white/50 focus:outline-none focus:border-amber-400 transition-colors text-sm"
            />
          </div>

          <div className="hidden md:flex items-center gap-6">
            <button className="text-sm font-bold text-white uppercase hover:text-amber-400 transition-colors">Log In</button>
            <button className="relative p-2 text-white hover:text-amber-400 transition-colors">
              <ShoppingCart className="w-6 h-6" />
              <span className="absolute top-0 right-0 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center text-[10px] font-black text-black">
                3
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Categories */}
      <div className="border-b border-stone-200 bg-white">
        <div className="px-4 md:px-8 max-w-7xl mx-auto flex items-center gap-8 overflow-x-auto no-scrollbar pt-1">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveTab(category)}
              className={`whitespace-nowrap py-3 text-xs font-bold uppercase transition-all relative tracking-wide ${
                activeTab === category ? "text-stone-900" : "text-stone-400 hover:text-stone-600"
              }`}
            >
              {category}
              {activeTab === category && (
                <div className="absolute bottom-0 left-0 w-full h-[4px] bg-amber-400" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="mb-10">
          <h2 className="text-[32px] font-black text-stone-900 leading-none">
            SHOP ALL <span className="relative inline-block z-10">PRODUCTS<span className="absolute bottom-1 left-0 w-full h-1.5 bg-amber-400 -z-10" /></span>
          </h2>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="group bg-white rounded-xl border border-stone-200 overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:border-amber-300 flex flex-col"
            >
              <div className="relative aspect-square bg-stone-100 overflow-hidden border-b border-stone-100">
                {product.featured && (
                  <div className="absolute top-3 left-3 z-10 bg-black px-2 py-1 rounded-full">
                    <span className="text-amber-400 text-[10px] font-black uppercase tracking-widest leading-none block">
                      Featured
                    </span>
                  </div>
                )}
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-4 flex flex-col flex-1">
                <span className="text-amber-600 text-[10px] font-bold uppercase tracking-widest mb-1.5 block">
                  {product.category}
                </span>
                <h3 className="text-stone-900 font-bold text-base mb-2 line-clamp-2 leading-tight">
                  {product.name}
                </h3>
                <div className="mt-auto mb-4 flex items-center gap-2">
                  <span className="text-lg font-black text-stone-900">
                    ${product.price.toFixed(2)}
                  </span>
                  {product.originalPrice && (
                    <span className="text-sm font-bold text-stone-400 line-through decoration-stone-300">
                      ${product.originalPrice.toFixed(2)}
                    </span>
                  )}
                </div>
                <button className="w-full bg-black text-white py-3 rounded-lg font-bold uppercase text-xs tracking-wider transition-colors group-hover:bg-amber-400 group-hover:text-black mt-auto">
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
