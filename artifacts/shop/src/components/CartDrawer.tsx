import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useCart } from "@/lib/cart-context";
import {
  useGetSettings,
  getGetSettingsQueryKey,
  useInitiatePayment,
  useGetPaymentStatus,
  getGetPaymentStatusQueryKey,
} from "@workspace/api-client-react";
import {
  X, Minus, Plus, Trash2, ShoppingBag, MessageCircle,
  Smartphone, CheckCircle2, XCircle, Loader2, ArrowRight, Receipt,
} from "lucide-react";

// ── M-Pesa flow types ────────────────────────────────────────────────────────

type MpesaState = "idle" | "pending" | "success" | "failed";

interface MpesaFlowProps {
  subtotal: number;
  formatter: Intl.NumberFormat;
  cartSnapshot: unknown;
  onSuccess: () => void;
  onCancel: () => void;
}

function MpesaFlow({ subtotal, formatter, cartSnapshot, onSuccess, onCancel }: MpesaFlowProps) {
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [state, setState] = useState<MpesaState>("idle");
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [mpesaRef, setMpesaRef] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [, navigate] = useLocation();

  const initiateMutation = useInitiatePayment({
    mutation: {
      onSuccess: (data) => {
        setTransactionId(data.transactionId);
        setState("pending");
      },
      onError: (err: unknown) => {
        setApiError((err as { message?: string })?.message || "Could not reach payment gateway.");
        setState("idle");
      },
    },
  });

  const { data: statusData } = useGetPaymentStatus(
    transactionId ?? "",
    {
      query: {
        queryKey: getGetPaymentStatusQueryKey(transactionId ?? ""),
        enabled: !!transactionId && state === "pending",
        refetchInterval: (query) => {
          const s = (query.state.data as { status?: string } | undefined)?.status;
          if (s === "completed" || s === "failed") return false;
          return 3000;
        },
      },
    }
  );

  useEffect(() => {
    if (!statusData) return;
    if (statusData.status === "completed") {
      setMpesaRef((statusData as { mpesaRef?: string | null }).mpesaRef ?? null);
      setState("success");
    } else if (statusData.status === "failed") {
      setApiError("Payment was declined or cancelled. Please try again.");
      setState("failed");
    }
  }, [statusData]);

  const handleSubmit = () => {
    const clean = phone.trim().replace(/\s/g, "");
    if (!/^254\d{9}$/.test(clean)) {
      setPhoneError("Enter a valid number starting with 254 (e.g. 254712345678)");
      return;
    }
    setPhoneError("");
    setApiError(null);
    initiateMutation.mutate({
      data: {
        phoneNumber: clean,
        amount: subtotal,
        cartSnapshot: cartSnapshot as Record<string, unknown>,
      },
    });
  };

  if (state === "success") {
    return (
      <div className="text-center space-y-4 py-6">
        <div className="w-14 h-14 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-green-500" />
        </div>
        <div>
          <p className="text-zinc-200 text-sm font-medium uppercase tracking-wide">Payment Confirmed!</p>
          <p className="text-zinc-500 text-xs mt-1">
            {formatter.format(subtotal)} received via M-Pesa
          </p>
          {mpesaRef && (
            <p className="text-zinc-600 text-[11px] mt-1 font-mono">Ref: {mpesaRef}</p>
          )}
        </div>
        <button
          onClick={() => {
            onSuccess();
            if (transactionId) navigate(`/receipt/${transactionId}`);
          }}
          className="w-full py-3 bg-[#D4AF37] text-black text-xs uppercase tracking-widest font-medium hover:bg-white transition-colors flex items-center justify-center gap-2"
        >
          <Receipt className="w-3.5 h-3.5" />
          View Receipt
        </button>
      </div>
    );
  }

  if (state === "pending") {
    return (
      <div className="text-center space-y-4 py-6">
        <div className="relative w-14 h-14 mx-auto">
          <div className="absolute inset-0 rounded-full border-2 border-green-900" />
          <div className="absolute inset-0 rounded-full border-t-2 border-green-500 animate-spin" />
          <Smartphone className="absolute inset-0 m-auto w-5 h-5 text-green-500" />
        </div>
        <div>
          <p className="text-zinc-200 text-sm font-medium uppercase tracking-wide">Check Your Phone</p>
          <p className="text-zinc-500 text-xs mt-1">
            M-Pesa prompt sent to <span className="text-zinc-300">{phone}</span>.<br />
            Enter your PIN to pay <span className="text-[#D4AF37]">{formatter.format(subtotal)}</span>.
          </p>
        </div>
        <p className="text-zinc-700 text-[11px]">Checking status automatically…</p>
        <button
          onClick={() => { setState("idle"); setTransactionId(null); }}
          className="text-zinc-600 hover:text-zinc-400 text-xs underline"
        >
          Use a different number
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-zinc-400 text-xs">M-Pesa STK push for</p>
        <p className="text-[#D4AF37] text-xl font-light mt-0.5">{formatter.format(subtotal)}</p>
      </div>

      {(apiError || state === "failed") && (
        <div className="flex items-start gap-2 bg-red-950/40 border border-red-900 px-3 py-2.5 text-red-400 text-xs">
          <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {apiError || "Payment failed. Please try again."}
        </div>
      )}

      <div>
        <label className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-1.5">
          M-Pesa Phone Number
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => { setPhone(e.target.value); setPhoneError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="254712345678"
          className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm px-3 py-2.5 outline-none focus:border-[#D4AF37] transition-colors placeholder:text-zinc-700"
        />
        {phoneError && <p className="text-red-400 text-xs mt-1">{phoneError}</p>}
        <p className="text-zinc-600 text-[11px] mt-1">Format: 254XXXXXXXXX</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-3 border border-zinc-800 text-zinc-500 text-xs uppercase tracking-widest hover:text-zinc-300 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={initiateMutation.isPending}
          className="flex-[2] py-3 bg-green-700 hover:bg-green-600 disabled:bg-green-900 text-white text-xs uppercase tracking-widest font-medium transition-colors flex items-center justify-center gap-1.5"
        >
          {initiateMutation.isPending
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Sending…</>
            : <><Smartphone className="w-3.5 h-3.5" />Send Request</>
          }
        </button>
      </div>
    </div>
  );
}

// ── Cart Drawer ───────────────────────────────────────────────────────────────

export function CartDrawer() {
  const { items, updateQuantity, removeItem, clearCart, subtotal, isCartOpen, closeCart } = useCart();
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const [showMpesa, setShowMpesa] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const formatter = new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: settings?.currency || "KES",
    maximumFractionDigits: 0,
  });

  const mpesaEnabled = settings?.sunpayEnabled === "true" && !!settings?.sunpayApiKey;

  // Close mpesa panel when drawer closes
  useEffect(() => {
    if (!isCartOpen) {
      const t = setTimeout(() => setShowMpesa(false), 300);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isCartOpen]);

  const handleWhatsApp = () => {
    if (!settings?.whatsappNumber) return;
    let msg = `Hello! I'd like to order from ${settings.storeName || "your store"}:\n\n`;
    items.forEach((item) => {
      msg += `• ${item.quantity}x ${item.product.name} — ${formatter.format(item.product.price * item.quantity)}\n`;
    });
    msg += `\n*Total: ${formatter.format(subtotal)}*`;
    window.open(`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const cartSnapshot = {
    items: items.map((i) => ({ name: i.product.name, quantity: i.quantity, price: i.product.price })),
    total: subtotal,
  };

  const handleMpesaSuccess = useCallback(() => {
    clearCart();
    setShowMpesa(false);
    closeCart();
  }, [clearCart, closeCart]);

  if (!mounted) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[150] bg-black/70 transition-opacity duration-300 ${
          isCartOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeCart}
      />

      {/* Drawer panel */}
      <div
        style={{ willChange: "transform" }}
        className={`fixed top-0 right-0 h-full z-[160] w-full sm:w-[420px] bg-[#0f0f0f] border-l border-zinc-800 flex flex-col transition-transform duration-300 ease-out ${
          isCartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-xs uppercase tracking-widest font-medium text-zinc-200">Your Bag</span>
            {items.length > 0 && (
              <span className="text-[10px] bg-[#D4AF37] text-black rounded-full px-1.5 py-0.5 font-medium leading-none">
                {items.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </div>
          <button
            onClick={closeCart}
            className="w-8 h-8 flex items-center justify-center text-zinc-600 hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-16">
              <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-5">
                <ShoppingBag className="w-7 h-7 text-zinc-700" />
              </div>
              <p className="text-zinc-300 text-sm uppercase tracking-wide mb-1">Your bag is empty</p>
              <p className="text-zinc-600 text-xs">Add items to get started</p>
              <button
                onClick={closeCart}
                className="mt-6 px-6 py-2.5 bg-[#D4AF37] text-black text-xs uppercase tracking-widest font-medium hover:bg-white transition-colors flex items-center gap-1.5"
              >
                Continue Shopping <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : showMpesa ? (
            /* M-Pesa flow */
            <div className="p-5">
              <MpesaFlow
                subtotal={subtotal}
                formatter={formatter}
                cartSnapshot={cartSnapshot}
                onSuccess={handleMpesaSuccess}
                onCancel={() => setShowMpesa(false)}
              />
            </div>
          ) : (
            /* Item list */
            <div className="p-4 space-y-3">
              {items.map((item) => (
                <div key={item.product.id} className="flex gap-3 bg-zinc-900/50 border border-zinc-800/60 p-3">
                  <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 shrink-0 overflow-hidden">
                    {item.product.imageUrl
                      ? <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover opacity-90" />
                      : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-5 h-5 text-zinc-700" /></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-zinc-200 font-light line-clamp-2 leading-snug">{item.product.name}</p>
                      <p className="text-[#D4AF37] text-sm font-medium mt-0.5">{formatter.format(item.product.price)}</p>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-zinc-800">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="px-2 py-1 text-zinc-500 hover:text-[#D4AF37] transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-zinc-300 text-xs w-5 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="px-2 py-1 text-zinc-500 hover:text-[#D4AF37] transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-400">{formatter.format(item.product.price * item.quantity)}</span>
                        <button
                          onClick={() => removeItem(item.product.id)}
                          className="text-zinc-700 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={clearCart}
                className="text-zinc-700 hover:text-red-400 transition-colors text-[10px] uppercase tracking-widest w-full text-left pt-1"
              >
                Empty bag
              </button>
            </div>
          )}
        </div>

        {/* Footer — only show when items exist and not in mpesa flow */}
        {items.length > 0 && !showMpesa && (
          <div className="border-t border-zinc-800 p-5 space-y-3 shrink-0">
            {/* Order summary */}
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase tracking-widest text-zinc-600">Total</span>
              <span className="text-xl font-light text-[#D4AF37]">{formatter.format(subtotal)}</span>
            </div>

            {/* M-Pesa button (when enabled) */}
            {mpesaEnabled && (
              <button
                onClick={() => setShowMpesa(true)}
                className="w-full py-3.5 bg-green-700 hover:bg-green-600 text-white text-xs uppercase tracking-widest font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Smartphone className="w-4 h-4" />
                Pay with M-Pesa
              </button>
            )}

            {/* WhatsApp button */}
            <button
              onClick={handleWhatsApp}
              disabled={!settings?.whatsappNumber}
              className="w-full py-3.5 bg-[#D4AF37] text-black text-xs uppercase tracking-widest font-medium hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Checkout via WhatsApp
            </button>
          </div>
        )}
      </div>
    </>
  );
}
