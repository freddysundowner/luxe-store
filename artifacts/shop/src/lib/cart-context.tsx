import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { Product, ProductVariant } from "@workspace/api-client-react";

export type CheckoutMethod = "whatsapp" | "mpesa";

export interface CartItem {
  product: Product;
  variantId: number | null;
  variantName: string | null;
  unitPrice: number;
  quantity: number;
  // Hamper grouping — when present, this line was added as part of a gift
  // hamper. Items sharing the same hamperGroupId render and check out as
  // one bundle. hamperName is the display label. hamperId (when set) points
  // to the curated admin-created hamper; null for customer-built hampers.
  hamperGroupId?: string | null;
  hamperName?: string | null;
  hamperId?: number | null;
  // Admin-uploaded cover for the hamper. When null/undefined the cart UI
  // synthesizes a collage from the component products' images.
  hamperImageUrl?: string | null;
}

export interface AddItemOptions {
  variant?: ProductVariant | null;
  quantity?: number;
}

export interface HamperLineInput {
  product: Product;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, options?: AddItemOptions) => void;
  /**
   * Adds a hamper (multiple products) as a single group. If `totalPrice` is
   * provided, per-item unit prices are scaled proportionally so the group
   * totals exactly that price. Otherwise each item keeps its base price.
   * Returns the generated hamperGroupId so callers can reference it.
   */
  addHamper: (lines: HamperLineInput[], opts: { name: string; hamperId?: number | null; totalPrice?: number; imageUrl?: string | null }) => string;
  removeItem: (productId: number, variantId?: number | null, hamperGroupId?: string | null) => void;
  removeHamper: (hamperGroupId: string) => void;
  updateQuantity: (productId: number, variantId: number | null, quantity: number, hamperGroupId?: string | null) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  isMpesaOpen: boolean;
  openMpesa: () => void;
  closeMpesa: () => void;
  quickCheckoutMethod: CheckoutMethod | null;
  startQuickCheckout: (method: CheckoutMethod) => void;
  consumeQuickCheckout: () => void;
  pendingQuickBuyLine: { productId: number; variantId: number | null; addedQty: number } | null;
  setPendingQuickBuyLine: (line: { productId: number; variantId: number | null; addedQty: number } | null) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function sameLine(a: CartItem, productId: number, variantId: number | null, hamperGroupId: string | null = null): boolean {
  return (
    a.product.id === productId &&
    (a.variantId ?? null) === (variantId ?? null) &&
    (a.hamperGroupId ?? null) === hamperGroupId
  );
}

function genGroupId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("cart");
      if (saved) {
        const parsed = JSON.parse(saved) as Array<Partial<CartItem> & { product: Product; quantity: number }>;
        return parsed.map((i) => ({
          product: i.product,
          variantId: i.variantId ?? null,
          variantName: i.variantName ?? null,
          unitPrice: typeof i.unitPrice === "number" ? i.unitPrice : i.product.price,
          quantity: i.quantity,
          hamperGroupId: i.hamperGroupId ?? null,
          hamperName: i.hamperName ?? null,
          hamperId: i.hamperId ?? null,
          hamperImageUrl: i.hamperImageUrl ?? null,
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
      // Standalone adds only merge with other standalone (non-hamper) lines.
      const existing = current.find((item) => sameLine(item, product.id, variantId, null));
      if (existing) {
        return current.map((item) =>
          sameLine(item, product.id, variantId, null)
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...current, { product, variantId, variantName, unitPrice, quantity, hamperGroupId: null, hamperName: null, hamperId: null, hamperImageUrl: null }];
    });
  };

  const addHamper = (lines: HamperLineInput[], opts: { name: string; hamperId?: number | null; totalPrice?: number; imageUrl?: string | null }): string => {
    const groupId = genGroupId();
    const hasOverride =
      typeof opts.totalPrice === "number" &&
      opts.totalPrice >= 0 &&
      lines.reduce((s, l) => s + l.product.price * l.quantity, 0) > 0;

    let newLines: CartItem[];
    if (!hasOverride) {
      newLines = lines.map((l) => ({
        product: l.product, variantId: null, variantName: null,
        unitPrice: l.product.price, quantity: l.quantity,
        hamperGroupId: groupId, hamperName: opts.name, hamperId: opts.hamperId ?? null,
        hamperImageUrl: opts.imageUrl ?? null,
      }));
    } else {
      // Cent-exact allocation: expand to one slot per unit, distribute target
      // cents with largest-remainder, then re-group identical (product, cents)
      // slots into single cart lines. Guarantees sum == target to the cent.
      type Slot = { product: Product; baseCents: number };
      const slots: Slot[] = [];
      for (const l of lines) {
        const baseCents = Math.round(l.product.price * 100);
        for (let i = 0; i < l.quantity; i++) slots.push({ product: l.product, baseCents });
      }
      const baseTotalCents = slots.reduce((s, x) => s + x.baseCents, 0);
      const targetCents = Math.round((opts.totalPrice as number) * 100);
      const ideals = slots.map((s) => (s.baseCents * targetCents) / baseTotalCents);
      const allocated = ideals.map((v) => Math.floor(v));
      let leftover = targetCents - allocated.reduce((a, b) => a + b, 0);
      // Distribute remaining cents to slots with largest fractional remainder.
      const order = ideals
        .map((v, i) => ({ i, rem: v - Math.floor(v) }))
        .sort((a, b) => b.rem - a.rem);
      for (let k = 0; k < leftover && k < order.length; k++) allocated[order[k].i] += 1;

      // Re-group: identical (productId, cents) slots become one cart line.
      const groups = new Map<string, { product: Product; cents: number; qty: number; order: number }>();
      slots.forEach((s, i) => {
        const key = `${s.product.id}:${allocated[i]}`;
        const g = groups.get(key);
        if (g) g.qty += 1;
        else groups.set(key, { product: s.product, cents: allocated[i], qty: 1, order: groups.size });
      });
      newLines = [...groups.values()]
        .sort((a, b) => a.order - b.order)
        .map((g) => ({
          product: g.product, variantId: null, variantName: null,
          unitPrice: g.cents / 100, quantity: g.qty,
          hamperGroupId: groupId, hamperName: opts.name, hamperId: opts.hamperId ?? null,
          hamperImageUrl: opts.imageUrl ?? null,
        }));
    }

    setItems((current) => [...current, ...newLines]);
    return groupId;
  };

  const removeItem = (productId: number, variantId: number | null = null, hamperGroupId: string | null = null) => {
    setItems((current) => current.filter((item) => !sameLine(item, productId, variantId, hamperGroupId)));
  };

  const removeHamper = (hamperGroupId: string) => {
    setItems((current) => current.filter((item) => (item.hamperGroupId ?? null) !== hamperGroupId));
  };

  const updateQuantity = (productId: number, variantId: number | null, quantity: number, hamperGroupId: string | null = null) => {
    if (quantity <= 0) { removeItem(productId, variantId, hamperGroupId); return; }
    setItems((current) =>
      current.map((item) =>
        sameLine(item, productId, variantId, hamperGroupId) ? { ...item, quantity } : item
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
        items, addItem, addHamper, removeItem, removeHamper, updateQuantity, clearCart,
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
