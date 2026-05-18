import React, { useState } from "react";
import { Search, ShoppingBag, Menu, Star } from "lucide-react";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviews: number;
}

const products: Product[] = [
  {
    id: "1",
    name: "Classic Leather Wallet",
    category: "Accessories",
    price: 45.00,
    originalPrice: 65.00,
    image: "/__mockup/images/leather-wallet.jpg",
    rating: 4.8,
    reviews: 124,
  },
  {
    id: "2",
    name: "Oversized Cashmere Hoodie",
    category: "Clothing",
    price: 125.00,
    image: "/__mockup/images/hoodie.jpg",
    rating: 4.9,
    reviews: 89,
  },
  {
    id: "3",
    name: "Coffee Maker Deluxe",
    category: "Home & Kitchen",
    price: 89.99,
    originalPrice: 120.00,
    image: "/__mockup/images/coffee-maker.jpg",
    rating: 4.7,
    reviews: 215,
  },
  {
    id: "4",
    name: "Classic White Sneakers",
    category: "Clothing",
    price: 79.99,
    image: "/__mockup/images/sneakers.jpg",
    rating: 4.6,
    reviews: 342,
  },
  {
    id: "5",
    name: "Non-Stick Pan Set",
    category: "Home & Kitchen",
    price: 110.00,
    originalPrice: 145.00,
    image: "/__mockup/images/pans.jpg",
    rating: 4.8,
    reviews: 178,
  },
  {
    id: "6",
    name: "Wireless Earbuds Pro",
    category: "Electronics",
    price: 149.99,
    image: "/__mockup/images/earbuds.jpg",
    rating: 4.5,
    reviews: 450,
  },
  {
    id: "7",
    name: "Smart Phone Case",
    category: "Accessories",
    price: 24.99,
    originalPrice: 35.00,
    image: "/__mockup/images/case.jpg",
    rating: 4.4,
    reviews: 86,
  },
  {
    id: "8",
    name: "USB-C Fast Charger",
    category: "Electronics",
    price: 19.99,
    image: "/__mockup/images/charger.jpg",
    rating: 4.9,
    reviews: 512,
  },
];

const categories = ["All", "Clothing", "Electronics", "Home & Kitchen", "Accessories"];

