import { useState, useEffect, useCallback } from "react";
import { Smartphone, CheckCircle2, XCircle, Loader2, X } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import {
  useGetSettings,
  getGetSettingsQueryKey,
  useInitiatePayment,
  useGetPaymentStatus,
  getGetPaymentStatusQueryKey,
} from "@workspace/api-client-react";

type ModalState = "phone" | "pending" | "success" | "failed";

interface MpesaModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Global M-Pesa STK-push overlay. Self-sufficient: reads cart + settings from
 * context, computes the snapshot internally, and on success clears the cart.
 *
 * Used by:
 *  - Quick Buy dialog (Buy Now → Pay with M-Pesa): opens directly without
 *    routing through the cart drawer.
 *  - Cart page Pay-with-M-Pesa buttons.
 *  - Cart drawer Pay-with-M-Pesa button (skipping the in-drawer customer-info
 *    step, which only the WhatsApp flow really needs).
 */
export function MpesaModal({ open, onClose }: MpesaModalProps) {
  const {
    items,
    subtotal,
    clearCart,
    pendingQuickBuyLine,
    setPendingQuickBuyLine,
    updateQuantity,
    removeItem,
  } = useCart();
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });

  const formatter = new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: settings?.currency || "KES",
    maximumFractionDigits: 0,
  });

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

  // On close: reset state, and if the customer abandoned a Quick Buy mid-flow
  // (i.e. didn't complete payment) roll back the quantity that Quick Buy
  // added so abandoned quick-buys don't linger in the cart. Mirrors the
  // CartDrawer's behaviour on close.
  useEffect(() => {
    if (open) return;
    if (modalState !== "success" && pendingQuickBuyLine) {
      const { productId, variantId, addedQty } = pendingQuickBuyLine;
      const existing = items.find(
        (i) => i.product.id === productId && (i.variantId ?? null) === (variantId ?? null)
      );
      if (existing) {
        const remaining = existing.quantity - addedQty;
        if (remaining <= 0) {
          removeItem(productId, variantId);
        } else {
          updateQuantity(productId, variantId, remaining);
        }
      }
      setPendingQuickBuyLine(null);
    } else if (modalState === "success" && pendingQuickBuyLine) {
      // Success already cleared the cart — just drop the bookkeeping.
      setPendingQuickBuyLine(null);
    }
    const t = setTimeout(resetModal, 300);
    return () => clearTimeout(t);
    // We deliberately only react to open transitions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
    initiateMutation.mutate({
      data: {
        phoneNumber: clean,
        amount: subtotal,
        cartSnapshot: cartSnapshot as Record<string, unknown>,
      },
    });
  };

  if (!open) return null;
  // Guard against *opening* an empty-cart overlay (shouldn't happen via the
  // normal entry points, but a defensive check avoids charging zero).
  // Only applies before payment starts — once we're pending/success/failed,
  // the cart may legitimately be empty (success path clears it) and we must
  // keep rendering so the user can see the result and close the overlay.
  if (items.length === 0 && modalState === "phone") return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center">
      {/* Solid scrim instead of backdrop-blur — a live blur over the whole
          viewport is extremely expensive on the compositor and gets re-run
          every frame while the pending-state spinner animates, pegging CPU
          on low-end devices. The slightly higher opacity reads nearly the
          same visually. */}
      <div className="absolute inset-0 bg-black/90" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-[#111] border border-zinc-800 sm:rounded-none animate-in slide-in-from-bottom-4 duration-300 transform-gpu">

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
                onClick={onClose}
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
