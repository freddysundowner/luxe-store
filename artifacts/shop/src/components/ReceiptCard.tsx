import { CheckCircle2, Clock, XCircle, MessageCircle, ShoppingBag, Store } from "lucide-react";

interface CartItem { name: string; variantName?: string | null; quantity: number; price: number; imageUrl?: string }
interface CartSnapshot { items?: CartItem[] }

function formatPhone(phone: string) {
  if (phone.startsWith("254") && phone.length === 12)
    return `+254 ${phone.slice(3, 6)} ${phone.slice(6, 9)} ${phone.slice(9)}`;
  return phone;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-KE", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function DetailRow({ label, value, mono, small, bold, highlight }: {
  label: string; value: string;
  mono?: boolean; small?: boolean; bold?: boolean; highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-baseline gap-4">
      <span className="text-zinc-600 text-xs shrink-0">{label}</span>
      <span className={`text-right break-all ${
        highlight ? "text-green-400 font-mono text-xs" :
        bold ? "text-zinc-100 font-semibold text-sm" :
        small ? "text-zinc-600 font-mono text-[10px]" :
        mono ? "text-zinc-400 font-mono text-xs" :
        "text-zinc-300 text-xs"
      }`}>
        {value}
      </span>
    </div>
  );
}

export interface ReceiptCardProps {
  storeName: string;
  storeLogoUrl?: string | null;
  currencySymbol?: string;
  status: string;
  amount: number;
  phoneNumber: string;
  transactionId: string;
  externalRef?: string | null;
  mpesaRef?: string | null;
  createdAt: string;
  cartSnapshot?: unknown;
  onShareToWhatsApp?: () => void;
  onContinueShopping?: () => void;
  /** Hide footer action buttons (for modal view) */
  hideActions?: boolean;
}

export function ReceiptCard({
  storeName, storeLogoUrl, currencySymbol = "KSh",
  status, amount, phoneNumber, transactionId, externalRef, mpesaRef, createdAt,
  cartSnapshot, onShareToWhatsApp, onContinueShopping, hideActions,
}: ReceiptCardProps) {
  const cart = cartSnapshot as CartSnapshot | null;
  const items: CartItem[] = cart?.items ?? [];
  const sym = currencySymbol;
  const isPaid = status === "completed";
  const isPending = status === "pending";

  return (
    <div className="bg-[#0a0a0a]">
      <div className="max-w-md mx-auto py-6 px-4">
        <div className="bg-[#0f0f0f] border border-zinc-800">

          {/* Store header */}
          <div className="border-b border-zinc-800 px-7 py-6 flex items-center gap-4">
            {storeLogoUrl
              ? <img src={storeLogoUrl} alt={storeName} className="w-10 h-10 object-contain" />
              : <div className="w-10 h-10 bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
                  <Store className="w-5 h-5 text-[#D4AF37]" />
                </div>
            }
            <div>
              <p className="text-zinc-100 font-semibold text-sm tracking-wide">{storeName}</p>
              <p className="text-zinc-600 text-[11px] uppercase tracking-widest mt-0.5">Payment Receipt</p>
            </div>
          </div>

          {/* Status banner */}
          <div className={`px-7 py-5 border-b border-zinc-800 flex items-center gap-3 ${
            isPaid ? "bg-green-950/20" : isPending ? "bg-yellow-950/20" : "bg-red-950/20"
          }`}>
            {isPaid
              ? <CheckCircle2 className="w-7 h-7 text-green-500 shrink-0" />
              : isPending
              ? <Clock className="w-7 h-7 text-yellow-400 shrink-0" />
              : <XCircle className="w-7 h-7 text-red-400 shrink-0" />
            }
            <div>
              <p className={`font-semibold text-sm ${isPaid ? "text-green-400" : isPending ? "text-yellow-400" : "text-red-400"}`}>
                {isPaid ? "Payment Confirmed" : isPending ? "Payment Pending" : "Payment Failed"}
              </p>
              <p className="text-zinc-600 text-xs mt-0.5">
                {isPaid
                  ? `${sym} ${amount.toLocaleString()} received via M-Pesa`
                  : isPending
                  ? "Waiting for M-Pesa confirmation…"
                  : "This payment was declined or cancelled."}
              </p>
            </div>
          </div>

          {/* Items */}
          {items.length > 0 && (
            <div className="border-b border-zinc-800">
              <div className="px-7 pt-5 pb-1">
                <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-3">Items</p>
              </div>
              <div className="divide-y divide-zinc-900">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-7 py-3">
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt={item.name} className="w-9 h-9 object-cover shrink-0 opacity-80" />
                      : <div className="w-9 h-9 bg-zinc-900 flex items-center justify-center shrink-0">
                          <ShoppingBag className="w-4 h-4 text-zinc-700" />
                        </div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-200 text-xs font-light uppercase tracking-wide truncate">{item.name}</p>
                      {item.variantName && (
                        <p className="text-zinc-500 text-[10px] uppercase tracking-widest mt-0.5 truncate">{item.variantName}</p>
                      )}
                      <p className="text-zinc-600 text-[11px] mt-0.5">Qty {item.quantity}</p>
                    </div>
                    <p className="text-zinc-300 text-xs shrink-0">{sym} {(item.price * item.quantity).toLocaleString()}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center px-7 py-4 border-t border-zinc-800/60">
                <span className="text-[10px] uppercase tracking-widest text-zinc-600">Total</span>
                <span className="text-[#D4AF37] text-lg font-light">{sym} {amount.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Details */}
          <div className="px-7 py-5 space-y-3.5 border-b border-zinc-800">
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-4">Details</p>
            {externalRef && <DetailRow label="Order Ref" value={externalRef} mono />}
            {mpesaRef && <DetailRow label="M-Pesa Ref" value={mpesaRef} highlight />}
            <DetailRow label="Phone" value={formatPhone(phoneNumber)} />
            <DetailRow label="Amount" value={`${sym} ${amount.toLocaleString()}`} bold />
            <DetailRow label="Date" value={formatDate(createdAt)} />
            <DetailRow label="Transaction ID" value={transactionId} mono small />
          </div>

          {/* Actions */}
          {!hideActions && (
            <div className="px-7 py-5 space-y-3">
              {onShareToWhatsApp && isPaid && (
                <button
                  onClick={onShareToWhatsApp}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#25D366] hover:bg-[#1fba59] text-white text-xs uppercase tracking-widest font-medium transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  Share Receipt on WhatsApp
                </button>
              )}
              {onContinueShopping && (
                <button
                  onClick={onContinueShopping}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#D4AF37] hover:bg-white text-black text-xs uppercase tracking-widest font-medium transition-colors"
                >
                  Continue Shopping
                </button>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-dashed border-zinc-800 my-1 mx-7" />
        <p className="text-center text-zinc-700 text-[10px] mt-4 uppercase tracking-widest">Thank you for your order</p>
      </div>
    </div>
  );
}
