import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
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

export function GiftFinder() {
  const [open, setOpen] = useState(false);
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
    if (open && messages.length === 0) {
      setMessages([{ role: "assistant", content: "Welcome. Tell me who you're shopping for — their personality, interests, and your budget. I'll find the perfect gift from our collection." }]);
    }
    if (open && window.matchMedia("(pointer: fine)").matches) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const close = () => setOpen(false);

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
          from { opacity: 0; transform: translateY(32px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .gf-backdrop { animation: gf-backdrop-in 0.25s ease forwards; }
        .gf-panel    { animation: gf-panel-in 0.3s cubic-bezier(0.16,1,0.3,1) forwards; }
        .gf-scrollbar::-webkit-scrollbar { width: 3px; }
        .gf-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .gf-scrollbar::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.2); border-radius: 999px; }
      `}</style>

      {open && (
        <div
          className="gf-backdrop fixed inset-0 z-[300] flex items-end sm:items-center justify-center sm:p-6"
          style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(6px)" }}
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <div className="gf-panel relative flex flex-col w-full sm:w-[480px] sm:max-w-[90vw] h-[82dvh] sm:h-[600px] bg-[#0a0a0a] border border-[#D4AF37]/20 shadow-[0_0_80px_rgba(212,175,55,0.12),0_32px_64px_rgba(0,0,0,0.8)]">

            {/* Gold top bar */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#D4AF37] font-light">Luxe</p>
                  <p className="text-sm text-white font-light tracking-wide -mt-0.5">Gift Advisor</p>
                </div>
              </div>
              <button
                onClick={close}
                className="w-8 h-8 flex items-center justify-center text-zinc-600 hover:text-[#D4AF37] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="h-px bg-[#D4AF37]/10 mx-6" />

            {/* Messages */}
            <div className="flex-1 overflow-y-auto gf-scrollbar px-6 py-5 space-y-5">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-6 h-6 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center shrink-0 mr-2.5 mt-0.5">
                      <Sparkles className="w-3 h-3 text-[#D4AF37]" />
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
                    <Sparkles className="w-3 h-3 text-[#D4AF37]" />
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
                    <span className="text-xs text-zinc-500 tracking-wider">Curating gifts…</span>
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
                  placeholder="e.g. mum who loves candles, budget $50…"
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
                Powered by AI · Luxe Store
              </p>
            </div>

            {/* Gold bottom bar */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />
          </div>
        </div>
      )}
    </>
  );
}
