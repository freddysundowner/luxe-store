import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Loader2, Gift } from "lucide-react";
import { Link } from "wouter";

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
    if (open && messages.length === 0) {
      setMessages([{ role: "assistant", content: "Hi! I'm your gift advisor. Tell me who you're shopping for, their interests, and your budget — I'll find the perfect match from our collection." }]);
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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
      setMessages([...newMessages, { role: "assistant", content: data.reply || "Sorry, I couldn't find a match. Try describing differently!" }]);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-[#D4AF37] text-black text-xs uppercase tracking-widest font-medium shadow-[0_4px_24px_rgba(212,175,55,0.4)] hover:bg-white transition-all duration-300 ${open ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      >
        <Gift className="w-4 h-4" />
        <span className="hidden sm:inline">Gift Finder</span>
      </button>

      <div className={`fixed bottom-0 right-0 z-50 flex flex-col transition-all duration-400 ease-out
          ${open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none"}
          w-full sm:w-[380px] sm:bottom-6 sm:right-6 h-[70dvh] sm:h-[520px]
          bg-[#0a0a0a] border border-zinc-900 shadow-[0_8px_48px_rgba(0,0,0,0.7)]`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-900 shrink-0">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-sm uppercase tracking-widest text-[#D4AF37] font-light">Gift Advisor</span>
          </div>
          <button onClick={() => setOpen(false)} className="text-zinc-700 hover:text-zinc-300 transition-colors p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed font-light ${
                msg.role === "user"
                  ? "bg-[#D4AF37] text-black"
                  : "bg-zinc-900 text-zinc-300 border border-zinc-800"
              }`}>
                {msg.role === "assistant"
                  ? parseProductLinks(msg.content).map((part, j) =>
                      typeof part === "string" ? <span key={j}>{part}</span> : (
                        <Link key={j} href={`/product/${part.id}`} onClick={() => setOpen(false)} className="inline-block mt-1 text-[#D4AF37] underline underline-offset-2 text-xs">
                          {part.text}
                        </Link>
                      ))
                  : msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-zinc-900 border border-zinc-800 px-4 py-3 flex items-center gap-2 text-zinc-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="text-xs">Finding gifts…</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="px-4 py-4 border-t border-zinc-900 shrink-0">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="e.g. gift for my mum, loves cooking…"
              className="flex-1 bg-zinc-900 border border-zinc-800 px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#D4AF37]/50 transition-colors"
            />
            <button onClick={send} disabled={!input.trim() || loading} className="px-4 py-2.5 bg-[#D4AF37] text-black hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
