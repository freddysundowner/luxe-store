import { RootLayout } from "@/components/layout/RootLayout";
import { useCart } from "@/lib/cart-context";
import {
  useGetSettings,
  getGetSettingsQueryKey,
  useInitiatePayment,
  useGetPaymentStatus,
  getGetPaymentStatusQueryKey,
} from "@workspace/api-client-react";
import { Trash2, Minus, Plus, ShoppingBag, MessageCircle, Smartphone, CheckCircle2, XCircle, Loader2, X } from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect, useCallback } from "react";

// ── M-Pesa Checkout Modal ──────────────────────────────────────────────────

type ModalState = "phone" | "pending" | "success" | "failed";

interface MpesaModalProps {
  open: boolean;
  onClose: () => void;
  subtotal: number;
  formatter: Intl.NumberFormat;
  cartSnapshot: unknown;
}

function MpesaModal({ open, onClose, subtotal, formatter, cartSnapshot }: MpesaModalProps) {
  const { clearCart } = useCart();
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [modalState, setModalState] = useState<ModalState>("phone");
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [mpesaRef, setMpesaRef] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const resetModal = useCallback(() => {
    setPhone("");
    setPhoneError("");
    setModalState("phone");
    setTransactionId(null);
    setMpesaRef(null);
    setApiError(null);
  }, []);

  useEffect(() => {
    if (!open) {
      const t = setTimeout(resetModal, 300);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open, resetModal]);

  const initiateMutation = useInitiatePayment({
    mutation: {
      onSuccess: (data) => {
        setTransactionId(data.transactionId);
        setModalState("pending");
      },
      onError: (err: unknown) => {
        const msg = (err as { message?: string })?.message || "Could not reach payment gateway. Try again.";
        setApiError(msg);
        setModalState("phone");
      },
    },
  });

  const { data: statusData } = useGetPaymentStatus(
    transactionId ?? "",
    {
      query: {
        queryKey: getGetPaymentStatusQueryKey(transactionId ?? ""),
        enabled: !!transactionId && modalState === "pending",
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
      setModalState("success");
      clearCart();
    } else if (statusData.status === "failed") {
      setApiError("Payment was declined or cancelled on the phone. Please try again.");
      setModalState("failed");
    }
  }, [statusData]);

  const handleSubmit = () => {
    const local = phone.replace(/\D/g, "").replace(/^0+/, "");
    if (!/^\d{9}$/.test(local)) {
      setPhoneError("Enter your 9-digit Safaricom number (e.g. 712345678)");
      return;
    }
    const clean = `254${local}`;
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-[#111] border border-zinc-800 sm:rounded-none animate-in slide-in-from-bottom-4 duration-300">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-green-500" />
            <span className="text-sm uppercase tracking-widest font-medium text-zinc-200">M-Pesa Checkout</span>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">

          {/* Phone input state */}
          {(modalState === "phone" || modalState === "failed") && (
            <div className="space-y-5">
              <div className="text-center">
                <p className="text-zinc-400 text-sm">
                  You will receive an M-Pesa prompt on your phone to confirm payment of
                </p>
                <p className="text-[#D4AF37] text-2xl font-light mt-1">{formatter.format(subtotal)}</p>
              </div>

              {apiError && (
                <div className="flex items-start gap-2 bg-red-950/40 border border-red-900 rounded-none px-4 py-3 text-red-400 text-xs">
                  <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  {apiError}
                </div>
              )}

              <div>
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-2">
                  M-Pesa Phone Number
                </label>
                <div className="flex w-full bg-zinc-900 border border-zinc-700 focus-within:border-[#D4AF37] transition-colors">
                  <span className="flex items-center gap-1.5 px-3 py-3 text-zinc-400 text-sm border-r border-zinc-700 bg-zinc-950/60 select-none">
                    <span className="text-base leading-none">🇰🇪</span>
                    <span className="font-mono">+254</span>
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 9)); setPhoneError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    placeholder="712345678"
                    className="flex-1 bg-transparent text-zinc-200 text-sm px-4 py-3 outline-none placeholder:text-zinc-700"
                  />
                </div>
                {phoneError && <p className="text-red-400 text-xs mt-1">{phoneError}</p>}
                <p className="text-zinc-600 text-[11px] mt-1">Kenyan Safaricom number — country code is added automatically.</p>
              </div>

              <button
                onClick={handleSubmit}
                disabled={initiateMutation.isPending}
                className="w-full py-4 bg-green-700 hover:bg-green-600 disabled:bg-green-900 text-white text-xs uppercase tracking-widest font-medium transition-colors flex items-center justify-center gap-2"
              >
                {initiateMutation.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Sending Request…</>
                  : <><Smartphone className="w-4 h-4" />Send M-Pesa Request</>
                }
              </button>
            </div>
          )}

          {/* Pending state */}
          {modalState === "pending" && (
            <div className="text-center space-y-6 py-4">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 rounded-full border-2 border-green-900" />
                <div className="absolute inset-0 rounded-full border-t-2 border-green-500 animate-spin" />
                <Smartphone className="absolute inset-0 m-auto w-6 h-6 text-green-500" />
              </div>
              <div>
                <h3 className="text-zinc-200 text-sm font-medium uppercase tracking-wide">Check Your Phone</h3>
                <p className="text-zinc-500 text-xs mt-2">
                  An M-Pesa prompt has been sent to <span className="text-zinc-300">{phone}</span>.
                  Enter your PIN to complete payment of{" "}
                  <span className="text-[#D4AF37]">{formatter.format(subtotal)}</span>.
                </p>
              </div>
              <p className="text-zinc-700 text-[11px]">Checking payment status automatically…</p>
              <button
                onClick={() => { setModalState("phone"); setTransactionId(null); }}
                className="text-zinc-600 hover:text-zinc-400 text-xs underline transition-colors"
              >
                Use a different number
              </button>
            </div>
          )}

          {/* Success state */}
          {modalState === "success" && (
            <div className="text-center space-y-5 py-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <h3 className="text-zinc-200 text-sm font-medium uppercase tracking-widest">Payment Confirmed!</h3>
                <p className="text-zinc-500 text-xs mt-2">
                  Your payment of <span className="text-[#D4AF37]">{formatter.format(subtotal)}</span> was received.
                </p>
                {mpesaRef && (
                  <p className="text-zinc-600 text-[11px] mt-1">
                    M-Pesa ref: <span className="text-zinc-400 font-mono">{mpesaRef}</span>
                  </p>
                )}
              </div>
              <button
                onClick={() => { clearCart(); onClose(); }}
                className="w-full py-4 bg-[#D4AF37] text-black text-xs uppercase tracking-widest font-medium hover:bg-white transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Cart Page ──────────────────────────────────────────────────────────────

export default function Cart() {
  const { items, updateQuantity, removeItem, subtotal, clearCart } = useCart();
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const [mpesaOpen, setMpesaOpen] = useState(false);

  const formatter = new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: settings?.currency || "KES",
    maximumFractionDigits: 0,
  });

  const mpesaEnabled = settings?.sunpayEnabled === "true" && !!settings?.sunpayApiKey;

  const handleCheckout = () => {
    if (!settings?.whatsappNumber) return;
    let message = `Hello! I would like to place an order from ${settings.storeName || "your store"}:\n\n`;
    items.forEach((item) => {
      const name = item.variantName ? `${item.product.name} (${item.variantName})` : item.product.name;
      message += `• ${item.quantity}x ${name} - ${formatter.format(item.unitPrice * item.quantity)}\n`;
    });
    message += `\n*Total: ${formatter.format(subtotal)}*`;
    window.open(`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const cartSnapshot = {
    items: items.map((i) => ({
      productId: i.product.id,
      variantId: i.variantId,
      variantName: i.variantName,
      name: i.product.name,
      quantity: i.quantity,
      price: i.unitPrice,
      imageUrl: i.product.imageUrl,
    })),
    total: subtotal,
  };

  if (items.length === 0) {
    return (
      <RootLayout title="Your Bag" showBack noHeader>
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
    <RootLayout title="Your Bag" showBack noHeader>
      <MpesaModal
        open={mpesaOpen}
        onClose={() => setMpesaOpen(false)}
        subtotal={subtotal}
        formatter={formatter}
        cartSnapshot={cartSnapshot}
      />

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-3 lg:gap-12">
          <div className="lg:col-span-2 space-y-4 pb-4">
            <h2 className="text-[10px] uppercase tracking-widest text-zinc-600 mb-6">
              {items.length} {items.length === 1 ? "item" : "items"}
            </h2>
            {items.map((item) => (
              <div key={`${item.product.id}:${item.variantId ?? 'base'}`} className="flex gap-4 p-4 bg-zinc-900/60 border border-zinc-800 animate-in slide-in-from-right-4">
                <div className="w-20 h-20 bg-zinc-900 overflow-hidden shrink-0 border border-zinc-800">
                  {item.product.imageUrl
                    ? <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover opacity-90" />
                    : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-5 h-5 text-zinc-700" /></div>
                  }
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs uppercase tracking-wide font-light text-zinc-200 leading-snug line-clamp-2">{item.product.name}</h3>
                    {item.variantName && (
                      <p className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">{item.variantName}</p>
                    )}
                    <div className="text-[#D4AF37] text-sm font-medium mt-1">{formatter.format(item.unitPrice)}</div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-4 border border-zinc-800 px-3 py-1.5">
                      <button onClick={() => updateQuantity(item.product.id, item.variantId, item.quantity - 1)} className="text-zinc-600 hover:text-[#D4AF37] transition-colors">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-zinc-300 text-sm w-4 text-center font-light">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product.id, item.variantId, item.quantity + 1)} className="text-zinc-600 hover:text-[#D4AF37] transition-colors">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-light text-zinc-300">{formatter.format(item.unitPrice * item.quantity)}</span>
                      <button onClick={() => removeItem(item.product.id, item.variantId)} className="text-zinc-700 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <button onClick={clearCart} className="text-zinc-700 hover:text-red-400 transition-colors text-xs uppercase tracking-widest mt-2">
              Empty Bag
            </button>
          </div>

          {/* Desktop sidebar */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="bg-zinc-900/60 border border-zinc-800 p-6 sticky top-28">
              <h3 className="text-[10px] uppercase tracking-widest text-zinc-600 mb-6">Order Summary</h3>
              <div className="space-y-3 mb-6">
                {items.map((item) => (
                  <div key={`${item.product.id}:${item.variantId ?? 'base'}`} className="flex justify-between text-xs">
                    <span className="text-zinc-600 truncate mr-3 uppercase tracking-wide">
                      {item.product.name}{item.variantName ? ` — ${item.variantName}` : ''} ×{item.quantity}
                    </span>
                    <span className="text-zinc-400 shrink-0">{formatter.format(item.unitPrice * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-zinc-800 pt-5 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase tracking-widest text-zinc-600">Total</span>
                  <span className="text-2xl font-light text-[#D4AF37]">{formatter.format(subtotal)}</span>
                </div>
              </div>

              {/* M-Pesa button (primary when enabled) */}
              {mpesaEnabled && (
                <button
                  onClick={() => setMpesaOpen(true)}
                  className="w-full py-4 bg-green-700 hover:bg-green-600 text-white text-xs uppercase tracking-widest font-medium transition-colors flex items-center justify-center gap-2 shadow-lg mb-3"
                >
                  <Smartphone className="w-4 h-4" />
                  Pay with M-Pesa
                </button>
              )}

              <button
                onClick={handleCheckout}
                className="w-full py-4 bg-[#D4AF37] text-black text-xs uppercase tracking-widest font-medium hover:bg-white transition-colors flex items-center justify-center gap-2 shadow-lg"
              >
                <MessageCircle className="w-4 h-4" />
                Checkout via WhatsApp
              </button>

              {!settings?.whatsappNumber && (
                <p className="text-[10px] text-zinc-700 text-center mt-3 uppercase tracking-wider">WhatsApp number not configured.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky footer */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/95 backdrop-blur border-t border-zinc-900 z-50 p-4">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[10px] uppercase tracking-widest text-zinc-600">Total</span>
          <span className="text-2xl font-light text-[#D4AF37]">{formatter.format(subtotal)}</span>
        </div>
        <div className={`grid gap-2 ${mpesaEnabled ? "grid-cols-2" : "grid-cols-1"}`}>
          {mpesaEnabled && (
            <button
              onClick={() => setMpesaOpen(true)}
              className="py-3.5 bg-green-700 hover:bg-green-600 text-white text-xs uppercase tracking-widest font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              <Smartphone className="w-4 h-4" />
              M-Pesa
            </button>
          )}
          <button
            onClick={handleCheckout}
            className="py-3.5 bg-[#D4AF37] text-black text-xs uppercase tracking-widest font-medium hover:bg-white transition-colors flex items-center justify-center gap-1.5"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </button>
        </div>
      </div>
    </RootLayout>
  );
}
