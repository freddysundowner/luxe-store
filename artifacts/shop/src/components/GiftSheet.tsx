import { useEffect, useMemo, useRef, useState } from "react";
import { Gift, X, Smartphone, Loader2, CheckCircle2, XCircle, MessageCircle, Copy, Share2, ChevronDown, Plus, Trash2, ChevronLeft, Search } from "lucide-react";
import {
  Product,
  useCreateGift,
  useInitiatePayment,
  useGetPaymentStatus,
  getGetPaymentStatusQueryKey,
  useGetSettings,
  getGetSettingsQueryKey,
  useListProducts,
  getListProductsQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { BundleBoxCover } from "@/components/BundleBoxCover";

type Step = "preview" | "picker" | "form" | "phone" | "pending" | "success" | "failed";

interface GiftSheetProps {
  open: boolean;
  product: Product | null;
  onClose: () => void;
}

interface ExtraItem {
  productId: number;
  name: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
}

const fmt = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 });

/**
 * Unified gift flow for ANY product (simple or bundle):
 *   preview → (optional add-more-items via picker) → form → phone → pay → share.
 *
 * Multi-item gifts: sender can add additional products on top of the primary,
 * combining them into one gift box paid for in a single M-Pesa transaction.
 * Snapshot is stored on the gift row's `items` jsonb column.
 *
 * Single-item gifts still work — `items` is just sent as null/empty.
 *
 * Behavior contract:
 *  - Sender must pay before sharing (gift starts "pending", flips to "paid"
 *    only when the linked M-Pesa payment completes via webhook / polling).
 *  - Gift+payment linked by `externalRef = "GIFT-<claimToken>"`.
 *  - Share message keeps contents a surprise.
 */
