import { useState, useRef, useEffect, useMemo } from "react";
import { Gift, X, Send, Loader2, Heart, Star, Cake, Sparkles, Plus, ShoppingBag, Minus, Check } from "lucide-react";
import { Link } from "wouter";
import { registerGiftFinder } from "@/lib/gift-finder-trigger";
import {
  useListProducts,
  getListProductsQueryKey,
  useListHampers,
  getListHampersQueryKey,
  useGetSettings,
  getGetSettingsQueryKey,
  type Product,
  type Hamper,
} from "@workspace/api-client-react";
import { useCart, type HamperLineInput } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";
import { HamperCover } from "@/components/HamperCover";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ParsedReply {
  text: string;
  productIds: number[];
  hamperIds: number[];
}

// Strip "(ID:n)" / "(HAMPER:n)" markers from the assistant text and collect
// the referenced ids so we can render rich follow-up cards below the bubble.
function parseAssistantMessage(raw: string): ParsedReply {
  const productIds: number[] = [];
  const hamperIds: number[] = [];
  const text = raw.replace(/\s*\((ID|HAMPER):(\d+)\)/g, (_m, kind: string, num: string) => {
    const n = parseInt(num, 10);
    if (kind === "ID" && !productIds.includes(n)) productIds.push(n);
    if (kind === "HAMPER" && !hamperIds.includes(n)) hamperIds.push(n);
    return "";
  }).replace(/[ \t]{2,}/g, " ").trim();
  return { text, productIds, hamperIds };
}

const OCCASIONS = [
  { label: "Birthday", icon: <Cake className="w-3 h-3" /> },
  { label: "Anniversary", icon: <Heart className="w-3 h-3" /> },
  { label: "Just Because", icon: <Star className="w-3 h-3" /> },
  { label: "Thank You", icon: <Sparkles className="w-3 h-3" /> },
];

const RELATIONSHIPS = ["My Partner", "Mum", "Dad", "Best Friend", "Sister", "Brother", "Colleague"];
const BUDGETS = ["Under KSh 3K", "KSh 3K–8K", "KSh 8K–20K", "No limit"];