export function ClassicPremium() {
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredProducts = activeCategory === "All" 
    ? products 
    : products.filter(p => p.category === activeCategory);

  return (
    <div className="min-h-screen bg-[#faf8f3] text-[#2c1810] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#faf8f3] border-b border-[#2c1810]/10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Mobile menu */}
            <div className="flex items-center sm:hidden">
              <button className="p-2 -ml-2 text-[#2c1810] hover:text-[#c5a059] transition-colors">
                <Menu className="w-6 h-6" />
              </button>
            </div>

            {/* Logo */}
            <div className="flex-1 sm:flex-none flex justify-center sm:justify-start">
              <h1 className="font-['Playfair_Display'] text-3xl font-bold tracking-tight text-[#2c1810]">
                Maison
              </h1>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden sm:flex items-center space-x-8 absolute left-1/2 -translate-x-1/2">
              <a href="#" className="text-sm font-medium tracking-wide text-[#c5a059] border-b border-[#c5a059] pb-1">Shop</a>
              <a href="#" className="text-sm font-medium tracking-wide text-[#2c1810]/70 hover:text-[#c5a059] transition-colors pb-1">Collections</a>
              <a href="#" className="text-sm font-medium tracking-wide text-[#2c1810]/70 hover:text-[#c5a059] transition-colors pb-1">Journal</a>
              <a href="#" className="text-sm font-medium tracking-wide text-[#2c1810]/70 hover:text-[#c5a059] transition-colors pb-1">About</a>
            </nav>

            {/* Actions */}
            <div className="flex items-center space-x-4 sm:space-x-6">
              <div className="hidden lg:flex items-center border-b border-[#2c1810]/20 pb-1">
                <input 
                  type="text" 
                  placeholder="Search curated pieces..." 
                  className="bg-transparent border-none outline-none text-sm placeholder:text-[#2c1810]/40 w-48 focus:w-64 transition-all duration-300"
                />
                <button className="text-[#2c1810]/60 hover:text-[#2c1810]">
                  <Search className="w-4 h-4" />
                </button>
              </div>
              <button className="sm:hidden text-[#2c1810] hover:text-[#c5a059] transition-colors">
                <Search className="w-5 h-5" />
              </button>
              <button className="relative p-2 -mr-2 text-[#2c1810] hover:text-[#c5a059] transition-colors">
                <ShoppingBag className="w-5 h-5" />
                <span className="absolute top-0 right-0 bg-[#c5a059] text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
                  3
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-[#f0ece1] border-b border-[#2c1810]/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <p className="text-[#c5a059] uppercase tracking-[0.2em] text-xs font-semibold mb-4">New Arrivals</p>
          <h2 className="font-['Playfair_Display'] text-4xl sm:text-5xl md:text-6xl text-[#2c1810] max-w-3xl mx-auto leading-tight mb-6">
            Curated essentials for the modern lifestyle.
          </h2>
          <p className="text-[#2c1810]/70 max-w-xl mx-auto mb-10 leading-relaxed">
            Discover our latest collection of meticulously crafted pieces, designed to elevate your everyday routines with enduring quality and timeless style.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        
        {/* Category Filters */}
        <div className="flex overflow-x-auto pb-4 mb-8 -mx-4 px-4 sm:mx-0 sm:px-0 hide-scrollbar gap-3 justify-start sm:justify-center">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`whitespace-nowrap rounded-full px-6 py-2 text-sm font-medium transition-all duration-300 border ${
                activeCategory === category
                  ? "bg-[#c5a059] border-[#c5a059] text-white shadow-md shadow-[#c5a059]/20"
                  : "bg-[#faf8f3] border-[#2c1810]/20 text-[#2c1810]/70 hover:border-[#c5a059] hover:text-[#c5a059]"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
          {filteredProducts.map((product) => (
            <div key={product.id} className="group flex flex-col">
              <div className="relative aspect-[4/5] overflow-hidden bg-white rounded-md mb-4 shadow-[0_4px_20px_-10px_rgba(44,24,16,0.08)]">
                {product.originalPrice && (
                  <div className="absolute top-3 left-3 z-10 bg-[#c5a059] text-white text-xs font-bold px-2 py-1 uppercase tracking-wider">
                    Sale
                  </div>
                )}
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Quick Add Button - Desktop */}
                <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 hidden sm:block">
                  <button className="w-full bg-white/90 backdrop-blur-sm border border-[#c5a059] text-[#c5a059] hover:bg-[#c5a059] hover:text-white py-3 text-sm font-semibold tracking-wide uppercase transition-colors">
                    Quick Add
                  </button>
                </div>
              </div>

              <div className="flex flex-col flex-1">
                <div className="flex justify-between items-start mb-1">
                  <p className="text-xs text-[#2c1810]/50 uppercase tracking-wider">{product.category}</p>
                  <div className="flex items-center text-[#c5a059]">
                    <Star className="w-3 h-3 fill-current" />
                    <span className="text-[10px] ml-1 text-[#2c1810]/60">{product.rating}</span>
                  </div>
                </div>
                <h3 className="font-['Playfair_Display'] text-lg text-[#2c1810] mb-2 leading-tight">
                  {product.name}
                </h3>
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[#2c1810]">
                      ${product.price.toFixed(2)}
                    </span>
                    {product.originalPrice && (
                      <span className="text-sm text-[#c5a059] line-through decoration-[#c5a059]/50">
                        ${product.originalPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                  
                  {/* Add Button - Mobile */}
                  <button className="sm:hidden w-8 h-8 rounded-full border border-[#c5a059] text-[#c5a059] flex items-center justify-center hover:bg-[#c5a059] hover:text-white transition-colors">
                    <span className="text-lg leading-none">+</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Load More */}
        <div className="mt-16 text-center">
          <button className="inline-block border border-[#2c1810] text-[#2c1810] hover:bg-[#2c1810] hover:text-[#faf8f3] px-10 py-3 uppercase tracking-[0.15em] text-xs font-semibold transition-colors duration-300">
            View All Pieces
          </button>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="bg-[#2c1810] text-[#faf8f3] py-12 border-t border-[#c5a059]/20 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-['Playfair_Display'] text-2xl mb-6 text-[#c5a059]">Maison</h2>
          <p className="text-sm text-[#faf8f3]/60 max-w-md mx-auto mb-8">
            Curating objects of exceptional quality and enduring design since 2024.
          </p>
          <div className="flex justify-center gap-6 text-sm text-[#faf8f3]/80">
            <a href="#" className="hover:text-[#c5a059] transition-colors">Terms</a>
            <a href="#" className="hover:text-[#c5a059] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[#c5a059] transition-colors">Shipping</a>
            <a href="#" className="hover:text-[#c5a059] transition-colors">Returns</a>
          </div>
        </div>
      </footer>
      
      {/* Global styles for hide-scrollbar since we can't edit index.css */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
