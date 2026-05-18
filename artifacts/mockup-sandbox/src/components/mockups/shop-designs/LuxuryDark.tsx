import React, { useState } from 'react';
import { ShoppingCart, Search, Plus } from 'lucide-react';

const CATEGORIES = ['All', 'Electronics', 'Clothing', 'Home & Kitchen'];

const PRODUCTS = [
  {
    id: 1,
    name: 'Wireless Earbuds Pro',
    category: 'Electronics',
    price: 29.99,
    originalPrice: 59.99,
    image: '/__mockup/images/luxury-earbuds.jpg',
    featured: true,
  },
  {
    id: 2,
    name: 'Smart Phone Case',
    category: 'Electronics',
    price: 9.99,
    originalPrice: null,
    image: '/__mockup/images/luxury-case.jpg',
    featured: false,
  },
  {
    id: 3,
    name: 'USB-C Fast Charger',
    category: 'Electronics',
    price: 14.99,
    originalPrice: 24.99,
    image: '/__mockup/images/luxury-charger.jpg',
    featured: false,
  },
  {
    id: 4,
    name: 'Oversized Hoodie',
    category: 'Clothing',
    price: 24.99,
    originalPrice: 39.99,
    image: '/__mockup/images/luxury-hoodie.jpg',
    featured: true,
  },
  {
    id: 5,
    name: 'Classic White Sneakers',
    category: 'Clothing',
    price: 39.99,
    originalPrice: null,
    image: '/__mockup/images/luxury-sneakers.jpg',
    featured: false,
  },
  {
    id: 6,
    name: 'Coffee Maker Deluxe',
    category: 'Home & Kitchen',
    price: 49.99,
    originalPrice: 79.99,
    image: '/__mockup/images/luxury-coffee.jpg',
    featured: true,
  },
  {
    id: 7,
    name: 'Non-Stick Pan Set',
    category: 'Home & Kitchen',
    price: 34.99,
    originalPrice: null,
    image: '/__mockup/images/luxury-pans.jpg',
    featured: false,
  },
  {
    id: 8,
    name: 'Silk Face Serum',
    category: 'Home & Kitchen',
    price: 22.99,
    originalPrice: null,
    image: '/__mockup/images/luxury-serum.jpg',
    featured: false,
  },
];

export function LuxuryDark() {
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredProducts = PRODUCTS.filter(p => 
    activeCategory === 'All' || p.category === activeCategory
  );

  return (
    <div 
      className="min-h-screen font-sans text-white pb-24"
      style={{
        backgroundColor: '#09090b',
        backgroundImage: 'radial-gradient(circle at top center, #18181b 0%, #09090b 100%)',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="font-bold text-xl tracking-tight text-white">
            My Drop Shop
          </div>
          
          <button className="relative p-2 text-white hover:text-amber-400 transition-colors">
            <ShoppingCart className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-amber-400 rounded-full"></span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-8">
        {/* Search */}
        <div className="relative mb-8 max-w-xl mx-auto">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-white/40" />
          </div>
          <input
            type="text"
            placeholder="Search products..."
            className="w-full h-12 pl-12 pr-4 bg-white/5 border border-white/10 rounded-full text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/50 transition-all"
          />
        </div>

        {/* Categories */}
        <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-10 pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:justify-center">
          {CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`whitespace-nowrap px-5 py-2 rounded-full text-sm transition-all duration-300 ${
                activeCategory === category
                  ? 'bg-amber-400 text-black font-semibold shadow-[0_0_15px_rgba(251,191,36,0.2)]'
                  : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {filteredProducts.map(product => (
            <div 
              key={product.id}
              className="group relative rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(251,191,36,0.1)] hover:border-amber-400/20 flex flex-col"
            >
              <div className="aspect-[4/5] relative overflow-hidden bg-black/20">
                {product.featured && (
                  <div className="absolute top-3 left-3 z-10">
                    <span className="bg-amber-400 text-black text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                      Featured
                    </span>
                  </div>
                )}
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              
              <div className="p-4 flex flex-col flex-grow">
                <div className="text-[10px] font-medium text-amber-400 uppercase tracking-wider mb-1">
                  {product.category}
                </div>
                <h3 className="text-sm md:text-base font-medium text-white mb-3 line-clamp-2 leading-tight">
                  {product.name}
                </h3>
                
                <div className="mt-auto flex items-end justify-between">
                  <div>
                    {product.originalPrice && (
                      <div className="text-xs text-white/40 line-through mb-0.5">
                        ${product.originalPrice.toFixed(2)}
                      </div>
                    )}
                    <div className="text-lg font-bold text-white">
                      ${product.price.toFixed(2)}
                    </div>
                  </div>
                  
                  <button className="h-8 w-8 rounded-full bg-amber-400 flex items-center justify-center text-black hover:bg-amber-300 transition-colors shadow-[0_0_10px_rgba(251,191,36,0.3)]">
                    <Plus className="w-5 h-5" />
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