export function GiftSheet({ open, product, onClose }: GiftSheetProps) {
  const { toast } = useToast();
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });

  // Always start on the preview step so the sender sees the gift box and can
  // optionally add more items before checkout.
  const [step, setStep] = useState<Step>("preview");
  const [itemsExpanded, setItemsExpanded] = useState(false);
  const [extras, setExtras] = useState<ExtraItem[]>([]);
  const [pickerSearch, setPickerSearch] = useState("");
  const [recipient, setRecipient] = useState("");
  const [sender, setSender] = useState("");
  const [note, setNote] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [apiError, setApiError] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [mpesaRef, setMpesaRef] = useState<string | null>(null);
  const [giftLink, setGiftLink] = useState("");
  // Cache the claimToken of the gift we've already created for this product
  // so a payment-initiation retry doesn't spawn orphan pending gifts.
  const createdGiftTokenRef = useRef<string | null>(null);

  // Reset on open so reopening starts fresh.
  useEffect(() => {
    if (!open) return;
    setStep("preview");
    setItemsExpanded(false);
    setExtras([]);
    setPickerSearch("");
    setRecipient("");
    setSender("");
    setNote("");
    setPhone("");
    setPhoneError("");
    setApiError(null);
    setTransactionId(null);
    setMpesaRef(null);
    setGiftLink("");
    createdGiftTokenRef.current = null;
  }, [open, product?.id]);

  const createGiftMutation = useCreateGift({
    mutation: {
      onError: () => {
        setApiError("Could not create gift. Try again.");
        setStep("phone");
      },
    },
  });

  const initiateMutation = useInitiatePayment({
    mutation: {
      onSuccess: (data) => {
        setTransactionId(data.transactionId);
        setStep("pending");
      },
      onError: (err: unknown) => {
        const msg = (err as { message?: string })?.message || "Could not reach payment gateway. Try again.";
        setApiError(msg);
        setStep("phone");
      },
    },
  });

  // Poll only while the sheet is open AND we're on the pending step.
  const { data: statusData } = useGetPaymentStatus(transactionId ?? "", {
    query: {
      queryKey: getGetPaymentStatusQueryKey(transactionId ?? ""),
      enabled: open && !!transactionId && step === "pending",
      refetchInterval: (q) => {
        const s = (q.state.data as { status?: string } | undefined)?.status;
        if (s === "completed" || s === "failed") return false;
        return 3000;
      },
    },
  });

  useEffect(() => {
    if (!statusData) return;
    if (statusData.status === "completed") {
      setMpesaRef((statusData as { mpesaRef?: string | null }).mpesaRef ?? null);
      setStep("success");
    } else if (statusData.status === "failed") {
      setApiError("Payment was declined or cancelled. Please try again.");
      setStep("failed");
    }
  }, [statusData]);

  // Catalog for the picker. Only fetched while the picker is open to keep the
  // sheet snappy.
  const { data: allProducts } = useListProducts(undefined, {
    query: {
      queryKey: getListProductsQueryKey(),
      enabled: open && step === "picker",
    },
  });

  // Hold the gift link so we can still share after the transaction is settled.
  const giftLinkRef = useRef("");
  giftLinkRef.current = giftLink;

  // ── Derived totals ──────────────────────────────────────────────────────
  const primaryPrice = Number(product?.price ?? 0);
  const extrasTotal = useMemo(
    () => extras.reduce((sum, x) => sum + x.price * x.quantity, 0),
    [extras],
  );
  const totalPrice = primaryPrice + extrasTotal;
  const totalItemCount = (extras.reduce((n, x) => n + x.quantity, 0)) + 1;
  // Items in the underlying bundle (if the primary IS a bundle) — used for
  // the expandable "what's inside" preview.
  const bundleItems = (product?.bundleProducts ?? []) as Array<{ id: number; name: string; imageUrl: string | null }>;

  const handleAddExtra = (p: { id: number; name: string; price: number | string; imageUrl?: string | null }) => {
    setExtras((prev) => {
      const existing = prev.find((x) => x.productId === p.id);
      if (existing) {
        return prev.map((x) => x.productId === p.id ? { ...x, quantity: x.quantity + 1 } : x);
      }
      return [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          price: Number(p.price),
          imageUrl: p.imageUrl ?? null,
          quantity: 1,
        },
      ];
    });
    setStep("preview");
    setPickerSearch("");
  };

  const handleRemoveExtra = (productId: number) => {
    setExtras((prev) => prev.filter((x) => x.productId !== productId));
  };

  const handleContinue = () => {
    setApiError(null);
    setStep("phone");
  };

  const submitting = createGiftMutation.isPending || initiateMutation.isPending;

  const handlePay = async () => {
    if (!product) return;
    if (submitting) return;

    const local = phone.replace(/\D/g, "").replace(/^0+/, "");
    if (!/^\d{9}$/.test(local)) {
      setPhoneError("Enter your 9-digit Safaricom number (e.g. 712345678)");
      return;
    }
    setPhoneError("");
    setApiError(null);
    const clean = `254${local}`;

    try {
      // 1. Create the gift the first time only. Reuse the cached claimToken
      //    on retry so we don't accumulate orphan pending rows.
      let claimToken = createdGiftTokenRef.current;
      if (!claimToken) {
        // Build the items snapshot. Always include the primary first; any
        // extras the sender added come after. We only send `items` when
        // there's more than the primary, to keep legacy single-item gifts
        // representable as-is in the DB.
        const items = extras.length > 0
          ? [
              {
                productId: product.id,
                name: product.name,
                price: primaryPrice,
                imageUrl: product.imageUrl ?? null,
                quantity: 1,
              },
              ...extras.map((x) => ({
                productId: x.productId,
                name: x.name,
                price: x.price,
                imageUrl: x.imageUrl,
                quantity: x.quantity,
              })),
            ]
          : undefined;

        const gift = await createGiftMutation.mutateAsync({
          data: {
            productId: product.id,
            productName: extras.length > 0 ? `${totalItemCount} items` : product.name,
            productPrice: totalPrice,
            productImageUrl: product.imageUrl ?? undefined,
            items,
            recipientName: recipient.trim() || undefined,
            note: note.trim() || undefined,
            senderName: sender.trim() || undefined,
            paymentMethod: "mpesa",
          },
        });
        claimToken = gift.claimToken;
        createdGiftTokenRef.current = claimToken;
        setGiftLink(`${window.location.origin}/gift/${claimToken}`);
      }

      // 2. M-Pesa STK push tagged with GIFT-<token>.
      await initiateMutation.mutateAsync({
        data: {
          phoneNumber: clean,
          amount: totalPrice,
          externalRef: `GIFT-${claimToken}`,
        },
      });
    } catch {
      // Mutations already set apiError / step via their onError handlers.
    }
  };

  const shareMessage = () => {
    if (!product) return "";
    const storeName = settings?.storeName || "Luxe Store";
    const to = recipient.trim() || "you";
    const from = sender.trim() ? ` from ${sender.trim()}` : "";
    const notePreview = note.trim() ? `\n\n"${note.trim()}"` : "";
    // Keep the contents a surprise — never include item names or price.
    return (
      `🎁 Hey ${to}! You've got a surprise gift${from} via ${storeName}.${notePreview}\n\n` +
      `Tap to unwrap: ${giftLinkRef.current}`
    );
  };

  const sendViaWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage())}`, "_blank");
  };

  const copyLink = () => {
    navigator.clipboard.writeText(giftLinkRef.current);
    toast({ title: "Gift link copied!" });
  };

  const nativeShare = () => {
    if (!product) return;
    if (navigator.share) {
      navigator
        .share({ title: `A surprise gift for ${recipient.trim() || "you"}`, text: shareMessage(), url: giftLinkRef.current })
        .catch(() => {});
    } else {
      copyLink();
    }
  };

  if (!open || !product) return null;

  // Header thumbnail images — prefer extras when present (multi-item gift),
  // else the primary product image, else bundle items.
  const headerItemImages = extras.length > 0
    ? [product.imageUrl ?? null, ...extras.map((x) => x.imageUrl)]
    : (bundleItems.map((bp) => bp.imageUrl));

  // Picker list — exclude the primary and bundle products themselves (we
  // don't allow gifting a bundle inside another gift to keep pricing sane).
  const pickableProducts = (allProducts ?? []).filter((p) => {
    if (p.id === product.id) return false;
    if (p.kind === "bundle") return false;
    if (!p.isActive) return false;
    if (extras.some((x) => x.productId === p.id)) return false;
    const q = pickerSearch.trim().toLowerCase();
    if (q && !p.name.toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <>
      <div className="fixed inset-0 z-[200] bg-black/70" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-[210] sm:max-w-md sm:left-1/2 sm:-translate-x-1/2 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 bg-[#0a0a0a] border-t sm:border border-[#D4AF37]/20 max-h-[92dvh] sm:max-h-[90vh] flex flex-col"
        style={{ animation: "giftSlideUp 0.28s cubic-bezier(0.16,1,0.3,1) forwards" }}
      >
        <style>{`@keyframes giftSlideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-0.5 bg-zinc-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-zinc-900 shrink-0">
          <div className="relative w-14 h-14 bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0">
            {extras.length > 0
              ? <BundleBoxCover itemImages={headerItemImages} alt="Gift bundle" className="w-full h-full" />
              : product.kind === "bundle" && !product.imageUrl
                ? <BundleBoxCover itemImages={headerItemImages} alt={product.name} className="w-full h-full" />
                : product.imageUrl
                  ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  : <Gift className="w-6 h-6 text-zinc-700 m-auto mt-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wide text-zinc-300 font-light truncate">
              {extras.length > 0 ? `Gift bundle · ${totalItemCount} items` : product.name}
            </p>
            <p className="text-[#D4AF37] text-sm font-light mt-0.5">{fmt.format(totalPrice)}</p>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step: preview ─ shown for every product. Lets sender review the
            wrapped gift and optionally add more items. */}
        {step === "preview" && (
          <div className="px-5 pt-4 pb-5 space-y-4 overflow-y-auto">
            <div className="relative aspect-square w-full max-w-[280px] mx-auto bg-zinc-900 border border-zinc-800 overflow-hidden">
              {extras.length > 0 ? (
                <BundleBoxCover itemImages={headerItemImages} alt="Gift bundle" className="w-full h-full" />
              ) : product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <BundleBoxCover itemImages={headerItemImages} alt={product.name} className="w-full h-full" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5">
                <Gift className="w-3 h-3 text-[#D4AF37]" />
                <p className="text-[9px] uppercase tracking-[0.2em] text-[#D4AF37]">
                  {extras.length > 0 || product.kind === "bundle" ? "Gift bundle" : "Surprise gift"}
                </p>
              </div>
            </div>

            {/* Items list (always shown when there's more than one thing
                inside — either bundle contents OR sender-added extras). */}
            {(extras.length > 0 || bundleItems.length > 0) && (
              <>
                <button
                  type="button"
                  onClick={() => setItemsExpanded((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900/60 border border-zinc-800 hover:border-[#D4AF37]/40 transition-colors"
                  aria-expanded={itemsExpanded}
                >
                  <span className="text-[10px] uppercase tracking-widest text-zinc-300">
                    What's inside · {extras.length > 0 ? totalItemCount : bundleItems.length} item{(extras.length > 0 ? totalItemCount : bundleItems.length) === 1 ? "" : "s"}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${itemsExpanded ? "rotate-180" : ""}`} />
                </button>

                {itemsExpanded && (
                  <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {/* Always include the primary first when in multi-item mode */}
                    {extras.length > 0 && (
                      <li className="flex items-center gap-3 bg-zinc-900/40 border border-zinc-800 px-2.5 py-2">
                        <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0">
                          {product.imageUrl
                            ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                            : <Gift className="w-4 h-4 text-zinc-700 m-auto mt-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-zinc-300 truncate">{product.name}</p>
                          <p className="text-[10px] text-zinc-600">{fmt.format(primaryPrice)}</p>
                        </div>
                      </li>
                    )}
                    {extras.map((x) => (
                      <li key={x.productId} className="flex items-center gap-3 bg-zinc-900/40 border border-zinc-800 px-2.5 py-2">
                        <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0">
                          {x.imageUrl
                            ? <img src={x.imageUrl} alt={x.name} className="w-full h-full object-cover" />
                            : <Gift className="w-4 h-4 text-zinc-700 m-auto mt-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-zinc-300 truncate">{x.name}{x.quantity > 1 ? ` × ${x.quantity}` : ""}</p>
                          <p className="text-[10px] text-zinc-600">{fmt.format(x.price * x.quantity)}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveExtra(x.productId)}
                          aria-label={`Remove ${x.name}`}
                          className="text-zinc-600 hover:text-red-400 transition-colors p-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                    {extras.length === 0 && bundleItems.map((bp) => (
                      <li key={bp.id} className="flex items-center gap-3 bg-zinc-900/40 border border-zinc-800 px-2.5 py-2">
                        <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0">
                          {bp.imageUrl
                            ? <img src={bp.imageUrl} alt={bp.name} className="w-full h-full object-cover" />
                            : <Gift className="w-4 h-4 text-zinc-700 m-auto mt-3" />}
                        </div>
                        <p className="flex-1 text-xs text-zinc-300 truncate">{bp.name}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {/* Add-another-item button — opens the picker */}
            <button
              type="button"
              onClick={() => setStep("picker")}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-zinc-700 hover:border-[#D4AF37]/60 text-zinc-400 hover:text-[#D4AF37] text-[11px] uppercase tracking-widest transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />Add another item
            </button>

            <button
              onClick={() => setStep("form")}
              className="w-full py-3.5 bg-[#D4AF37] text-black text-xs uppercase tracking-widest font-semibold hover:bg-white transition-colors flex items-center justify-center gap-2"
            >
              <Gift className="w-3.5 h-3.5" />Buy this gift · {fmt.format(totalPrice)}
            </button>
            <p className="text-[9px] text-zinc-700 text-center tracking-widest uppercase">Pay with M-Pesa, then share the link</p>
          </div>
        )}

        {/* Step: picker ─ choose extra items */}
        {step === "picker" && (
          <div className="px-5 pt-4 pb-5 space-y-3 overflow-y-auto flex-1 flex flex-col min-h-0">
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => { setStep("preview"); setPickerSearch(""); }}
                className="text-zinc-500 hover:text-zinc-200 transition-colors p-1 -ml-1"
                aria-label="Back to preview"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-400">Add to this gift</p>
            </div>

            {/* Search */}
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
              <input
                type="text"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder="Search products…"
                className="w-full bg-zinc-900/80 border border-zinc-800 pl-9 pr-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-[#D4AF37]/40 transition-colors"
              />
            </div>

            {/* Product list */}
            <ul className="space-y-2 overflow-y-auto flex-1 min-h-0 pr-1">
              {!allProducts ? (
                <li className="flex items-center justify-center py-8 text-zinc-600 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />Loading products…
                </li>
              ) : pickableProducts.length === 0 ? (
                <li className="text-center py-8 text-zinc-600 text-xs">
                  {pickerSearch.trim() ? "No matches" : "Nothing else to add"}
                </li>
              ) : (
                pickableProducts.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => handleAddExtra(p)}
                      className="w-full flex items-center gap-3 bg-zinc-900/40 border border-zinc-800 hover:border-[#D4AF37]/40 px-2.5 py-2 transition-colors text-left"
                    >
                      <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0">
                        {p.imageUrl
                          ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                          : <Gift className="w-4 h-4 text-zinc-700 m-auto mt-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-200 truncate">{p.name}</p>
                        <p className="text-[#D4AF37] text-[11px] mt-0.5">{fmt.format(Number(p.price))}</p>
                      </div>
                      <Plus className="w-4 h-4 text-zinc-500 shrink-0" />
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}

        {/* Step: form */}
        {step === "form" && (
          <div className="px-5 pt-4 pb-5 space-y-3 overflow-y-auto">
            <div>
              <label className="text-[9px] uppercase tracking-[0.2em] text-zinc-600 block mb-1.5">Recipient name</label>
              <input type="text" value={recipient} onChange={(e) => setRecipient(e.target.value)}
                placeholder="Who's the lucky one? (optional)"
                className="w-full bg-zinc-900/80 border border-zinc-800 px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-[#D4AF37]/40 transition-colors" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[0.2em] text-zinc-600 block mb-1.5">Your name</label>
              <input type="text" value={sender} onChange={(e) => setSender(e.target.value)}
                placeholder="So they know it's from you (optional)"
                className="w-full bg-zinc-900/80 border border-zinc-800 px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-[#D4AF37]/40 transition-colors" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[0.2em] text-zinc-600 block mb-1.5">Personal note</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="Add a heartfelt message… (optional)" rows={2}
                className="w-full bg-zinc-900/80 border border-zinc-800 px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-[#D4AF37]/40 transition-colors resize-none" />
            </div>
            <button onClick={handleContinue}
              className="w-full py-3.5 bg-[#D4AF37] text-black text-xs uppercase tracking-widest font-semibold hover:bg-white transition-colors flex items-center justify-center gap-2 mt-2">
              <Smartphone className="w-3.5 h-3.5" />Continue to pay {fmt.format(totalPrice)}
            </button>
            <p className="text-[9px] text-zinc-700 text-center tracking-widest uppercase">Pay with M-Pesa, then share the link</p>
          </div>
        )}

        {/* Step: phone (incl. failed retry) */}
        {(step === "phone" || step === "failed") && (
          <div className="px-5 pt-4 pb-5 space-y-4 overflow-y-auto">
            <div className="text-center">
              <p className="text-zinc-400 text-sm">You will receive an M-Pesa prompt to confirm</p>
              <p className="text-[#D4AF37] text-2xl font-light mt-1">{fmt.format(totalPrice)}</p>
            </div>
            {apiError && (
              <div className="flex items-start gap-2 bg-red-950/40 border border-red-900 px-4 py-3 text-red-400 text-xs">
                <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {apiError}
              </div>
            )}
            <div>
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-2">M-Pesa phone number</label>
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
                  onKeyDown={(e) => e.key === "Enter" && handlePay()}
                  placeholder="712345678"
                  className="flex-1 bg-transparent text-zinc-200 text-sm px-4 py-3 outline-none placeholder:text-zinc-700"
                />
              </div>
              {phoneError && <p className="text-red-400 text-xs mt-1">{phoneError}</p>}
            </div>
            <button onClick={handlePay} disabled={submitting}
              className="w-full py-4 bg-green-700 hover:bg-green-600 disabled:bg-green-900 text-white text-xs uppercase tracking-widest font-medium transition-colors flex items-center justify-center gap-2">
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" />Sending request…</>
                : <><Smartphone className="w-4 h-4" />Pay {fmt.format(totalPrice)} via M-Pesa</>}
            </button>
          </div>
        )}

        {/* Step: pending */}
        {step === "pending" && (
          <div className="px-5 py-8 text-center space-y-5">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full border-2 border-green-900" />
              <div className="absolute inset-0 rounded-full border-t-2 border-green-500 animate-spin" />
              <Smartphone className="absolute inset-0 m-auto w-6 h-6 text-green-500" />
            </div>
            <div>
              <h3 className="text-zinc-200 text-sm font-medium uppercase tracking-wide">Check your phone</h3>
              <p className="text-zinc-500 text-xs mt-2">
                An M-Pesa prompt was sent. Enter your PIN to complete payment of{" "}
                <span className="text-[#D4AF37]">{fmt.format(totalPrice)}</span>.
              </p>
            </div>
            <p className="text-zinc-700 text-[11px]">Checking automatically…</p>
          </div>
        )}

        {/* Step: success */}
        {step === "success" && (
          <div className="px-5 pt-4 pb-6 space-y-4 overflow-y-auto">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-green-500" />
              </div>
              <p className="text-[10px] uppercase tracking-widest text-green-500">Payment confirmed</p>
              <p className="text-sm text-zinc-300 font-light">
                Your gift is ready{recipient.trim() ? ` for ${recipient.trim()}` : ""}.
              </p>
              {mpesaRef && (
                <p className="text-zinc-600 text-[11px]">
                  M-Pesa ref: <span className="text-zinc-400 font-mono">{mpesaRef}</span>
                </p>
              )}
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 px-3 py-2.5 flex items-center gap-2">
              <Gift className="w-3.5 h-3.5 text-[#D4AF37]/70 shrink-0" />
              <p className="flex-1 text-[11px] text-zinc-400 truncate font-mono">{giftLink}</p>
              <button onClick={copyLink} className="text-zinc-500 hover:text-[#D4AF37] transition-colors shrink-0" aria-label="Copy gift link">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              <button onClick={sendViaWhatsApp}
                className="w-full py-3.5 bg-[#D4AF37] text-black text-xs uppercase tracking-widest font-semibold hover:bg-white transition-colors flex items-center justify-center gap-2">
                <MessageCircle className="w-3.5 h-3.5" />Share via WhatsApp
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={nativeShare}
                  className="py-3 border border-zinc-800 text-zinc-300 text-[11px] uppercase tracking-widest hover:border-[#D4AF37]/40 hover:text-white transition-colors flex items-center justify-center gap-2">
                  <Share2 className="w-3.5 h-3.5" />Share…
                </button>
                <button onClick={copyLink}
                  className="py-3 border border-zinc-800 text-zinc-300 text-[11px] uppercase tracking-widest hover:border-[#D4AF37]/40 hover:text-white transition-colors flex items-center justify-center gap-2">
                  <Copy className="w-3.5 h-3.5" />Copy link
                </button>
              </div>
              <button onClick={onClose}
                className="w-full py-2.5 text-zinc-500 text-[10px] uppercase tracking-widest hover:text-zinc-300 transition-colors">
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
