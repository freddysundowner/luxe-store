import { RootLayout } from "@/components/layout/RootLayout";
import { useCart } from "@/lib/cart-context";
import { useGetSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { Trash2, Minus, Plus, ShoppingBag, MessageCircle } from "lucide-react";
import { Link } from "wouter";

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
      <RootLayout title="Your Bag" showBack>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
          <div className="w-24 h-24 bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-8">
            <ShoppingBag className="w-10 h-10 text-zinc-700" />
          </div>
          <h2 className="text-xl font-light mb-2 text-zinc-200 uppercase tracking-wide">Your bag is empty</h2>
          <p className="text-zinc-600 text-sm mb-10">You haven't added anything yet.</p>
          <Link href="/">
            <button className="bg-[#D4AF37] text-black px-8 py-3 text-xs uppercase tracking-widest font-medium hover:bg-white transition-colors">
              Explore Collection
            </button>
          </Link>
        </div>
      </RootLayout>
    );
  }

  return (
    <RootLayout title="Your Bag" showBack>
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-3 lg:gap-12">
          {/* Items list */}
          <div className="lg:col-span-2 space-y-4 pb-4">
            <h2 className="text-[10px] uppercase tracking-widest text-zinc-600 mb-6">
              {items.length} {items.length === 1 ? "item" : "items"}
            </h2>
            {items.map((item) => (
              <div key={item.product.id} className="flex gap-4 p-4 bg-zinc-900/60 border border-zinc-800 animate-in slide-in-from-right-4">
                <div className="w-20 h-20 bg-zinc-900 overflow-hidden shrink-0 border border-zinc-800">
                  {item.product.imageUrl ? (
                    <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover opacity-90" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 text-zinc-700" />
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs uppercase tracking-wide font-light text-zinc-200 leading-snug line-clamp-2">
                      {item.product.name}
                    </h3>
                    <div className="text-[#D4AF37] text-sm font-medium mt-1">
                      {formatter.format(item.product.price)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-4 border border-zinc-800 px-3 py-1.5">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="text-zinc-600 hover:text-[#D4AF37] transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-zinc-300 text-sm w-4 text-center font-light">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="text-zinc-600 hover:text-[#D4AF37] transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-sm font-light text-zinc-300">
                        {formatter.format(item.product.price * item.quantity)}
                      </span>
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="text-zinc-700 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={clearCart}
              className="text-zinc-700 hover:text-red-400 transition-colors text-xs uppercase tracking-widest mt-2"
            >
              Empty Bag
            </button>
          </div>

          {/* Order summary — desktop */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="bg-zinc-900/60 border border-zinc-800 p-6 sticky top-28">
              <h3 className="text-[10px] uppercase tracking-widest text-zinc-600 mb-6">Order Summary</h3>
              <div className="space-y-3 mb-6">
                {items.map((item) => (
                  <div key={item.product.id} className="flex justify-between text-xs">
                    <span className="text-zinc-600 truncate mr-3 uppercase tracking-wide">
                      {item.product.name} ×{item.quantity}
                    </span>
                    <span className="text-zinc-400 shrink-0">
                      {formatter.format(item.product.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-zinc-800 pt-5 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase tracking-widest text-zinc-600">Total</span>
                  <span className="text-2xl font-light text-[#D4AF37]">{formatter.format(subtotal)}</span>
                </div>
              </div>
              <button
                onClick={handleCheckout}
                className="w-full py-4 bg-[#D4AF37] text-black text-xs uppercase tracking-widest font-medium hover:bg-white transition-colors flex items-center justify-center gap-2 shadow-lg"
              >
                <MessageCircle className="w-4 h-4" />
                Checkout via WhatsApp
              </button>
              {!settings?.whatsappNumber && (
                <p className="text-[10px] text-zinc-700 text-center mt-3 uppercase tracking-wider">
                  WhatsApp number not configured.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile fixed bottom bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/95 backdrop-blur border-t border-zinc-900 z-50 p-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-[10px] uppercase tracking-widest text-zinc-600">Total</span>
          <span className="text-2xl font-light text-[#D4AF37]">{formatter.format(subtotal)}</span>
        </div>
        <button
          onClick={handleCheckout}
          className="w-full py-4 bg-[#D4AF37] text-black text-sm uppercase tracking-widest font-medium hover:bg-white transition-colors flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          Checkout via WhatsApp
        </button>
      </div>
    </RootLayout>
  );
}
