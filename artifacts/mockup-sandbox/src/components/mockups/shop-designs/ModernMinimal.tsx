import React, { useState } from "react";
import { Search, ShoppingBag } from "lucide-react";

export function ModernMinimal() {
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = ["All", "Electronics", "Clothing", "Home & Kitchen", "Accessories"];

  const products = [
    {
      id: 1,
      name: "Wireless Earbuds Pro",
      category: "Electronics",
      price: 49.99,
      originalPrice: 69.99,
      image: "/__mockup/images/earbuds.jpg",
    },
    {
      id: 2,
      name: "Oversized Hoodie",
      category: "Clothing",
      price: 39.99,
      originalPrice: null,
      image: "/__mockup/images/hoodie.jpg",
    },
    {
      id: 3,
      name: "Smart Phone Case",
      category: "Accessories",
      price: 19.99,
      originalPrice: null,
      image: "/__mockup/images/case.jpg",
    },
    {
      id: 4,
      name: "Coffee Maker Deluxe",
      category: "Home & Kitchen",
      price: 89.99,
      originalPrice: 129.99,
      image: "/__mockup/images/coffee-maker.jpg",
    },
    {
      id: 5,
      name: "Classic White Sneakers",
      category: "Clothing",
      price: 45.99,
      originalPrice: 59.99,
      image: "/__mockup/images/sneakers.jpg",
    },
    {
      id: 6,
      name: "Non-Stick Pan Set",
      category: "Home & Kitchen",
      price: 34.99,
      originalPrice: null,
      image: "/__mockup/images/pans.jpg",
    },
    {
      id: 7,
      name: "USB-C Fast Charger",
      category: "Electronics",
      price: 14.99,
      originalPrice: 19.99,
      image: "/__mockup/images/charger.jpg",
    },
    {
      id: 8,
      name: "Minimalist Desk Lamp",
      category: "Home & Kitchen",
      price: 29.99,
      originalPrice: null,
      image: "/__mockup/images/lamp.jpg",
    },
  ];

  const filteredProducts = activeCategory === "All"
    ? products
    : products.filter(p => p.category === activeCategory);

  return (
    <div className="min-h-screen bg-white text-[#111] font-sans selection:bg-[#c7a977] selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="text-xl tracking-tight font-medium uppercase">KONTRAST</div>
        
        <div className="hidden md:flex flex-1 max-w-md mx-8 items-center border-b border-gray-200 pb-1 group hover:border-gray-400 transition-colors">
          <Search className="w-4 h-4 text-gray-400 group-hover:text-gray-600 mr-2 transition-colors" />
          <input 
            type="text" 
            placeholder="Search products..." 
            className="w-full bg-transparent outline-none text-sm placeholder:text-gray-400"
          />
        </div>

        <button className="relative p-2 -mr-2 hover:bg-gray-50 rounded-full transition-colors group">
          <ShoppingBag className="w-5 h-5 text-[#111]" strokeWidth={1.5} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#c7a977] rounded-full group-hover:scale-110 transition-transform"></span>
        </button>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Categories */}
        <div className="flex flex-wrap items-center gap-8 mb-16 overflow-x-auto pb-4 scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`text-sm tracking-wide transition-all relative pb-1 whitespace-nowrap ${
                activeCategory === category 
                  ? "text-[#111] font-medium" 
                  : "text-gray-400 hover:text-gray-800"
              }`}
            >
              {category}
              {activeCategory === category && (
                <span className="absolute bottom-0 left-0 w-full h-[1px] bg-[#c7a977]" />
              )}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-16">
          {filteredProducts.map((product) => (
            <div key={product.id} className="group cursor-pointer">
              <div className="aspect-[4/5] bg-gray-50 mb-6 relative overflow-hidden flex items-center justify-center">
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="object-cover w-full h-full mix-blend-multiply group-hover:scale-105 transition-transform duration-700 ease-in-out"
                />
                
                {/* Add to cart overlay */}
                <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
                  <button className="w-full py-3 bg-white text-[#111] text-xs uppercase tracking-widest font-medium hover:bg-[#c7a977] hover:text-white transition-colors shadow-sm">
                    Add to Cart
                  </button>
                </div>
              </div>
              
              <div className="flex flex-col space-y-1">
                <h3 className="text-sm font-medium text-[#111]">{product.name}</h3>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-500">${product.price.toFixed(2)}</span>
                  {product.originalPrice && (
                    <span className="text-gray-300 line-through text-xs">${product.originalPrice.toFixed(2)}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {filteredProducts.length === 0 && (
          <div className="py-32 text-center text-gray-400 text-sm">
            No products found in this category.
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-12 px-6 mt-16 text-center text-xs text-gray-400 uppercase tracking-widest">
        &copy; {new Date().getFullYear()} KONTRAST. All rights reserved.
      </footer>
    </div>
  );
}
