import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { Product, ProductVariant } from "@workspace/api-client-react";

export type CheckoutMethod = "whatsapp" | "mpesa";

export interface CartItem {
  product: Product;
  variantId: number | null;
  variantName: string | null;
  unitPrice: number;
  quantity: number;
}

export interface AddItemOptions {
  variant?: ProductVariant | null;
  quantity?: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, options?: AddItemOptions) => void;
  removeItem: (productId: number, variantId?: number | null) => void;
  updateQuantity: (productId: number, variantId: number | null, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  /**
   * Global M-Pesa overlay state. Quick Buy and the cart page open this
   * directly instead of routing through the cart drawer's customer-info step
   * — the overlay only needs a phone number.
   */
  isMpesaOpen: boolean;
  openMpesa: () => void;
  closeMpesa: () => void;
  /**
   * Quick-checkout intent set by Buy Now flows. When non-null, the CartDrawer
   * should skip the cart-review step and jump straight to the customer-info
   * step using this payment method. The drawer consumes and clears it.
   */
  quickCheckoutMethod: CheckoutMethod | null;
  startQuickCheckout: (method: CheckoutMethod) => void;
  consumeQuickCheckout: () => void;
  /**
   * Identifies the line that was added by the most recent Buy Now / Quick
   * Checkout flow. If the customer dismisses the drawer before completing the
   * order, the CartDrawer will roll this line back so abandoned quick-buys
   * don't silently linger in the cart.
   */
  pendingQuickBuyLine: { productId: number; variantId: number | null; addedQty: number } | null;
  setPendingQuickBuyLine: (line: { productId: number; variantId: number | null; addedQty: number } | null) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function sameLine(a: CartItem, productId: number, variantId: number | null): boolean {
  return a.product.id === productId && (a.variantId ?? null) === (variantId ?? null);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("cart");
      if (saved) {
        const parsed = JSON.parse(saved) as Array<Partial<CartItem> & { product: Product; quantity: number }>;
        // Backwards compatibility: older carts didn't carry variant fields.
        return parsed.map((i) => ({
          product: i.product,
          variantId: i.variantId ?? null,
          variantName: i.variantName ?? null,
          unitPrice: typeof i.unitPrice === "number" ? i.unitPrice : i.product.price,
          quantity: i.quantity,
        }));
      }
    } catch {}
    return [];
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMpesaOpen, setIsMpesaOpen] = useState(false);
  const [quickCheckoutMethod, setQuickCheckoutMethod] = useState<CheckoutMethod | null>(null);
  const [pendingQuickBuyLine, setPendingQuickBuyLine] = useState<{ productId: number; variantId: number | null; addedQty: number } | null>(null);

  const startQuickCheckout = useCallback((method: CheckoutMethod) => {
    setQuickCheckoutMethod(method);
    setIsCartOpen(true);
  }, []);

  const consumeQuickCheckout = useCallback(() => {
    setQuickCheckoutMethod(null);
  }, []);

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isCartOpen]);

  const addItem = (product: Product, options: AddItemOptions = {}) => {
    const { variant = null, quantity = 1 } = options;
    const variantId = variant?.id ?? null;
    const variantName = variant?.name ?? null;
    const unitPrice = variant?.price ?? product.price;
    setItems((current) => {
      const existing = current.find((item) => sameLine(item, product.id, variantId));
      if (existing) {
        return current.map((item) =>
          sameLine(item, product.id, variantId)
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...current, { product, variantId, variantName, unitPrice, quantity }];
    });
  };

  const removeItem = (productId: number, variantId: number | null = null) => {
    setItems((current) => current.filter((item) => !sameLine(item, productId, variantId)));
  };

  const updateQuantity = (productId: number, variantId: number | null, quantity: number) => {
    if (quantity <= 0) { removeItem(productId, variantId); return; }
    setItems((current) =>
      current.map((item) =>
        sameLine(item, productId, variantId) ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => setItems([]);
  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);
  const openMpesa = useCallback(() => setIsMpesaOpen(true), []);
  const closeMpesa = useCallback(() => setIsMpesaOpen(false), []);

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const subtotal = items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items, addItem, removeItem, updateQuantity, clearCart,
        itemCount, subtotal,
        isCartOpen, openCart, closeCart,
        isMpesaOpen, openMpesa, closeMpesa,
        quickCheckoutMethod, startQuickCheckout, consumeQuickCheckout,
        pendingQuickBuyLine, setPendingQuickBuyLine,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) throw new Error("useCart must be used within a CartProvider");
  return context;
}
