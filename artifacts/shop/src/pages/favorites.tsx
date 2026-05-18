import { Link } from "wouter";
import { Heart, ShoppingBag, Trash2, ArrowLeft } from "lucide-react";
import { useFavorites } from "@/lib/favorites-context";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";
import { EmptyFeed } from "@/components/EmptyFeed";

const fmt = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 });

export default function Favorites() {
  const { favorites, toggleFavorite, favoriteCount } = useFavorites();
  const { addItem, openCart } = useCart();
  const { toast } = useToast();

  const handleAddToCart = (product: typeof favorites[0]) => {
    addItem(product, 1);
    openCart();
  };

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/92 backdrop-blur-md border-b border-zinc-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Link href="/" className="text-zinc-500 hover:text-[#D4AF37] transition-colors p-1 -ml-1">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2.5 flex-1">
            <Heart className="w-4 h-4 text-[#D4AF37] fill-[#D4AF37]" />
            <h1 className="text-xs uppercase tracking-[0.25em] text-zinc-300 font-light">
              Saved Items
            </h1>
            {favoriteCount > 0 && (
              <span className="bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] text-[9px] font-semibold px-2 py-0.5 rounded-full tracking-wider">
                {favoriteCount}
              </span>
            )}
          </div>
          <Link href="/cart" className="text-zinc-600 hover:text-[#D4AF37] transition-colors">
            <ShoppingBag className="w-5 h-5" />
          </Link>
        </div>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent" />
      </header>

      {/* Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        {favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <EmptyFeed
              message="Nothing saved yet"
              sub="Tap the heart on any product to save it here"
            />
            <Link href="/"
              className="mt-2 px-6 py-3 bg-[#D4AF37] text-black text-xs uppercase tracking-widest font-semibold hover:bg-white transition-colors"
            >
              Browse Collection
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
            {favorites.map((product) => (
              <div key={product.id} className="group relative bg-zinc-950 border border-zinc-900 hover:border-[#D4AF37]/30 transition-colors overflow-hidden">
                {/* Image */}
                <Link href={`/product/${product.id}`}>
                  <div className="aspect-square overflow-hidden bg-zinc-900">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-zinc-700" />
                      </div>
                    )}
                  </div>
                </Link>

                {/* Remove heart */}
                <button
                  onClick={() => toggleFavorite(product)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center transition-all hover:bg-red-500/20"
                  title="Remove from saved"
                >
                  <Heart className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37]" />
                </button>

                {/* Info */}
                <div className="p-3 space-y-2">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-zinc-600 truncate">
                    {(product as any).category?.name ?? ""}
                  </p>
                  <Link href={`/product/${product.id}`}>
                    <p className="text-xs font-light text-zinc-200 uppercase tracking-wide leading-snug line-clamp-2 hover:text-[#D4AF37] transition-colors">
                      {product.name}
                    </p>
                  </Link>
                  <p className="text-[#D4AF37] text-sm font-light">{fmt.format(product.price)}</p>
                </div>

                {/* Add to bag */}
                <div className="px-3 pb-3">
                  <button
                    onClick={() => handleAddToCart(product)}
                    disabled={!product.inStock}
                    className="w-full py-2.5 text-[10px] uppercase tracking-widest font-medium transition-all disabled:opacity-40"
                    style={{ background: "#D4AF37", color: "#000" }}
                    onMouseEnter={e => { if (product.inStock) (e.currentTarget as HTMLButtonElement).style.background = "#fff"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#D4AF37"; }}
                  >
                    {product.inStock ? "Add to bag" : "Sold out"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Clear all */}
        {favorites.length > 0 && (
          <div className="mt-10 flex justify-center">
            <button
              onClick={() => favorites.forEach((p) => toggleFavorite(p))}
              className="text-zinc-700 hover:text-red-400 transition-colors text-[10px] uppercase tracking-widest flex items-center gap-1.5"
            >
              <Trash2 className="w-3 h-3" />
              Clear all saved
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
