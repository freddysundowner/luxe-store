import { useParams, Link } from "wouter";
import { RootLayout } from "@/components/layout/RootLayout";
import { useGetProduct, getGetProductQueryKey } from "@workspace/api-client-react";
import { ShoppingBag, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { RelatedProducts } from "@/components/RelatedProducts";

export default function ProductDetail() {
  const { id } = useParams();
  const productId = parseInt(id || "0", 10);
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();
  const { toast } = useToast();

  const { data: product, isLoading, isError } = useGetProduct(productId, {
    query: { queryKey: getGetProductQueryKey(productId), enabled: !!productId }
  });

  const handleAddToCart = () => {
    if (!product) return;
    addItem(product, quantity);
    toast({
      title: "Added to bag",
      description: `${quantity}x ${product.name} added to your bag.`,
      duration: 2000,
    });
  };

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  if (isLoading) {
    return (
      <RootLayout showBack>
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-12">
            <Skeleton className="w-full aspect-square bg-zinc-900" />
            <div className="mt-6 lg:mt-0 space-y-4">
              <Skeleton className="h-4 w-1/4 bg-zinc-900" />
              <Skeleton className="h-8 w-3/4 bg-zinc-900" />
              <Skeleton className="h-10 w-1/3 bg-zinc-900" />
              <Skeleton className="h-32 w-full bg-zinc-900" />
            </div>
          </div>
        </div>
      </RootLayout>
    );
  }

  if (isError || !product) {
    return (
      <RootLayout showBack>
        <div className="flex flex-col items-center justify-center py-24 text-center px-4">
          <h3 className="font-light text-xl mb-2 text-zinc-200 uppercase tracking-wide">Product not found</h3>
          <p className="text-zinc-600 mb-8 text-sm">The product you're looking for doesn't exist or has been removed.</p>
          <Link href="/" className="bg-[#D4AF37] text-black px-6 py-2.5 text-xs uppercase tracking-widest font-medium hover:bg-white transition-colors">
            Return to store
          </Link>
        </div>
      </RootLayout>
    );
  }

  const discount = product.originalPrice && product.originalPrice > product.price
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : null;

  return (
    <RootLayout showBack title={product.name}>
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="lg:grid lg:grid-cols-2 lg:gap-16 xl:gap-20">
          {/* Image */}
          <div className="relative bg-zinc-900 overflow-hidden aspect-square lg:aspect-auto lg:min-h-[560px]">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover animate-in fade-in duration-700 opacity-90"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                <ShoppingBag className="w-16 h-16 text-zinc-700" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-40 pointer-events-none" />
            {!product.inStock && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                <span className="text-sm uppercase tracking-widest text-zinc-300 px-4 py-2 border border-zinc-700">
                  Sold Out
                </span>
              </div>
            )}
            {product.isFeatured && product.inStock && (
              <div className="absolute top-4 left-4 px-3 py-1 bg-black/80 border border-[#D4AF37]/40 text-[10px] uppercase tracking-widest text-[#D4AF37]">
                Featured
              </div>
            )}
            {discount && product.inStock && (
              <div className="absolute top-4 right-4 px-3 py-1 bg-black/80 border border-[#D4AF37]/30 text-[10px] uppercase tracking-widest text-[#D4AF37]">
                {discount}% off
              </div>
            )}
          </div>

          {/* Details */}
          <div className="mt-8 lg:mt-0 flex flex-col">
            {product.categoryName && (
              <span className="text-[10px] uppercase tracking-widest text-zinc-600 mb-3">
                {product.categoryName}
              </span>
            )}
            <h1 className="text-2xl lg:text-3xl font-light text-zinc-100 uppercase tracking-wide leading-tight mb-6">
              {product.name}
            </h1>

            <div className="flex items-end gap-4 mb-8 pb-8 border-b border-zinc-900">
              <span className="text-3xl lg:text-4xl font-light text-[#D4AF37]">
                {formatter.format(product.price)}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-lg text-zinc-700 line-through mb-1">
                  {formatter.format(product.originalPrice)}
                </span>
              )}
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800/60 p-5 mb-6">
              <h3 className="text-[10px] uppercase tracking-widest text-zinc-600 mb-3">Description</h3>
              <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-line font-light">
                {product.description || "No description provided."}
              </p>
            </div>

            <div className="flex items-center justify-between p-4 bg-zinc-900/40 border border-zinc-900 mb-8">
              <span className="text-xs uppercase tracking-widest text-zinc-500">Quantity</span>
              <div className="flex items-center gap-5 border border-zinc-800 px-4 py-2">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="text-zinc-600 hover:text-[#D4AF37] transition-colors disabled:opacity-30"
                  disabled={quantity <= 1 || !product.inStock}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-light text-zinc-200 w-6 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="text-zinc-600 hover:text-[#D4AF37] transition-colors disabled:opacity-30"
                  disabled={!product.inStock}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Desktop CTA */}
            <div className="hidden lg:block">
              <button
                onClick={handleAddToCart}
                disabled={!product.inStock}
                className="w-full py-4 bg-[#D4AF37] text-black text-sm uppercase tracking-widest font-medium hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
              >
                {product.inStock
                  ? `Add to Bag — ${formatter.format(product.price * quantity)}`
                  : "Out of Stock"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Related products */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-16">
        <RelatedProducts categoryId={product.categoryId} currentProductId={product.id} />
      </div>

      {/* Mobile fixed bottom bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-[#0a0a0a]/95 backdrop-blur border-t border-zinc-900 z-50">
        <button
          onClick={handleAddToCart}
          disabled={!product.inStock}
          className="w-full py-4 bg-[#D4AF37] text-black text-sm uppercase tracking-widest font-medium hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {product.inStock
            ? `Add to Bag — ${formatter.format(product.price * quantity)}`
            : "Out of Stock"}
        </button>
      </div>
    </RootLayout>
  );
}