export function GiftFinder() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"intro" | "chat">("intro");
  const [occasion, setOccasion] = useState<string | null>(null);
  const [relation, setRelation] = useState<string | null>(null);
  const [budget, setBudget] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [buildMode, setBuildMode] = useState(false);
  const [customHamper, setCustomHamper] = useState<{ productId: number; quantity: number }[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { addHamper, addItem, openCart } = useCart();
  const { toast } = useToast();

  const { data: products } = useListProducts(undefined, {
    query: { queryKey: getListProductsQueryKey(), enabled: open },
  });
  const { data: hampers } = useListHampers({
    query: { queryKey: getListHampersQueryKey(), enabled: open },
  });
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const currencySymbol = settings?.currencySymbol || "KSh";

  const productById = useMemo(() => {
    const m = new Map<number, Product>();
    (products ?? []).forEach((p) => m.set(p.id, p));
    return m;
  }, [products]);
  const hamperById = useMemo(() => {
    const m = new Map<number, Hamper>();
    (hampers ?? []).forEach((h) => m.set(h.id, h));
    return m;
  }, [hampers]);

  const fmt = (n: number) => `${currencySymbol} ${n.toFixed(0)}`;

  useEffect(() => {
    registerGiftFinder(() => setOpen(true));
    return () => registerGiftFinder(() => {});
  }, []);

  useEffect(() => {
    if (!open) {
      setStep("intro");
      setOccasion(null);
      setRelation(null);
      setBudget(null);
      setMessages([]);
      setInput("");
      setBuildMode(false);
      setCustomHamper([]);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, customHamper]);

  const close = () => setOpen(false);

  const startChat = () => {
    const parts: string[] = [];
    if (occasion) parts.push(`It's a ${occasion}`);
    if (relation) parts.push(`for ${relation}`);
    if (budget) parts.push(`with a budget of ${budget}`);
    const prompt = parts.length
      ? parts.join(", ") + ". What would make the perfect surprise?"
      : "Help me find a perfect surprise gift.";
    const welcome = `Perfect. I'll find something truly special${relation ? ` for ${relation}` : ""}. Tell me a little about them — their style, hobbies, or what they love — and I'll curate the ideal surprise from our collection. I can suggest a ready-made hamper, or help you build your own.`;
    setMessages([
      { role: "user", content: prompt },
      { role: "assistant", content: welcome },
    ]);
    setStep("chat");
    if (window.matchMedia("(pointer: fine)").matches) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      // Treat any non-OK response as a real failure so the user sees an
      // honest error rather than the "couldn't find a match" copy that's
      // meant for an empty-but-valid AI reply.
      if (!res.ok) {
        setMessages([...newMessages, { role: "assistant", content: "Something went wrong on my end. Please try again in a moment." }]);
        return;
      }
      // The server always returns JSON on 2xx, but guard the parse anyway
      // so a proxy/HTML response can't crash the chat.
      let reply = "";
      try {
        const data = await res.json();
        reply = typeof data?.reply === "string" ? data.reply.trim() : "";
      } catch {
        reply = "";
      }
      setMessages([
        ...newMessages,
        { role: "assistant", content: reply || "I couldn't find a match — try describing them differently." },
      ]);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  // ── Custom hamper helpers ──
  const addToCustomHamper = (productId: number) => {
    setCustomHamper((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (existing) return prev.map((i) => (i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { productId, quantity: 1 }];
    });
    if (!buildMode) setBuildMode(true);
  };
  const incCustom = (productId: number) => addToCustomHamper(productId);
  const decCustom = (productId: number) => {
    setCustomHamper((prev) =>
      prev.flatMap((i) => (i.productId === productId ? (i.quantity > 1 ? [{ ...i, quantity: i.quantity - 1 }] : []) : [i])),
    );
  };

  const customHamperTotal = customHamper.reduce((s, i) => {
    const p = productById.get(i.productId);
    return s + (p ? p.price * i.quantity : 0);
  }, 0);

  const checkoutCustomHamper = () => {
    if (customHamper.length === 0) return;
    const lines: HamperLineInput[] = customHamper
      .map((i) => ({ product: productById.get(i.productId), quantity: i.quantity }))
      .filter((l): l is HamperLineInput => Boolean(l.product));
    if (lines.length === 0) return;
    const name = `Custom Hamper${relation ? ` for ${relation}` : ""}`;
    addHamper(lines, { name });
    toast({ title: "Hamper added to bag", description: `${lines.length} item${lines.length === 1 ? "" : "s"} bundled as one gift.` });
    setCustomHamper([]);
    setBuildMode(false);
    close();
    openCart();
  };

  const addCuratedHamperToCart = (h: Hamper) => {
    // Refuse partial bundles — charging the curated price for a missing
    // component would be a pricing bug. Require every product to resolve.
    const resolved = h.items.map((i) => ({ product: productById.get(i.productId), quantity: i.quantity }));
    if (resolved.some((l) => !l.product)) {
      toast({ variant: "destructive", title: "Some items in this hamper are unavailable right now." });
      return;
    }
    const lines: HamperLineInput[] = resolved.filter((l): l is HamperLineInput => Boolean(l.product));
    if (!h.inStock) {
      toast({ variant: "destructive", title: "This hamper is currently out of stock." });
      return;
    }
    addHamper(lines, { name: h.name, hamperId: h.id, totalPrice: h.price, imageUrl: h.imageUrl });
    toast({ title: `${h.name} added to bag` });
    close();
    openCart();
  };

  return (
    <>
      {open && (
        <div
          className="gf-backdrop fixed inset-0 z-[300] flex items-end sm:items-center justify-center sm:p-6"
          style={{ background: "rgba(0,0,0,0.92)" }}
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <div
            className="gf-panel relative flex flex-col w-full sm:w-[520px] sm:max-w-[90vw] bg-[#0a0a0a] border border-[#D4AF37]/20 shadow-[0_0_100px_rgba(212,175,55,0.1),0_32px_64px_rgba(0,0,0,0.9)]"
            style={{ height: step === "intro" ? "auto" : "86dvh", maxHeight: step === "intro" ? "92dvh" : undefined }}
          >
            <div className="h-px w-full bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/40 flex items-center justify-center">
                  <Gift className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <div>
                  <p className="text-white text-sm font-light tracking-widest">Surprise Concierge</p>
                  <p className="text-[10px] text-[#D4AF37]/60 tracking-[0.2em] uppercase -mt-0.5">Personal gift stylist</p>
                </div>
              </div>
              <button onClick={close} className="w-8 h-8 flex items-center justify-center text-zinc-600 hover:text-[#D4AF37] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="h-px bg-[#D4AF37]/10 mx-6 shrink-0" />

            {/* INTRO STEP */}
            {step === "intro" && (
              <div className="flex flex-col overflow-y-auto gf-scrollbar">
                <div className="px-6 pt-6 pb-4 text-center">
                  <p className="text-2xl text-white font-light tracking-wide leading-snug">
                    Who are you<br />
                    <span className="text-[#D4AF37]">surprising?</span>
                  </p>
                  <p className="text-xs text-zinc-500 tracking-widest uppercase mt-2">Tell me a little — I'll do the rest</p>
                </div>

                <div className="px-6 pb-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-3">Occasion</p>
                  <div className="grid grid-cols-2 gap-2">
                    {OCCASIONS.map(({ label, icon }) => (
                      <button
                        key={label}
                        onClick={() => setOccasion(occasion === label ? null : label)}
                        className={`gf-chip flex items-center gap-2 px-4 py-2.5 border text-xs tracking-widest font-light text-zinc-400 border-zinc-800 ${occasion === label ? "active" : ""}`}
                      >
                        <span className={occasion === label ? "text-[#D4AF37]" : "text-zinc-600"}>{icon}</span>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="px-6 pb-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-3">For</p>
                  <div className="flex flex-wrap gap-2">
                    {RELATIONSHIPS.map((r) => (
                      <button
                        key={r}
                        onClick={() => setRelation(relation === r ? null : r)}
                        className={`gf-chip px-3.5 py-1.5 border text-[11px] tracking-wider font-light text-zinc-400 border-zinc-800 ${relation === r ? "active" : ""}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="px-6 pb-6">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-3">Budget</p>
                  <div className="flex flex-wrap gap-2">
                    {BUDGETS.map((b) => (
                      <button
                        key={b}
                        onClick={() => setBudget(budget === b ? null : b)}
                        className={`gf-chip px-3.5 py-1.5 border text-[11px] tracking-wider font-light text-zinc-400 border-zinc-800 ${budget === b ? "active" : ""}`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-[#D4AF37]/10 mx-6 shrink-0" />

                <div className="px-6 py-5">
                  <button
                    onClick={startChat}
                    className="w-full py-4 bg-[#D4AF37] text-black text-xs uppercase tracking-[0.25em] font-semibold hover:bg-white transition-colors flex items-center justify-center gap-2"
                  >
                    <Gift className="w-3.5 h-3.5" />
                    Find the Perfect Surprise
                  </button>
                  <button
                    onClick={() => { setStep("chat"); setMessages([{ role: "assistant", content: "Welcome. Tell me who you're surprising — their personality, interests, and your budget. I'll find something they'll absolutely love, or help you build a custom hamper." }]); }}
                    className="w-full mt-2 py-2.5 text-[10px] uppercase tracking-widest text-zinc-400 hover:text-[#D4AF37] border border-zinc-800 hover:border-[#D4AF37]/30 transition-colors"
                  >
                    Skip — just chat
                  </button>
                </div>
              </div>
            )}

            {/* CHAT STEP */}
            {step === "chat" && (
              <>
                {/* Build-mode toggle bar */}
                <div className="px-6 py-3 flex items-center justify-between shrink-0 border-b border-zinc-900">
                  <button
                    onClick={() => setBuildMode((v) => !v)}
                    className={`flex items-center gap-2 px-3 py-1.5 border text-[10px] uppercase tracking-widest transition-colors ${
                      buildMode
                        ? "border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/5"
                        : "border-zinc-800 text-zinc-500 hover:text-[#D4AF37] hover:border-[#D4AF37]/40"
                    }`}
                  >
                    <Gift className="w-3 h-3" />
                    {buildMode ? "Building Hamper" : "Build a Hamper"}
                  </button>
                  {buildMode && customHamper.length > 0 && (
                    <span className="text-[10px] uppercase tracking-widest text-[#D4AF37]/80">
                      {customHamper.reduce((s, i) => s + i.quantity, 0)} item{customHamper.length === 1 ? "" : "s"} · {fmt(customHamperTotal)}
                    </span>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto gf-scrollbar px-6 py-5 space-y-5">
                  {messages.map((msg, i) => {
                    if (msg.role === "user") {
                      return (
                        <div key={i} className="flex justify-end">
                          <div className="max-w-[78%] px-4 py-3 text-sm leading-relaxed font-light bg-[#D4AF37] text-black tracking-wide">
                            {msg.content}
                          </div>
                        </div>
                      );
                    }
                    const parsed = parseAssistantMessage(msg.content);
                    const referencedHampers = parsed.hamperIds.map((id) => hamperById.get(id)).filter((h): h is Hamper => Boolean(h));
                    // Drop product ids the AI hallucinated (not in our active
                    // catalog) so we never render a chip that links to a 404
                    // product page.
                    const referencedProductIds = parsed.productIds.filter((id) => productById.has(id));
                    return (
                      <div key={i} className="flex flex-col gap-3">
                        <div className="flex justify-start">
                          <div className="w-6 h-6 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center shrink-0 mr-2.5 mt-0.5">
                            <Gift className="w-3 h-3 text-[#D4AF37]" />
                          </div>
                          <div className="max-w-[78%] px-4 py-3 text-sm leading-relaxed font-light bg-zinc-900/80 text-zinc-300 border border-zinc-800/60">
                            {parsed.text || (referencedHampers.length === 0 && referencedProductIds.length === 0
                              ? "I couldn't pin down a match — tell me a little more about them and I'll try again."
                              : "Here's what I'd suggest:")}
                          </div>
                        </div>

                        {/* Curated hamper cards */}
                        {referencedHampers.map((h) => (
                          <div key={`h-${h.id}`} className="ml-8 border border-[#D4AF37]/30 bg-zinc-950/60">
                            <div className="flex">
                              <HamperCover
                                imageUrl={h.imageUrl}
                                fallbackImages={h.items.map((it) => productById.get(it.productId)?.imageUrl)}
                                alt={h.name}
                                className="w-20 h-20 bg-zinc-900 shrink-0"
                                iconClassName="w-6 h-6"
                              />
                              <div className="flex-1 p-3 min-w-0">
                                <p className="text-[10px] uppercase tracking-[0.2em] text-[#D4AF37]/80">Curated Hamper</p>
                                <p className="text-sm text-white font-light tracking-wide truncate">{h.name}</p>
                                <p className="text-[11px] text-zinc-500 truncate">
                                  {h.items.map((it) => {
                                    const p = productById.get(it.productId);
                                    return p ? `${it.quantity}× ${p.name}` : "";
                                  }).filter(Boolean).join(" · ")}
                                </p>
                              </div>
                            </div>
                            <div className="border-t border-zinc-900 px-3 py-2.5 flex items-center justify-between">
                              <span className="text-[#D4AF37] text-sm font-medium">{fmt(h.price)}</span>
                              <button
                                onClick={() => addCuratedHamperToCart(h)}
                                disabled={!h.inStock}
                                className="px-4 py-1.5 bg-[#D4AF37] text-black text-[10px] uppercase tracking-widest font-semibold hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                              >
                                <ShoppingBag className="w-3 h-3" />
                                {h.inStock ? "Add Hamper to Bag" : "Out of stock"}
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Product chips */}
                        {referencedProductIds.length > 0 && (
                          <div className="ml-8 flex flex-wrap gap-2">
                            {referencedProductIds.map((id) => {
                              const p = productById.get(id)!;
                              const inCustom = customHamper.find((c) => c.productId === id);
                              return (
                                <div key={`p-${id}`} className="flex items-center border border-zinc-800 bg-zinc-950/60">
                                  <Link
                                    href={`/product/${id}`}
                                    onClick={close}
                                    className="px-3 py-1.5 text-[11px] uppercase tracking-widest text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors"
                                  >
                                    {p.name}
                                  </Link>
                                  <button
                                    onClick={() => addToCustomHamper(id)}
                                    title="Add to hamper"
                                    className="px-2.5 py-1.5 border-l border-zinc-800 text-zinc-500 hover:text-[#D4AF37] hover:bg-[#D4AF37]/5 transition-colors flex items-center gap-1"
                                  >
                                    {inCustom ? <Check className="w-3 h-3 text-[#D4AF37]" /> : <Plus className="w-3 h-3" />}
                                    <span className="text-[9px] uppercase tracking-widest">{inCustom ? `In hamper ×${inCustom.quantity}` : "Hamper"}</span>
                                  </button>
                                  {!buildMode && (
                                    <button
                                      onClick={() => { addItem(p); toast({ title: `${p.name} added to bag` }); }}
                                      title="Add to bag"
                                      className="px-2.5 py-1.5 border-l border-zinc-800 text-zinc-500 hover:text-[#D4AF37] hover:bg-[#D4AF37]/5 transition-colors"
                                    >
                                      <ShoppingBag className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {loading && (
                    <div className="flex justify-start items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center shrink-0">
                        <Gift className="w-3 h-3 text-[#D4AF37]" />
                      </div>
                      <div className="bg-zinc-900/80 border border-zinc-800/60 px-5 py-3 flex items-center gap-2">
                        <span className="flex gap-1">
                          {[0, 1, 2].map((n) => (
                            <span key={n} className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]/50" style={{ animation: `pulse 1.2s ease-in-out ${n * 0.2}s infinite` }} />
                          ))}
                        </span>
                        <span className="text-xs text-zinc-500 tracking-wider">Wrapping something special…</span>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Custom hamper tray */}
                {buildMode && customHamper.length > 0 && (
                  <div className="shrink-0 border-t border-[#D4AF37]/30 bg-zinc-950/90">
                    <div className="px-6 pt-3 pb-2 flex items-center justify-between">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[#D4AF37]">Your Hamper</p>
                      <button
                        onClick={() => setCustomHamper([])}
                        className="text-[9px] uppercase tracking-widest text-zinc-600 hover:text-red-400"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="px-6 pb-2 max-h-32 overflow-y-auto gf-scrollbar space-y-1.5">
                      {customHamper.map((i) => {
                        const p = productById.get(i.productId);
                        if (!p) return null;
                        return (
                          <div key={i.productId} className="flex items-center gap-2 text-xs">
                            <div className="w-7 h-7 bg-zinc-900 shrink-0 overflow-hidden">
                              {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />}
                            </div>
                            <span className="flex-1 truncate text-zinc-300">{p.name}</span>
                            <div className="flex items-center border border-zinc-800">
                              <button onClick={() => decCustom(i.productId)} className="px-1.5 py-0.5 text-zinc-500 hover:text-[#D4AF37]">
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                              <span className="text-zinc-300 text-[10px] w-4 text-center">{i.quantity}</span>
                              <button onClick={() => incCustom(i.productId)} className="px-1.5 py-0.5 text-zinc-500 hover:text-[#D4AF37]">
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                            </div>
                            <span className="text-[#D4AF37] text-[11px] w-16 text-right">{fmt(p.price * i.quantity)}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="px-6 pt-2 pb-3 border-t border-zinc-900 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-zinc-600">Total</p>
                        <p className="text-base text-[#D4AF37] font-light">{fmt(customHamperTotal)}</p>
                      </div>
                      <button
                        onClick={checkoutCustomHamper}
                        className="flex-1 py-3 bg-[#D4AF37] text-black text-[11px] uppercase tracking-[0.2em] font-semibold hover:bg-white transition-colors flex items-center justify-center gap-2"
                      >
                        <Gift className="w-3.5 h-3.5" />
                        Add Hamper to Bag
                      </button>
                    </div>
                  </div>
                )}

                {/* Input */}
                <div className="px-6 pb-6 pt-4 shrink-0">
                  <div className="h-px bg-[#D4AF37]/10 mb-4" />
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && send()}
                      placeholder={buildMode ? "Ask for more ideas to add to the hamper…" : "Describe them — style, hobbies, what they love…"}
                      className="flex-1 bg-zinc-900/60 border border-zinc-800 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-[#D4AF37]/40 transition-colors tracking-wide"
                    />
                    <button
                      onClick={send}
                      disabled={!input.trim() || loading}
                      className="w-12 flex items-center justify-center bg-[#D4AF37] text-black hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-700 tracking-widest uppercase text-center mt-3">
                    Your personal Luxe gift stylist
                  </p>
                </div>
              </>
            )}

            <div className="h-px w-full bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent shrink-0" />
          </div>
        </div>
      )}
    </>
  );
}
