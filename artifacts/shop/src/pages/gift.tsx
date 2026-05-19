import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { useGetGift, useClaimGift, useGetSettings, getGetSettingsQueryKey, getGetGiftQueryKey } from "@workspace/api-client-react";
import { ShoppingBag, Gift, Check, Lock, RefreshCw } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";

// ── Bubble particle ──────────────────────────────────────────────────────────
interface Bubble {
  id: number; x: number; size: number; color: string; delay: number; duration: number; drift: number;
}
function makeBubbles(count: number): Bubble[] {
  const colors = ["#D4AF37","#fff8dc","#fffacd","#D4AF37cc","#f5e6a3","#ffffff","#D4AF3788","#e8c84a","#fff","#ffd700"];
  return Array.from({ length: count }, (_, i) => ({
    id: i, x: Math.random() * 100, size: 6 + Math.random() * 22,
    color: colors[Math.floor(Math.random() * colors.length)],
    delay: Math.random() * 0.6, duration: 1.8 + Math.random() * 1.6, drift: (Math.random() - 0.5) * 80,
  }));
}

// ── Gift box ─────────────────────────────────────────────────────────────────
function GiftBox({ opening }: { opening: boolean }) {
  return (
    <div className="relative select-none" style={{ width: 220, height: 240 }}>
      <div className="absolute left-0 right-0 z-20 transition-all"
        style={{
          top: opening ? "-160px" : 0, opacity: opening ? 0 : 1,
          transform: opening ? "translateY(-80px) rotate(-12deg) scale(1.08)" : "none",
          transition: opening ? "all 0.55s cubic-bezier(0.22,1,0.36,1)" : "none",
        }}>
        <div className="mx-auto relative overflow-hidden" style={{ width: 224, height: 52, background: "linear-gradient(135deg,#1a1400 0%,#0a0a0a 60%,#1c1400 100%)", border: "1.5px solid #D4AF37", boxShadow: "0 0 24px rgba(212,175,55,0.25), inset 0 1px 0 rgba(212,175,55,0.15)" }}>
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2" style={{ width: 28, background: "linear-gradient(90deg,#a07c18,#D4AF37,#f0cc55,#D4AF37,#a07c18)" }} />
          <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-white via-transparent to-transparent pointer-events-none" />
        </div>
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-end gap-0">
          <div style={{ width: 40, height: 32, borderRadius: "50% 50% 0 50%", border: "3px solid #D4AF37", background: "linear-gradient(135deg,#7a5c0a88,#D4AF3755)", marginRight: -10, transform: "rotate(-20deg)", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.4)" }} />
          <div style={{ width: 18, height: 18, borderRadius: "50%", background: "linear-gradient(135deg,#f0cc55,#D4AF37,#a07c18)", border: "2px solid #a07c18", zIndex: 2, boxShadow: "0 2px 8px rgba(212,175,55,0.5)" }} />
          <div style={{ width: 40, height: 32, borderRadius: "50% 50% 50% 0", border: "3px solid #D4AF37", background: "linear-gradient(135deg,#7a5c0a88,#D4AF3755)", marginLeft: -10, transform: "rotate(20deg)", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.4)" }} />
        </div>
        <div className="absolute -top-2 left-1/2 flex gap-5" style={{ transform: "translateX(-50%)" }}>
          <div style={{ width: 10, height: 14, background: "linear-gradient(180deg,#D4AF37,#a07c18)", transform: "rotate(-15deg)", borderRadius: "0 0 4px 4px" }} />
          <div style={{ width: 10, height: 14, background: "linear-gradient(180deg,#D4AF37,#a07c18)", transform: "rotate(15deg)", borderRadius: "0 0 4px 4px" }} />
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0" style={{ top: 36, background: "linear-gradient(160deg,#111000 0%,#0a0a0a 50%,#160f00 100%)", border: "1.5px solid #D4AF37", boxShadow: "0 8px 40px rgba(212,175,55,0.18), inset 0 1px 0 rgba(212,175,55,0.08)" }}>
        <div className="absolute inset-x-0 top-0 bottom-0 left-1/2 -translate-x-1/2" style={{ width: 28, background: "linear-gradient(90deg,#a07c18,#D4AF37,#f0cc55,#D4AF37,#a07c18)" }} />
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2" style={{ height: 28, background: "linear-gradient(180deg,#a07c18,#D4AF37,#f0cc55,#D4AF37,#a07c18)" }} />
        <div className="absolute inset-0 opacity-[0.06] bg-gradient-to-br from-white via-transparent to-transparent pointer-events-none" />
      </div>
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 80%, rgba(212,175,55,0.12) 0%, transparent 70%)" }} />
    </div>
  );
}

// ── Pending / not-paid state ─────────────────────────────────────────────────
function PendingGift({ recipientName, senderName, storeName }: { recipientName?: string | null; senderName?: string | null; storeName: string }) {
  return (
    <div className="flex flex-col items-center gap-8 text-center px-6">
      <div className="w-20 h-20 rounded-full border border-zinc-800 flex items-center justify-center">
        <Lock className="w-8 h-8 text-zinc-600" />
      </div>
      <div className="space-y-2">
        {recipientName && <p className="text-[11px] tracking-[0.3em] uppercase text-[#D4AF37]/60">For {recipientName}</p>}
        <h1 className="text-2xl font-light text-white tracking-wide">Gift not yet sent</h1>
        <p className="text-sm text-zinc-500 font-light leading-relaxed max-w-xs">
          {senderName ? `${senderName} is preparing your gift.` : "The sender is still preparing this gift."} Check back soon!
        </p>
      </div>
      <Link href="/" className="text-[10px] tracking-[0.3em] uppercase text-[#D4AF37]/40 hover:text-[#D4AF37]/70 transition-colors">
        Browse {storeName}
      </Link>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function GiftPage() {
  const { id: token } = useParams<{ id: string }>();
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const storeName = settings?.storeName ?? "Luxe Store";

  const { data: gift, isLoading, refetch } = useGetGift(token, {
    query: { queryKey: getGetGiftQueryKey(token), enabled: !!token, refetchInterval: false }
  });

  const claimMutation = useClaimGift();
  const { addItem, openCart } = useCart();
  const { toast } = useToast();

  const [phase, setPhase] = useState<"wrapped" | "opening" | "open">("wrapped");
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [addedToCart, setAddedToCart] = useState(false);
  const bubblesRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fmt = new Intl.NumberFormat("en-KE", { style: "currency", currency: settings?.currency ?? "KES", maximumFractionDigits: 0 });

  useEffect(() => () => { if (bubblesRef.current) clearTimeout(bubblesRef.current); }, []);

  const handleOpen = () => {
    if (phase !== "wrapped" || !gift || gift.status === "pending") return;
    setPhase("opening");
    setBubbles(makeBubbles(48));
    bubblesRef.current = setTimeout(() => {
      setPhase("open");
      // Mark as claimed
      if (gift.status === "paid") {
        claimMutation.mutate({ token });
      }
    }, 900);
  };

  const handleAddToCart = () => {
    if (!gift) return;
    addItem({
      id: gift.productId,
      name: gift.productName,
      price: gift.productPrice,
      imageUrl: gift.productImageUrl ?? null,
      description: null,
      originalPrice: null,
      categoryId: null,
      categoryName: null,
      inStock: true,
      isActive: true,
      isDropship: false,
      isFeatured: false,
      availabilityTag: null,
      stockQuantity: 1,
      variants: [],
      createdAt: null,
    }, { quantity: 1 });
    setAddedToCart(true);
    openCart();
    toast({ title: "Added to your bag!" });
  };

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] flex flex-col overflow-hidden relative">
      {/* Stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 60 }, (_, i) => (
          <div key={i} className="absolute rounded-full bg-white"
            style={{ width: Math.random() * 2 + 0.5, height: Math.random() * 2 + 0.5, left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, opacity: Math.random() * 0.4 + 0.05, animation: `twinkle ${2 + Math.random() * 3}s ${Math.random() * 4}s ease-in-out infinite alternate` }} />
        ))}
      </div>

      {/* Brand strip */}
      <div className="relative z-10 flex justify-center pt-6 pb-2">
        <Link href="/" className="flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
          <span className="text-[10px] tracking-[0.35em] uppercase text-[#D4AF37]">{storeName}</span>
          <div className="w-8 h-px bg-[#D4AF37]/40" />
        </Link>
      </div>

      {/* Bubbles */}
      {(phase === "opening" || phase === "open") && (
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
          {bubbles.map(b => (
            <div key={b.id} className="absolute rounded-full"
              style={{ left: `${b.x}%`, bottom: "45%", width: b.size, height: b.size, background: `radial-gradient(circle at 30% 30%, white, ${b.color})`, opacity: 0.88, animation: `bubbleRise ${b.duration}s ${b.delay}s cubic-bezier(0.2,0.8,0.4,1) forwards`, transform: `translateX(${b.drift}px)`, boxShadow: `0 0 ${b.size * 0.6}px ${b.color}88` }} />
          ))}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pb-10">
        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full border border-zinc-800 animate-pulse bg-zinc-900" />
            <div className="w-40 h-3 rounded bg-zinc-900 animate-pulse" />
          </div>
        ) : !gift ? (
          <div className="text-center space-y-3">
            <p className="text-zinc-500 text-sm">This gift link is invalid or has expired.</p>
            <Link href="/" className="text-[#D4AF37]/60 text-xs tracking-widest uppercase hover:text-[#D4AF37] transition-colors">Browse Store</Link>
          </div>
        ) : gift.status === "pending" ? (
          <PendingGift recipientName={gift.recipientName} senderName={gift.senderName} storeName={storeName} />
        ) : phase !== "open" ? (
          /* ── WRAPPED ── */
          <div className="flex flex-col items-center gap-8">
            <div className="text-center space-y-2">
              {gift.recipientName ? (
                <>
                  <p className="text-[11px] tracking-[0.3em] uppercase text-[#D4AF37]/60">A gift for</p>
                  <h1 className="text-3xl font-light text-white tracking-wide">{gift.recipientName}</h1>
                </>
              ) : (
                <h1 className="text-2xl font-light text-white tracking-wide">A gift is waiting for you</h1>
              )}
              {gift.senderName && (
                <p className="text-[10px] tracking-widest uppercase text-zinc-600">from {gift.senderName}</p>
              )}
              <div className="flex items-center justify-center gap-3 mt-1">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#D4AF37]/40" />
                <Gift className="w-3 h-3 text-[#D4AF37]/50" />
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#D4AF37]/40" />
              </div>
            </div>

            <button onClick={handleOpen} className="group relative flex flex-col items-center focus:outline-none" aria-label="Open your gift">
              <GiftBox opening={phase === "opening"} />
              <div className="absolute inset-0 rounded pointer-events-none" style={{ animation: "pulseRing 2.2s ease-in-out infinite" }} />
            </button>

            <div className="flex flex-col items-center gap-2" style={{ animation: "fadeFloat 2.5s ease-in-out infinite" }}>
              <div className="w-5 h-5 border border-[#D4AF37]/30 rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]/70" />
              </div>
              <p className="text-[11px] tracking-[0.3em] uppercase text-[#D4AF37]/50">
                {phase === "opening" ? "Opening…" : "Tap the gift to open"}
              </p>
            </div>

            {gift.note && (
              <div className="border border-[#D4AF37]/15 bg-[#D4AF37]/5 px-6 py-4 max-w-xs text-center">
                <p className="text-[10px] tracking-widest uppercase text-[#D4AF37]/40 mb-2">A personal note</p>
                <p className="text-zinc-300 text-sm font-light italic leading-relaxed">"{gift.note}"</p>
              </div>
            )}
          </div>
        ) : (
          /* ── REVEALED ── */
          <div className="flex flex-col items-center gap-7 w-full max-w-sm" style={{ animation: "revealIn 0.6s cubic-bezier(0.16,1,0.3,1) forwards" }}>
            <div className="text-center space-y-1">
              <p className="text-[10px] tracking-[0.35em] uppercase text-[#D4AF37]/60">🎁 Your gift is revealed</p>
              {gift.recipientName && <p className="text-lg font-light text-white">Enjoy, {gift.recipientName}!</p>}
            </div>

            {/* Product card */}
            <div className="w-full border border-[#D4AF37]/25 bg-zinc-950 overflow-hidden shadow-[0_0_60px_rgba(212,175,55,0.1)]">
              {gift.productImageUrl && (
                <div className="aspect-square overflow-hidden">
                  <img src={gift.productImageUrl} alt={gift.productName} className="w-full h-full object-cover" style={{ animation: "zoomIn 0.8s cubic-bezier(0.16,1,0.3,1) forwards" }} />
                </div>
              )}
              <div className="p-5 space-y-3">
                <h2 className="text-lg font-light text-white uppercase tracking-wide">{gift.productName}</h2>
                <p className="text-[#D4AF37] text-xl font-light">{fmt.format(gift.productPrice)}</p>
              </div>
            </div>

            {/* Paid badge */}
            <div className="flex items-center gap-2 border border-green-800/40 bg-green-950/30 px-4 py-2.5 w-full">
              <Check className="w-4 h-4 text-green-400 shrink-0" />
              <div>
                <p className="text-xs font-medium text-green-300">This gift has been paid for</p>
                <p className="text-[10px] text-green-700">
                  {gift.paymentMethod === "mpesa" ? "Paid via M-Pesa" : "Paid via WhatsApp checkout"}
                  {gift.senderName ? ` · From ${gift.senderName}` : ""}
                </p>
              </div>
            </div>

            {/* Personal note */}
            {gift.note && (
              <div className="w-full border border-[#D4AF37]/15 bg-[#D4AF37]/5 px-5 py-4">
                <p className="text-[9px] tracking-[0.3em] uppercase text-[#D4AF37]/40 mb-2">Message for you</p>
                <p className="text-zinc-300 text-sm font-light italic leading-relaxed">"{gift.note}"</p>
              </div>
            )}

            {/* CTA */}
            <div className="w-full flex flex-col gap-3">
              <button onClick={handleAddToCart} disabled={addedToCart}
                className="w-full py-4 flex items-center justify-center gap-2 text-xs uppercase tracking-widest font-semibold transition-all"
                style={{ background: addedToCart ? "transparent" : "#D4AF37", color: addedToCart ? "#D4AF37" : "#000", border: addedToCart ? "1px solid #D4AF37" : "none" }}>
                {addedToCart ? <><Check className="w-3.5 h-3.5" />Added to bag</> : <><ShoppingBag className="w-3.5 h-3.5" />Add to bag & checkout</>}
              </button>
              <Link href="/" className="w-full py-3 border border-zinc-800 text-zinc-600 text-xs uppercase tracking-widest text-center hover:border-[#D4AF37]/30 hover:text-zinc-400 transition-colors">
                Browse the store
              </Link>
            </div>
          </div>
        )}

        {/* Refresh for pending */}
        {gift?.status === "pending" && (
          <button onClick={() => refetch()} className="mt-8 flex items-center gap-2 text-[10px] uppercase tracking-widest text-zinc-700 hover:text-zinc-400 transition-colors">
            <RefreshCw className="w-3 h-3" />
            Check again
          </button>
        )}
      </div>

      <style>{`
        @keyframes twinkle { from { opacity: 0.05; } to { opacity: 0.45; } }
        @keyframes fadeFloat { 0%,100% { transform: translateY(0); opacity: 0.6; } 50% { transform: translateY(-6px); opacity: 1; } }
        @keyframes pulseRing { 0%,100% { box-shadow: 0 0 0 0 rgba(212,175,55,0); } 50% { box-shadow: 0 0 0 18px rgba(212,175,55,0.07); } }
        @keyframes bubbleRise { 0% { transform: translateY(0) translateX(0) scale(1); opacity: 0.9; } 60% { opacity: 0.85; } 100% { transform: translateY(-85vh) translateX(var(--drift,0px)) scale(0.3); opacity: 0; } }
        @keyframes revealIn { from { opacity: 0; transform: translateY(28px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes zoomIn { from { transform: scale(1.08); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}
