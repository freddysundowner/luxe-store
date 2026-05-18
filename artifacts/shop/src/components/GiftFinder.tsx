import { useState, useRef, useEffect } from "react";
import { Gift, X, Send, Loader2, Heart, Star, Cake, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { registerGiftFinder } from "@/lib/gift-finder-trigger";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function parseProductLinks(text: string) {
  const parts: (string | { id: number; text: string })[] = [];
  const regex = /\(ID:(\d+)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push({ id: parseInt(match[1]), text: "View product →" });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

const OCCASIONS = [
  { label: "Birthday", icon: <Cake className="w-3 h-3" /> },
  { label: "Anniversary", icon: <Heart className="w-3 h-3" /> },
  { label: "Just Because", icon: <Star className="w-3 h-3" /> },
  { label: "Thank You", icon: <Sparkles className="w-3 h-3" /> },
];

const RELATIONSHIPS = ["My Partner", "Mum", "Dad", "Best Friend", "Sister", "Brother", "Colleague"];

const BUDGETS = ["Under $30", "$30–$75", "$75–$150", "No limit"];

export function GiftFinder() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"intro" | "chat">("intro");
  const [occasion, setOccasion] = useState<string | null>(null);
  const [relation, setRelation] = useState<string | null>(null);
  const [budget, setBudget] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const close = () => setOpen(false);

  const startChat = () => {
    const parts: string[] = [];
    if (occasion) parts.push(`It's a ${occasion}`);
    if (relation) parts.push(`for ${relation}`);
    if (budget) parts.push(`with a budget of ${budget}`);
    const prompt = parts.length
      ? parts.join(", ") + ". What would make the perfect surprise?"
      : "Help me find a perfect surprise gift.";
    const welcome = `Perfect. I'll find something truly special${relation ? ` for ${relation}` : ""}. Tell me a little about them — their style, hobbies, or what they love — and I'll curate the ideal surprise from our collection.`;
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
      const data = await res.json();
      setMessages([...newMessages, { role: "assistant", content: data.reply || "I couldn't find a match — try describing them differently." }]);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes gf-backdrop-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes gf-panel-in {
          from { opacity: 0; transform: translateY(40px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes gf-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        .gf-backdrop { animation: gf-backdrop-in 0.25s ease forwards; }
        .gf-panel    { animation: gf-panel-in 0.35s cubic-bezier(0.16,1,0.3,1) forwards; }
        .gf-float    { animation: gf-float 3s ease-in-out infinite; }
        .gf-scrollbar::-webkit-scrollbar { width: 3px; }
        .gf-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .gf-scrollbar::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.2); border-radius: 999px; }
        .gf-chip {
          transition: all 0.15s ease;
          cursor: pointer;
        }
        .gf-chip:hover { border-color: rgba(212,175,55,0.6); color: #D4AF37; }
        .gf-chip.active {
          background: rgba(212,175,55,0.12);
          border-color: #D4AF37;
          color: #D4AF37;
        }
      `}</style>

      {open && (
        <div
          className="gf-backdrop fixed inset-0 z-[300] flex items-end sm:items-center justify-center sm:p-6"
          style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(8px)" }}
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <div className="gf-panel relative flex flex-col w-full sm:w-[480px] sm:max-w-[90vw] bg-[#0a0a0a] border border-[#D4AF37]/20 shadow-[0_0_100px_rgba(212,175,55,0.1),0_32px_64px_rgba(0,0,0,0.9)]"
            style={{ height: step === "intro" ? "auto" : "82dvh", maxHeight: step === "intro" ? "92dvh" : undefined }}
          >
            {/* Gold top bar */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="gf-float w-9 h-9 rounded-full bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 border border-[#D4AF37]/40 flex items-center justify-center">
                  <Gift className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <div>
                  <p className="text-white text-sm font-light tracking-widest">Surprise Concierge</p>
                  <p className="text-[10px] text-[#D4AF37]/60 tracking-[0.2em] uppercase -mt-0.5">Personal gift stylist</p>
                </div>
              </div>
              <button
                onClick={close}
                className="w-8 h-8 flex items-center justify-center text-zinc-600 hover:text-[#D4AF37] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="h-px bg-[#D4AF37]/10 mx-6 shrink-0" />

            {/* INTRO STEP */}
            {step === "intro" && (
              <div className="flex flex-col overflow-y-auto gf-scrollbar">
                {/* Hero */}
                <div className="px-6 pt-6 pb-4 text-center">
                  <p className="text-2xl text-white font-light tracking-wide leading-snug">
                    Who are you<br />
                    <span className="text-[#D4AF37]">surprising?</span>
                  </p>
                  <p className="text-xs text-zinc-500 tracking-widest uppercase mt-2">Tell me a little — I'll do the rest</p>
                </div>

                {/* Occasion */}
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

                {/* Relationship */}
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

                {/* Budget */}
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

                {/* CTA */}
                <div className="px-6 py-5">
                  <button
                    onClick={startChat}
                    className="w-full py-4 bg-[#D4AF37] text-black text-xs uppercase tracking-[0.25em] font-semibold hover:bg-white transition-colors flex items-center justify-center gap-2"
                  >
                    <Gift className="w-3.5 h-3.5" />
                    Find the Perfect Surprise
                  </button>
                  <button
                    onClick={() => { setStep("chat"); setMessages([{ role: "assistant", content: "Welcome. Tell me who you're surprising — their personality, interests, and your budget. I'll find something they'll absolutely love." }]); }}
                    className="w-full mt-2 py-2.5 text-[10px] uppercase tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    Skip — just chat
                  </button>
                </div>
              </div>
            )}

            {/* CHAT STEP */}
            {step === "chat" && (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto gf-scrollbar px-6 py-5 space-y-5">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      {msg.role === "assistant" && (
                        <div className="w-6 h-6 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center shrink-0 mr-2.5 mt-0.5">
                          <Gift className="w-3 h-3 text-[#D4AF37]" />
                        </div>
                      )}
                      <div className={`max-w-[78%] px-4 py-3 text-sm leading-relaxed font-light ${
                        msg.role === "user"
                          ? "bg-[#D4AF37] text-black tracking-wide"
                          : "bg-zinc-900/80 text-zinc-300 border border-zinc-800/60"
                      }`}>
                        {msg.role === "assistant"
                          ? parseProductLinks(msg.content).map((part, j) =>
                              typeof part === "string"
                                ? <span key={j}>{part}</span>
                                : (
                                  <Link
                                    key={j}
                                    href={`/product/${part.id}`}
                                    onClick={close}
                                    className="inline-flex items-center gap-1 mt-2 text-[#D4AF37] text-xs uppercase tracking-widest border-b border-[#D4AF37]/30 hover:border-[#D4AF37] transition-colors"
                                  >
                                    {part.text}
                                  </Link>
                                ))
                          : msg.content}
                      </div>
                    </div>
                  ))}

                  {loading && (
                    <div className="flex justify-start items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center shrink-0">
                        <Gift className="w-3 h-3 text-[#D4AF37]" />
                      </div>
                      <div className="bg-zinc-900/80 border border-zinc-800/60 px-5 py-3 flex items-center gap-2">
                        <span className="flex gap-1">
                          {[0,1,2].map(n => (
                            <span
                              key={n}
                              className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]/50"
                              style={{ animation: `pulse 1.2s ease-in-out ${n * 0.2}s infinite` }}
                            />
                          ))}
                        </span>
                        <span className="text-xs text-zinc-500 tracking-wider">Wrapping something special…</span>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

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
                      placeholder="Describe them — style, hobbies, what they love…"
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

            {/* Gold bottom bar */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent shrink-0" />
          </div>
        </div>
      )}
    </>
  );
}
