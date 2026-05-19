import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Product, ProductVariant, useGetSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { useCart, type CheckoutMethod } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";
import { Minus, Plus, MessageCircle, Smartphone, ShoppingBag } from "lucide-react";

interface QuickBuyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  /** Pre-select a variant when the dialog opens (e.g. coming from PDP). */
  initialVariantId?: number | null;
  /** Initial quantity when the dialog opens. Defaults to 1. */
  initialQuantity?: number;
}

const fmt = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 });

export function QuickBuyDialog({ open, onOpenChange, product, initialVariantId = null, initialQuantity = 1 }: QuickBuyDialogProps) {
  const { addItem, startQuickCheckout, openMpesa, setPendingQuickBuyLine } = useCart();
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const { toast } = useToast();

  const activeVariants = useMemo<ProductVariant[]>(
    () => (product?.variants ?? []).filter((v) => v.isActive),
    [product]
  );
  const hasVariants = activeVariants.length > 0;

  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handoffTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHandoffTimer = () => {
    if (handoffTimer.current !== null) {
      clearTimeout(handoffTimer.current);
      handoffTimer.current = null;
    }
  };

  // Reset when the dialog opens for a new product. Honour any pre-selected
  // variant / quantity passed by the caller (e.g. the product detail page
  // forwards what the customer already chose so they don't re-pick).
  useEffect(() => {
    if (open) {
      setSelectedVariantId(initialVariantId);
      setQuantity(initialQuantity > 0 ? initialQuantity : 1);
      setIsSubmitting(false);
    }
  }, [open, product?.id, initialVariantId, initialQuantity]);

  // Cancel any pending handoff timer if this dialog unmounts.
  useEffect(() => () => clearHandoffTimer(), []);

  if (!product) return null;

  const selectedVariant = activeVariants.find((v) => v.id === selectedVariantId) ?? null;
  const effectivePrice = selectedVariant?.price ?? product.price;
  const effectiveStock = selectedVariant ? selectedVariant.stockQuantity : (product.stockQuantity ?? 0);
  const variantPrices = activeVariants.map((v) => v.price ?? product.price);
  const priceDiffers = new Set(variantPrices).size > 1;
  const showFromPrice = hasVariants && priceDiffers && !selectedVariant;
  const headerPrice = selectedVariant ? effectivePrice : (showFromPrice ? Math.min(...variantPrices) : product.price);

  // A `stockQuantity` of exactly 0 means the merchant has sold out (vs
  // `null`/`undefined`, which is "not tracked" and treated as available).
  // For variant products we always require positive stock on the chosen
  // variant so a sold-out variant disables checkout.
  const noVariantOutOfStock = !hasVariants && product.stockQuantity === 0;
  const canPurchase = hasVariants
    ? !!product.inStock && !!selectedVariant && effectiveStock > 0
    : !!product.inStock && !noVariantOutOfStock;

  const mpesaEnabled = settings?.sunpayEnabled === "true" && !!settings?.sunpayApiKey;
  const whatsappEnabled = !!settings?.whatsappNumber;

  const handleCheckout = (method: CheckoutMethod) => {
    // Idempotency: ignore subsequent clicks once a handoff is already in
    // flight. The dialog will close shortly after the first click.
    if (isSubmitting) return;
    if (!canPurchase) {
      if (hasVariants && !selectedVariant) {
        toast({ title: "Choose an option", description: "Please select a variant to continue." });
      }
      return;
    }
    setIsSubmitting(true);
    addItem(product, { variant: selectedVariant, quantity });
    // Mark this line as "added by Quick Buy" so the CartDrawer can roll it
    // back if the customer abandons checkout before completing the order.
    setPendingQuickBuyLine({
      productId: product.id,
      variantId: selectedVariant?.id ?? null,
      addedQty: quantity,
    });
    onOpenChange(false);
    clearHandoffTimer();
    handoffTimer.current = setTimeout(() => {
      handoffTimer.current = null;
      // M-Pesa goes straight to the overlay — it only needs a phone number,
      // so routing through the CartDrawer's customer-info step would feel
      // like an unnecessary detour. WhatsApp still uses the drawer flow
      // because it collects more details before handing off to chat.
      if (method === "mpesa") {
        openMpesa();
      } else {
        startQuickCheckout(method);
      }
    }, 60);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-md p-0 overflow-hidden">
        <div className="flex gap-4 p-5 border-b border-zinc-800">
          <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 shrink-0 overflow-hidden">
            {(() => {
              // Prefer the gallery's first image, fall back to the legacy
              // single `imageUrl` for rows that pre-date multi-image support.
              const cover = (product.images && product.images.length > 0)
                ? product.images[0]
                : product.imageUrl;
              return cover
                ? <img src={cover} alt={product.name} className="w-full h-full object-cover opacity-90" />
                : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-6 h-6 text-zinc-700" /></div>;
            })()}
          </div>
          <div className="flex-1 min-w-0">
            <DialogHeader className="space-y-1 text-left">
              {product.categoryName && (
                <p className="text-[9px] uppercase tracking-widest text-zinc-600">{product.categoryName}</p>
              )}
              <DialogTitle className="text-zinc-100 text-sm uppercase tracking-wide font-light leading-snug line-clamp-2">
                {product.name}
              </DialogTitle>
              <DialogDescription className="text-[#D4AF37] text-base font-light">
                {showFromPrice && <span className="text-[10px] uppercase tracking-widest text-zinc-500 mr-1.5 align-middle">From</span>}
                {fmt.format(headerPrice)}
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {hasVariants && (
            <div>
              <h3 className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2.5">
                Options {selectedVariant && <span className="text-zinc-400 normal-case">— {selectedVariant.name}</span>}
              </h3>
              <div className="flex flex-wrap gap-2">
                {activeVariants.map((v) => {
                  const isSelected = v.id === selectedVariantId;
                  const isSoldOut = v.stockQuantity <= 0;
                  const variantPrice = v.price ?? product.price;
                  return (
                    <button
                      key={v.id}
                      onClick={() => !isSoldOut && setSelectedVariantId(v.id)}
                      disabled={isSoldOut}
                      data-testid={`quickbuy-variant-${v.id}`}
                      className={`px-3.5 py-2 border text-xs uppercase tracking-wide transition-colors ${
                        isSelected
                          ? "bg-[#D4AF37] text-black border-[#D4AF37]"
                          : isSoldOut
                            ? "bg-transparent text-zinc-700 border-zinc-900 line-through cursor-not-allowed"
                            : "bg-transparent text-zinc-300 border-zinc-800 hover:border-[#D4AF37]"
                      }`}
                    >
                      <span>{v.name}</span>
                      {priceDiffers && !isSelected && !isSoldOut && (
                        <span className="ml-2 text-[10px] text-zinc-500">{fmt.format(variantPrice)}</span>
                      )}
                      {isSoldOut && <span className="ml-2 text-[10px]">Sold Out</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-zinc-600">Quantity</span>
            <div className="flex items-center gap-4 border border-zinc-800 px-3 py-1.5">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="text-zinc-500 hover:text-[#D4AF37] transition-colors disabled:opacity-30"
                data-testid="quickbuy-qty-minus"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-zinc-200 text-sm w-5 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="text-zinc-500 hover:text-[#D4AF37] transition-colors"
                data-testid="quickbuy-qty-plus"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-zinc-900">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 pt-3">Total</span>
            <span className="text-xl font-light text-[#D4AF37] pt-3">
              {fmt.format(effectivePrice * quantity)}
            </span>
          </div>

          <div className="space-y-2 pt-1">
            {mpesaEnabled && (
              <button
                onClick={() => handleCheckout("mpesa")}
                disabled={!canPurchase || isSubmitting}
                data-testid="quickbuy-mpesa"
                className="w-full py-3.5 bg-green-700 hover:bg-green-600 text-white text-xs uppercase tracking-widest font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Smartphone className="w-4 h-4" />
                {hasVariants && !selectedVariant ? "Select an option" : "Pay with M-Pesa"}
              </button>
            )}
            <button
              onClick={() => handleCheckout("whatsapp")}
              disabled={!canPurchase || !whatsappEnabled || isSubmitting}
              data-testid="quickbuy-whatsapp"
              className="w-full py-3.5 bg-[#D4AF37] text-black text-xs uppercase tracking-widest font-medium hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              {hasVariants && !selectedVariant ? "Select an option" : "Checkout via WhatsApp"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
