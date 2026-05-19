import { useParams, Link } from "wouter";
import { RootLayout } from "@/components/layout/RootLayout";
import { useGetProduct, getGetProductQueryKey, ProductVariant } from "@workspace/api-client-react";
import { ShoppingBag, Minus, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { RelatedProducts } from "@/components/RelatedProducts";
import { Helmet } from "react-helmet-async";

export default function ProductDetail() {
  const { id } = useParams();
  const productId = parseInt(id || "0", 10);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // Reset the gallery when navigating between products so the previous
  // product's image index doesn't carry over.
  useEffect(() => { setActiveImageIdx(0); }, [productId]);
  const { addItem, openCart } = useCart();
  const { toast } = useToast();

  const { data: product, isLoading, isError } = useGetProduct(productId, {
    query: { queryKey: getGetProductQueryKey(productId), enabled: !!productId }
  });

  const activeVariants = useMemo<ProductVariant[]>(
    () => (product?.variants ?? []).filter((v) => v.isActive),
    [product]
  );
  const hasVariants = activeVariants.length > 0;
  const selectedVariant = activeVariants.find((v) => v.id === selectedVariantId) ?? null;

  // Effective price/stock: variant overrides product when one is selected.
  const effectivePrice = selectedVariant?.price ?? product?.price ?? 0;
  const effectiveStock = selectedVariant
    ? selectedVariant.stockQuantity
    : (product?.stockQuantity ?? 0);
  const canPurchase = product?.inStock && (hasVariants ? !!selectedVariant && effectiveStock > 0 : true);

  const handleAddToCart = () => {
    if (!product || !canPurchase) return;
    if (hasVariants && !selectedVariant) {
      toast({ title: "Choose an option", description: "Please select a variant before adding to bag." });
      return;
    }
    addItem(product, { variant: selectedVariant ?? null, quantity });
    openCart();
  };

  const formatter = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 });

  if (isLoading) {
    return (
      <RootLayout showBack noMarquee>
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
      <RootLayout showBack noMarquee>
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

  // Gallery: prefer the new `images` array, fall back to the single cover for
  // backwards compatibility with rows that pre-date multi-image support.
  const gallery: string[] = (product.images && product.images.length > 0)
    ? product.images
    : (product.imageUrl ? [product.imageUrl] : []);

  // "From KSh X" when active variants disagree on price
  const variantPrices = activeVariants.map((v) => v.price ?? product.price);
  const showFromPrice = hasVariants && new Set(variantPrices).size > 1 && !selectedVariant;
  const headerPrice = selectedVariant ? effectivePrice : (showFromPrice ? Math.min(...variantPrices) : product.price);

  const priceFormatted = formatter.format(headerPrice);

  const addToBagLabel = !product.inStock
    ? "Out of Stock"
    : hasVariants && !selectedVariant
      ? "Select an Option"
      : effectiveStock <= 0
        ? "Sold Out"
        : `Add to Bag — ${formatter.format(effectivePrice * quantity)}`;

  return (
    <RootLayout showBack noMarquee title={product.name}>
      <Helmet>
        <title>{product.name} — Luxe Store</title>
        <meta name="description" content={product.description ? product.description.slice(0, 155) : `Shop ${product.name} at Luxe Store. ${priceFormatted}. M-Pesa & WhatsApp checkout.`} />
        <meta property="og:title" content={`${product.name} — Luxe Store`} />
        <meta property="og:description" content={product.description || `${product.name} — ${priceFormatted}`} />
        {product.imageUrl && <meta property="og:image" content={product.imageUrl} />}
        <meta property="og:type" content="product" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          "name": product.name,
          "description": product.description || undefined,
          "image": product.imageUrl || undefined,
          "offers": {
            "@type": "Offer",
            "priceCurrency": "KES",
            "price": product.price,
            "availability": product.inStock
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
            "seller": { "@type": "Organization", "name": "Luxe Store" },
          },
        })}</script>
      </Helmet>
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="lg:grid lg:grid-cols-2 lg:gap-16 xl:gap-20">
          <ProductGallery
            images={gallery}
            activeIdx={Math.min(activeImageIdx, Math.max(0, gallery.length - 1))}
            onChange={setActiveImageIdx}
            name={product.name}
            soldOut={!product.inStock}
            featured={!!product.isFeatured}
            discount={discount}
          />

          <div className="mt-8 lg:mt-0 flex flex-col">
            {product.categoryName && (
              <span className="text-[10px] uppercase tracking-widest text-zinc-600 mb-3">{product.categoryName}</span>
            )}
            <h1 className="text-2xl lg:text-3xl font-light text-zinc-100 uppercase tracking-wide leading-tight mb-6">
              {product.name}
            </h1>
            <div className="flex items-end gap-4 mb-8 pb-8 border-b border-zinc-900">
              <span className="text-3xl lg:text-4xl font-light text-[#D4AF37]">
                {showFromPrice && <span className="text-sm uppercase tracking-widest text-zinc-500 mr-2 align-middle">From</span>}
                {formatter.format(headerPrice)}
              </span>
              {!selectedVariant && product.originalPrice && product.originalPrice > product.price && (
                <span className="text-lg text-zinc-700 line-through mb-1">{formatter.format(product.originalPrice)}</span>
              )}
            </div>

            {/* Variant selector */}
            {hasVariants && (
              <div className="mb-8 pb-8 border-b border-zinc-900">
                <h3 className="text-[10px] uppercase tracking-widest text-zinc-600 mb-3">
                  Options {selectedVariant && <span className="text-zinc-400 normal-case">— {selectedVariant.name}</span>}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {activeVariants.map((v) => {
                    const isSelected = v.id === selectedVariantId;
                    const isSoldOut = v.stockQuantity <= 0;
                    const variantPrice = v.price ?? product.price;
                    const priceDiffers = new Set(variantPrices).size > 1;
                    return (
                      <button
                        key={v.id}
                        onClick={() => !isSoldOut && setSelectedVariantId(v.id)}
                        disabled={isSoldOut}
                        className={`px-4 py-2.5 border text-xs uppercase tracking-wide transition-colors ${
                          isSelected
                            ? "bg-[#D4AF37] text-black border-[#D4AF37]"
                            : isSoldOut
                              ? "bg-transparent text-zinc-700 border-zinc-900 line-through cursor-not-allowed"
                              : "bg-transparent text-zinc-300 border-zinc-800 hover:border-[#D4AF37]"
                        }`}
                      >
                        <span>{v.name}</span>
                        {priceDiffers && !isSelected && !isSoldOut && (
                          <span className="ml-2 text-[10px] text-zinc-500">{formatter.format(variantPrice)}</span>
                        )}
                        {isSoldOut && <span className="ml-2 text-[10px]">Sold Out</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-zinc-900/60 border border-zinc-800/60 p-5 mb-6">
              <h3 className="text-[10px] uppercase tracking-widest text-zinc-600 mb-3">Description</h3>
              <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-line font-light">
                {product.description || "No description provided."}
              </p>
            </div>
            <div className="flex items-center justify-between p-4 bg-zinc-900/40 border border-zinc-900 mb-8">
              <span className="text-xs uppercase tracking-widest text-zinc-500">Quantity</span>
              <div className="flex items-center gap-5 border border-zinc-800 px-4 py-2">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="text-zinc-600 hover:text-[#D4AF37] transition-colors disabled:opacity-30" disabled={quantity <= 1 || !canPurchase}>
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-light text-zinc-200 w-6 text-center">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="text-zinc-600 hover:text-[#D4AF37] transition-colors disabled:opacity-30" disabled={!canPurchase}>
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="hidden lg:block">
              <button onClick={handleAddToCart} disabled={!canPurchase} className="w-full py-4 bg-[#D4AF37] text-black text-sm uppercase tracking-widest font-medium hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg">
                {addToBagLabel}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-16">
        <RelatedProducts categoryId={product.categoryId} currentProductId={product.id} />
      </div>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-[#0a0a0a]/95 backdrop-blur border-t border-zinc-900 z-50">
        <button onClick={handleAddToCart} disabled={!canPurchase} className="w-full py-4 bg-[#D4AF37] text-black text-sm uppercase tracking-widest font-medium hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          {addToBagLabel}
        </button>
      </div>
    </RootLayout>
  );
}

interface ProductGalleryProps {
  images: string[];
  activeIdx: number;
  onChange: (idx: number) => void;
  name: string;
  soldOut: boolean;
  featured: boolean;
  discount: number | null;
}

function ProductGallery({ images, activeIdx, onChange, name, soldOut, featured, discount }: ProductGalleryProps) {
  // Track touch start so we can support horizontal swipe-to-paginate on mobile.
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const hasMultiple = images.length > 1;
  const current = images[activeIdx] ?? images[0];

  // Reset to first image when the gallery itself changes (e.g. between
  // products on the same route).
  useEffect(() => { if (activeIdx >= images.length) onChange(0); }, [images.length, activeIdx, onChange]);

  const go = (delta: number) => {
    if (images.length === 0) return;
    const next = (activeIdx + delta + images.length) % images.length;
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div
        className="relative bg-zinc-900 overflow-hidden aspect-square lg:aspect-auto lg:min-h-[560px]"
        onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchStartX == null) return;
          const dx = e.changedTouches[0].clientX - touchStartX;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          setTouchStartX(null);
        }}
      >
        {current
          ? <img key={current} src={current} alt={name} className="w-full h-full object-cover animate-in fade-in duration-500 opacity-90" />
          : <div className="w-full h-full flex items-center justify-center bg-zinc-900"><ShoppingBag className="w-16 h-16 text-zinc-700" /></div>
        }
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-40 pointer-events-none" />
        {soldOut && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
            <span className="text-sm uppercase tracking-widest text-zinc-300 px-4 py-2 border border-zinc-700">Sold Out</span>
          </div>
        )}
        {featured && !soldOut && (
          <div className="absolute top-4 left-4 px-3 py-1 bg-black/80 border border-[#D4AF37]/40 text-[10px] uppercase tracking-widest text-[#D4AF37]">
            Featured
          </div>
        )}
        {discount && !soldOut && (
          <div className="absolute top-4 right-4 px-3 py-1 bg-black/80 border border-[#D4AF37]/30 text-[10px] uppercase tracking-widest text-[#D4AF37]">
            {discount}% off
          </div>
        )}
        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous image"
              className="hidden lg:flex absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 border border-white/15 text-white items-center justify-center hover:border-[#D4AF37]/60 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next image"
              className="hidden lg:flex absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 border border-white/15 text-white items-center justify-center hover:border-[#D4AF37]/60 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="lg:hidden absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === activeIdx ? "w-5 bg-[#D4AF37]" : "w-1.5 bg-white/40"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {hasMultiple && (
        <div className="hidden lg:flex gap-2 overflow-x-auto pb-1">
          {images.map((url, i) => (
            <button
              key={`${url}-${i}`}
              type="button"
              onClick={() => onChange(i)}
              className={`shrink-0 w-20 h-20 border overflow-hidden bg-zinc-900 transition-all ${
                i === activeIdx ? "border-[#D4AF37] ring-1 ring-[#D4AF37]/40" : "border-zinc-800 hover:border-zinc-700 opacity-70 hover:opacity-100"
              }`}
              aria-label={`Show image ${i + 1}`}
            >
              <img src={url} alt={`${name} ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
