import { Link } from "wouter";
import { Product } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { toast } = useToast();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); // prevent navigation
    if (!product.inStock) return;
    addItem(product, 1);
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
      duration: 2000,
    });
  };

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD', // Could be dynamic from settings
  });

  return (
    <Link href={`/product/${product.id}`}>
      <Card className="h-full overflow-hidden flex flex-col hover-elevate transition-all active-elevate active:scale-[0.98] cursor-pointer group">
        <div className="aspect-square relative bg-muted/30 overflow-hidden">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary/30 text-muted-foreground">
              <ShoppingCart className="w-8 h-8 opacity-20" />
            </div>
          )}
          {!product.inStock && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center">
              <span className="font-semibold text-sm tracking-widest text-foreground uppercase px-3 py-1 bg-background/90 rounded-md">
                Sold Out
              </span>
            </div>
          )}
          {product.isFeatured && product.inStock && (
            <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded shadow-sm">
              Featured
            </div>
          )}
        </div>
        <CardContent className="p-3 flex-1 flex flex-col">
          {product.categoryName && (
            <span className="text-[10px] uppercase font-bold text-primary/80 mb-1">
              {product.categoryName}
            </span>
          )}
          <h3 className="font-medium text-sm leading-tight text-foreground line-clamp-2 mb-1 flex-1">
            {product.name}
          </h3>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
            <div className="flex flex-col">
              <span className="font-bold text-base text-foreground">
                {formatter.format(product.price)}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-xs text-muted-foreground line-through">
                  {formatter.format(product.originalPrice)}
                </span>
              )}
            </div>
            <Button
              size="icon"
              variant={product.inStock ? "default" : "secondary"}
              className="h-8 w-8 rounded-full shadow-sm"
              disabled={!product.inStock}
              onClick={handleAddToCart}
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
