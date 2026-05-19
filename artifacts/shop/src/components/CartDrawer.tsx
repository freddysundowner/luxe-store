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
  Smartphone, CheckCircle2, XCircle, Loader2, ArrowRight,
  Receipt, User, MapPin, Mail, ChevronLeft,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type CheckoutStep = "cart" | "customer-info" | "mpesa";
type CheckoutMethod = "whatsapp" | "mpesa";

interface CustomerInfo {
  name: string;
  email: string;
  address: string;
}

// ── Customer Info Step ────────────────────────────────────────────────────────

interface CustomerInfoStepProps {
  method: CheckoutMethod;
  subtotal: string;
  onSubmit: (info: CustomerInfo) => void;
  onBack: () => void;
}

function CustomerInfoStep({ method, subtotal, onSubmit, onBack }: CustomerInfoStepProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [errors, setErrors] = useState<{ name?: string; address?: string }>({});

  const handleSubmit = () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = "Name is required";
    if (!address.trim()) e.address = "Delivery address is required";
    if (Object.keys(e).length) { setErrors(e); return; }
    onSubmit({ name: name.trim(), email: email.trim(), address: address.trim() });
  };

  return (
    <div className="space-y-5">
      {/* Step header */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-0.5">
          {method === "mpesa" ? "Step 1 of 2 — Your details" : "Your details"}
        </p>
        <p className="text-zinc-300 text-sm font-light">
          {method === "mpesa"
            ? "Tell us who you are before we send the M-Pesa request."
            : "We'll include these details with your WhatsApp order."}
        </p>
      </div>

      {/* Amount reminder */}
      <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
        <span className="text-[10px] uppercase tracking-widest text-zinc-600">Order Total</span>
        <span className="text-[#D4AF37] text-lg font-light">{subtotal}</span>
      </div>

      {/* Name */}
      <div>
        <label className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-1.5 flex items-center gap-1">
          <User className="w-3 h-3" />Full Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setErrors(p => ({ ...p, name: undefined })); }}
          placeholder="Jane Doe"
          className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm px-3 py-2.5 outline-none focus:border-[#D4AF37] transition-colors placeholder:text-zinc-700"
        />
        {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
      </div>

      {/* Email */}
      <div>
        <label className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-1.5 flex items-center gap-1">
          <Mail className="w-3 h-3" />Email <span className="text-zinc-700 text-[10px] normal-case">(optional)</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@email.com"
          className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm px-3 py-2.5 outline-none focus:border-[#D4AF37] transition-colors placeholder:text-zinc-700"
        />
      </div>

      {/* Delivery address */}
      <div>
        <label className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-1.5 flex items-center gap-1">
          <MapPin className="w-3 h-3" />Delivery Address <span className="text-red-500">*</span>
        </label>
        <textarea
          value={address}
          onChange={(e) => { setAddress(e.target.value); setErrors(p => ({ ...p, address: undefined })); }}
          placeholder="e.g. House 12, Ngong Road, Nairobi"
          rows={3}
          className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm px-3 py-2.5 outline-none focus:border-[#D4AF37] transition-colors placeholder:text-zinc-700 resize-none"
        />
        {errors.address && <p className="text-red-400 text-xs mt-1">{errors.address}</p>}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-3 border border-zinc-800 text-zinc-500 text-xs uppercase tracking-widest hover:text-zinc-300 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />Back
        </button>
        <button
          onClick={handleSubmit}
          className="flex-1 py-3 bg-[#D4AF37] text-black text-xs uppercase tracking-widest font-medium hover:bg-white transition-colors flex items-center justify-center gap-1.5"
        >
          {method === "mpesa"
            ? <><Smartphone className="w-3.5 h-3.5" />Continue to Payment</>
            : <><MessageCircle className="w-3.5 h-3.5" />Send WhatsApp Order</>
          }
        </button>
      </div>
    </div>
  );
}

// ── M-Pesa Flow ───────────────────────────────────────────────────────────────

type MpesaState = "idle" | "pending" | "success" | "failed";

interface MpesaFlowProps {
  subtotal: number;
  formatter: Intl.NumberFormat;
  cartSnapshot: unknown;
  customerInfo: CustomerInfo;
  whatsappNumber?: string;
  storeName?: string;
  onSuccess: () => void;
  onBack: () => void;
}

function MpesaFlow({
  subtotal, formatter, cartSnapshot, customerInfo,
  whatsappNumber, storeName, onSuccess, onBack,
}: MpesaFlowProps) {
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [state, setState] = useState<MpesaState>("idle");
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [mpesaRef, setMpesaRef] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const { clearCart } = useCart();

  const initiateMutation = useInitiatePayment({
    mutation: {
      onSuccess: (data) => { setTransactionId(data.transactionId); setState("pending"); },
      onError: (err: unknown) => {
        setApiError((err as { message?: string })?.message || "Could not reach payment gateway.");
        setState("idle");
      },
    },
  });

  const { data: statusData } = useGetPaymentStatus(transactionId ?? "", {
    query: {
      queryKey: getGetPaymentStatusQueryKey(transactionId ?? ""),
      enabled: !!transactionId && state === "pending",
      refetchInterval: (query) => {
        const s = (query.state.data as { status?: string } | undefined)?.status;
        return s === "completed" || s === "failed" ? false : 3000;
      },
    },
  });

  useEffect(() => {
    if (!statusData) return;
    if (statusData.status === "completed") {
      setMpesaRef((statusData as { mpesaRef?: string | null }).mpesaRef ?? null);
      setState("success");
      clearCart();
    } else if (statusData.status === "failed") {
      setApiError("Payment was declined or cancelled. Please try again.");
      setState("failed");
    }
  }, [statusData, clearCart]);

  const handleSubmit = () => {
    const local = phone.replace(/\D/g, "").replace(/^0+/, "");
    if (!/^\d{9}$/.test(local)) {
      setPhoneError("Enter your 9-digit Safaricom number (e.g. 712345678)");
      return;
    }
    const clean = `254${local}`;
    setPhoneError("");
    setApiError(null);
    const snapshot = {
      ...(cartSnapshot as Record<string, unknown>),
      customer: { name: customerInfo.name, email: customerInfo.email, address: customerInfo.address },
    };
    initiateMutation.mutate({ data: { phoneNumber: clean, amount: subtotal, cartSnapshot: snapshot } });
  };

  const handleShareOnWhatsApp = () => {
    if (!whatsappNumber) return;
    const sym = formatter.format(subtotal).replace(/[^0-9.,]/g, "");
    let msg = `*New M-Pesa Order — ${storeName ?? "Store"}*\n\n`;
    msg += `*Name:* ${customerInfo.name}\n`;
    if (customerInfo.email) msg += `*Email:* ${customerInfo.email}\n`;
    msg += `*Delivery:* ${customerInfo.address}\n`;
    msg += `*Paid from:* ${phone}\n`;
    if (mpesaRef) msg += `*M-Pesa Ref:* ${mpesaRef}\n`;
    msg += `*Amount:* KSh ${sym}\n`;
    if (transactionId) {
      const base = window.location.origin + (import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "");
      msg += `\n*Receipt:* ${base}/receipt/${transactionId}`;
    }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // ── Success ──
  if (state === "success") {
    return (
      <div className="space-y-5 py-2">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-green-500" />
          </div>
          <div>
            <p className="text-zinc-200 text-sm font-medium uppercase tracking-wide">Payment Confirmed!</p>
            <p className="text-zinc-500 text-xs mt-1">{formatter.format(subtotal)} received via M-Pesa</p>
            {mpesaRef && <p className="text-zinc-600 text-[11px] mt-1 font-mono">Ref: {mpesaRef}</p>}
          </div>
        </div>

        {/* Share prompt */}
        {whatsappNumber && (
          <div className="bg-zinc-900 border border-zinc-800 p-4 space-y-3">
            <p className="text-zinc-400 text-xs text-center leading-relaxed">
              Share your order details with us on WhatsApp so we can prepare your delivery.
            </p>
            <button
              onClick={handleShareOnWhatsApp}
              className="w-full py-3 bg-[#25D366] hover:bg-[#1fba59] text-white text-xs uppercase tracking-widest font-medium transition-colors flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Share Order on WhatsApp
            </button>
          </div>
        )}

        <button
          onClick={() => { onSuccess(); if (transactionId) navigate(`/receipt/${transactionId}`); }}
          className="w-full py-3 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs uppercase tracking-widest font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Receipt className="w-3.5 h-3.5" />
          View Receipt
        </button>
      </div>
    );
  }

  // ── Pending ──
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

  // ── Idle / Failed ──
  return (
    <div className="space-y-4">
      {/* Customer summary */}
      <div className="bg-zinc-900/60 border border-zinc-800 px-4 py-3 space-y-1.5 text-xs">
        <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2">Step 2 of 2 — Payment</p>
        <p className="text-zinc-400"><span className="text-zinc-600">Name:</span> {customerInfo.name}</p>
        {customerInfo.email && <p className="text-zinc-400"><span className="text-zinc-600">Email:</span> {customerInfo.email}</p>}
        <p className="text-zinc-400 line-clamp-1"><span className="text-zinc-600">Deliver to:</span> {customerInfo.address}</p>
      </div>

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
        <div className="flex w-full bg-zinc-900 border border-zinc-700 focus-within:border-[#D4AF37] transition-colors">
          <span className="flex items-center gap-1.5 px-3 py-2.5 text-zinc-400 text-sm border-r border-zinc-700 bg-zinc-950/60 select-none">
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
            className="flex-1 bg-transparent text-zinc-200 text-sm px-3 py-2.5 outline-none placeholder:text-zinc-700"
          />
        </div>
        {phoneError && <p className="text-red-400 text-xs mt-1">{phoneError}</p>}
        <p className="text-zinc-600 text-[11px] mt-1">Kenyan Safaricom number — country code is added automatically.</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-3 border border-zinc-800 text-zinc-500 text-xs uppercase tracking-widest hover:text-zinc-300 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={initiateMutation.isPending}
          className="flex-1 py-3 bg-green-700 hover:bg-green-600 disabled:bg-green-900 text-white text-xs uppercase tracking-widest font-medium transition-colors flex items-center justify-center gap-1.5"
        >
          {initiateMutation.isPending
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Sending…</>
            : <><Smartphone className="w-3.5 h-3.5" />Send M-Pesa Request</>
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
  const [step, setStep] = useState<CheckoutStep>("cart");
  const [checkoutMethod, setCheckoutMethod] = useState<CheckoutMethod>("whatsapp");
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const formatter = new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: settings?.currency || "KES",
    maximumFractionDigits: 0,
  });

  const mpesaEnabled = settings?.sunpayEnabled === "true" && !!settings?.sunpayApiKey;

  // Reset checkout state when drawer closes
  useEffect(() => {
    if (!isCartOpen) {
      const t = setTimeout(() => { setStep("cart"); setCustomerInfo(null); }, 350);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isCartOpen]);

  const cartSnapshot = {
    items: items.map((i) => ({ productId: i.product.id, name: i.product.name, quantity: i.quantity, price: i.product.price, imageUrl: i.product.imageUrl })),
    total: subtotal,
  };

  // Called when customer info form is submitted
  const handleCustomerInfoSubmit = (info: CustomerInfo) => {
    setCustomerInfo(info);
    if (checkoutMethod === "whatsapp") {
      // Build and send WhatsApp message immediately
      if (!settings?.whatsappNumber) return;
      let msg = `*New Order — ${settings.storeName || "Store"}*\n\n`;
      msg += `*Name:* ${info.name}\n`;
      if (info.email) msg += `*Email:* ${info.email}\n`;
      msg += `*Deliver to:* ${info.address}\n\n`;
      msg += `*Items:*\n`;
      items.forEach((item) => {
        msg += `  • ${item.quantity}× ${item.product.name} — ${formatter.format(item.product.price * item.quantity)}\n`;
      });
      msg += `\n*Total: ${formatter.format(subtotal)}*`;
      window.open(`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(msg)}`, "_blank");
      // Go back to cart (order sent)
      setStep("cart");
    } else {
      // Proceed to M-Pesa step
      setStep("mpesa");
    }
  };

  const handleMpesaSuccess = useCallback(() => {
    clearCart();
    setStep("cart");
    setCustomerInfo(null);
    closeCart();
  }, [clearCart, closeCart]);

  // Determine header title for current step
  const headerTitle = step === "customer-info"
    ? "Your Details"
    : step === "mpesa"
    ? "M-Pesa Payment"
    : "Your Bag";

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
            <span className="text-xs uppercase tracking-widest font-medium text-zinc-200">{headerTitle}</span>
            {step === "cart" && items.length > 0 && (
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
          {/* ── Customer info step ── */}
          {step === "customer-info" && (
            <div className="p-5">
              <CustomerInfoStep
                method={checkoutMethod}
                subtotal={formatter.format(subtotal)}
                onSubmit={handleCustomerInfoSubmit}
                onBack={() => setStep("cart")}
              />
            </div>
          )}

          {/* ── M-Pesa step ── */}
          {step === "mpesa" && customerInfo && (
            <div className="p-5">
              <MpesaFlow
                subtotal={subtotal}
                formatter={formatter}
                cartSnapshot={cartSnapshot}
                customerInfo={customerInfo}
                whatsappNumber={settings?.whatsappNumber}
                storeName={settings?.storeName}
                onSuccess={handleMpesaSuccess}
                onBack={() => setStep("customer-info")}
              />
            </div>
          )}

          {/* ── Cart step ── */}
          {step === "cart" && (
            items.length === 0 ? (
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
            ) : (
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
                          <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="px-2 py-1 text-zinc-500 hover:text-[#D4AF37] transition-colors">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-zinc-300 text-xs w-5 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="px-2 py-1 text-zinc-500 hover:text-[#D4AF37] transition-colors">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-zinc-400">{formatter.format(item.product.price * item.quantity)}</span>
                          <button onClick={() => removeItem(item.product.id)} className="text-zinc-700 hover:text-red-400 transition-colors">
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
            )
          )}
        </div>

        {/* Footer — only on cart step with items */}
        {step === "cart" && items.length > 0 && (
          <div className="border-t border-zinc-800 p-5 space-y-3 shrink-0">
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase tracking-widest text-zinc-600">Total</span>
              <span className="text-xl font-light text-[#D4AF37]">{formatter.format(subtotal)}</span>
            </div>

            {mpesaEnabled && (
              <button
                onClick={() => { setCheckoutMethod("mpesa"); setStep("customer-info"); }}
                className="w-full py-3.5 bg-green-700 hover:bg-green-600 text-white text-xs uppercase tracking-widest font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Smartphone className="w-4 h-4" />
                Pay with M-Pesa
              </button>
            )}

            <button
              onClick={() => { setCheckoutMethod("whatsapp"); setStep("customer-info"); }}
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
