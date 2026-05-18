import { RootLayout } from "@/components/layout/RootLayout";
import { useCart } from "@/lib/cart-context";
import { useGetSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { Trash2, Minus, Plus, ShoppingBag, MessageCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Cart() {
  const { items, updateQuantity, removeItem, subtotal, clearCart } = useCart();
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: settings?.currency || 'USD',
  });

  const handleCheckout = () => {
    if (!settings?.whatsappNumber) return;

    let message = `Hello! I would like to place an order from ${settings.storeName || 'your store'}:\n\n`;

    items.forEach((item) => {
      message += `• ${item.quantity}x ${item.product.name} - ${formatter.format(item.product.price * item.quantity)}\n`;
    });

    message += `\n*Total: ${formatter.format(subtotal)}*`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${settings.whatsappNumber}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
  };

  if (items.length === 0) {
    return (
      <RootLayout title="Your Cart" showBack>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary">
            <ShoppingBag className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-8">Looks like you haven't added anything yet.</p>
          <Link href="/">
            <Button size="lg" className="rounded-full px-8 h-12 text-base font-semibold">
              Start Shopping
            </Button>
          </Link>
        </div>
      </RootLayout>
    );
  }

  return (
    <RootLayout title="Your Cart" showBack>
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="lg:grid lg:grid-cols-3 lg:gap-10">
          {/* Items list */}
          <div className="lg:col-span-2 space-y-4 pb-4">
            <h2 className="text-lg font-semibold mb-2">
              {items.length} {items.length === 1 ? "item" : "items"}
            </h2>
            {items.map((item) => (
              <div key={item.product.id} className="flex gap-4 p-4 bg-card border border-border rounded-xl shadow-sm animate-in slide-in-from-right-4">
                <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden shrink-0">
                  {item.product.imageUrl ? (
                    <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary/30">
                      <ShoppingBag className="w-6 h-6 text-muted-foreground/30" />
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-semibold text-sm leading-tight text-foreground line-clamp-2">
                      {item.product.name}
                    </h3>
                    <div className="text-primary font-bold mt-1">
                      {formatter.format(item.product.price)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3 bg-muted/50 rounded-full border border-border/50 px-2 py-1">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="text-muted-foreground hover:text-foreground p-1"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-medium text-sm w-4 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="text-muted-foreground hover:text-foreground p-1"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-foreground">
                        {formatter.format(item.product.price * item.quantity)}
                      </span>
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-full hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <Button
              variant="ghost"
              onClick={clearCart}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              Empty Cart
            </Button>
          </div>

          {/* Order summary — shown inline on desktop, fixed on mobile */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="bg-card border border-border rounded-2xl p-6 sticky top-24">
              <h3 className="text-lg font-bold mb-4">Order Summary</h3>
              <div className="space-y-2 mb-4">
                {items.map((item) => (
                  <div key={item.product.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground truncate mr-2">
                      {item.product.name} x{item.quantity}
                    </span>
                    <span className="font-medium shrink-0">
                      {formatter.format(item.product.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="text-2xl font-bold text-foreground">{formatter.format(subtotal)}</span>
                </div>
              </div>
              <Button
                onClick={handleCheckout}
                size="lg"
                className="w-full h-12 text-base rounded-full font-bold shadow-lg flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                Checkout via WhatsApp
              </Button>
              {!settings?.whatsappNumber && (
                <p className="text-xs text-muted-foreground text-center mt-3">
                  WhatsApp number not configured yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile fixed bottom bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-50 p-4 rounded-t-2xl">
        <div className="flex justify-between items-center mb-4 px-2">
          <span className="text-muted-foreground font-medium">Subtotal</span>
          <span className="text-2xl font-bold text-foreground">{formatter.format(subtotal)}</span>
        </div>
        <Button
          onClick={handleCheckout}
          size="lg"
          className="w-full h-14 text-lg rounded-full font-bold shadow-lg flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-5 h-5" />
          Checkout via WhatsApp
        </Button>
      </div>
    </RootLayout>
  );
}
