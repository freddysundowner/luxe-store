import { useParams, Link } from "wouter";
import { RootLayout } from "@/components/layout/RootLayout";
import { useGetProduct, getGetProductQueryKey } from "@workspace/api-client-react";
import { ShoppingCart, ArrowLeft, Loader2, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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
      title: "Added to cart",
      description: `${quantity}x ${product.name} added to your cart.`,
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
        <div className="flex flex-col">
          <Skeleton className="w-full aspect-square rounded-none" />
          <div className="p-4 space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </RootLayout>
    );
  }

  if (isError || !product) {
    return (
      <RootLayout showBack>
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <h3 className="font-semibold text-lg mb-1">Product not found</h3>
          <p className="text-muted-foreground mb-6">The product you're looking for doesn't exist or has been removed.</p>
          <Link href="/" className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-medium">
            Return to store
          </Link>
        </div>
      </RootLayout>
    );
  }

  return (
    <RootLayout showBack title={product.name}>
      <div className="flex flex-col pb-24 bg-card min-h-full">
        <div className="w-full bg-muted/20 relative">
          <div className="aspect-square relative">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover animate-in fade-in duration-700"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary/20">
                <ShoppingCart className="w-16 h-16 text-muted-foreground/30" />
              </div>
            )}
            {!product.inStock && (
              <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center">
                <span className="font-bold text-lg tracking-widest text-foreground uppercase px-4 py-2 bg-background/90 rounded-md">
                  Sold Out
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="p-5 flex-1 flex flex-col">
          {product.categoryName && (
            <span className="text-xs uppercase font-bold tracking-wider text-primary/80 mb-2">
              {product.categoryName}
            </span>
          )}
          <h1 className="text-2xl font-bold text-foreground leading-tight mb-2">
            {product.name}
          </h1>
          
          <div className="flex items-end gap-3 mb-6">
            <span className="text-3xl font-bold text-foreground">
              {formatter.format(product.price)}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-lg text-muted-foreground line-through mb-1">
                {formatter.format(product.originalPrice)}
              </span>
            )}
          </div>

          <div className="bg-muted/30 p-4 rounded-xl mb-6">
            <h3 className="font-semibold text-sm mb-2 text-foreground">Description</h3>
            <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
              {product.description || "No description provided."}
            </p>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl mb-8">
            <span className="font-medium text-foreground">Quantity</span>
            <div className="flex items-center gap-4 bg-background px-2 py-1 rounded-full border border-border shadow-sm">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                disabled={quantity <= 1 || !product.inStock}
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-semibold w-6 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                disabled={!product.inStock}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] z-50">
        <Button
          onClick={handleAddToCart}
          disabled={!product.inStock}
          size="lg"
          className="w-full h-14 text-lg rounded-full font-bold shadow-lg"
        >
          {product.inStock ? `Add to Cart - ${formatter.format(product.price * quantity)}` : "Out of Stock"}
        </Button>
      </div>
    </RootLayout>
  );
}
