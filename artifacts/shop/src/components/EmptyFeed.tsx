import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
  orbit: number;
}

function makeParticles(n: number): Particle[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    x: 30 + Math.random() * 40,
    y: 20 + Math.random() * 60,
    size: 2 + Math.random() * 3,
    opacity: 0.2 + Math.random() * 0.5,
    duration: 2.5 + Math.random() * 3,
    delay: Math.random() * 4,
    orbit: 24 + Math.random() * 40,
  }));
}

interface EmptyFeedProps {
  message?: string;
  sub?: string;
  onClear?: () => void;
  clearLabel?: string;
  compact?: boolean;
}

export function EmptyFeed({
  message = "Nothing to show",
  sub = "Try adjusting your filters",
  onClear,
  clearLabel = "Clear filters",
  compact = false,
}: EmptyFeedProps) {
  const [particles] = useState(() => makeParticles(18));
  const [tick, setTick] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      setTick(ts - startRef.current);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const t = tick / 1000;

  return (
    <div
      className="flex flex-col items-center justify-center w-full h-full relative overflow-hidden"
      style={{
        minHeight: compact ? 220 : 340,
        animation: "efadeIn 0.6s cubic-bezier(0.16,1,0.3,1) both",
      }}
    >
      <style>{`
        @keyframes efadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes eOrbit {
          from { transform: rotate(0deg) translateX(var(--r)) rotate(0deg); }
          to   { transform: rotate(360deg) translateX(var(--r)) rotate(-360deg); }
        }
        @keyframes ePulse {
          0%, 100% { transform: scale(1); opacity: 0.08; }
          50%       { transform: scale(1.12); opacity: 0.18; }
        }
        @keyframes eGem {
          0%, 100% { filter: drop-shadow(0 0 4px rgba(212,175,55,0.4)); transform: scale(1) rotate(0deg); }
          25%       { filter: drop-shadow(0 0 14px rgba(212,175,55,0.9)); transform: scale(1.08) rotate(6deg); }
          75%       { filter: drop-shadow(0 0 10px rgba(212,175,55,0.6)); transform: scale(1.04) rotate(-4deg); }
        }
        @keyframes eFloat {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-8px); }
        }
      `}</style>

      {/* Floating particles */}
      {particles.map((p) => {
        const px = p.x + Math.sin((t / p.duration) * Math.PI * 2 + p.delay) * 8;
        const py = p.y + Math.cos((t / (p.duration * 0.7)) * Math.PI * 2 + p.delay) * 6;
        return (
          <div
            key={p.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: `${px}%`,
              top: `${py}%`,
              width: p.size,
              height: p.size,
              background: `radial-gradient(circle at 30% 30%, #f5e27a, #D4AF37)`,
              opacity: p.opacity * (0.6 + 0.4 * Math.sin((t / p.duration) * Math.PI * 2 + p.delay)),
              transition: "none",
            }}
          />
        );
      })}

      {/* Concentric pulse rings */}
      <div className="absolute" style={{ width: 180, height: 180 }}>
        {[1, 0.7, 0.45].map((scale, i) => (
          <div
            key={i}
            className="absolute inset-0 rounded-full border border-[#D4AF37]"
            style={{
              transform: `scale(${scale})`,
              opacity: 0,
              animation: `ePulse ${2.8 + i * 0.6}s ${i * 0.7}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      {/* Centre gem icon */}
      <div
        className="relative z-10 flex flex-col items-center gap-5"
        style={{ animation: "eFloat 3s ease-in-out infinite" }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{
            background: "radial-gradient(circle at 35% 35%, #1c1400, #0a0a0a)",
            border: "1px solid rgba(212,175,55,0.3)",
            boxShadow: "0 0 0 8px rgba(212,175,55,0.04), 0 0 32px rgba(212,175,55,0.12)",
            animation: "eGem 3s ease-in-out infinite",
          }}
        >
          <Sparkles className="w-7 h-7 text-[#D4AF37]" />
        </div>

        <div className="text-center space-y-2 px-6">
          <p className="text-sm font-light uppercase tracking-[0.25em] text-zinc-300">{message}</p>
          <p className="text-[11px] tracking-widest text-zinc-600 uppercase">{sub}</p>
        </div>

        {onClear && (
          <button
            onClick={onClear}
            className="mt-1 px-5 py-2.5 text-[10px] uppercase tracking-[0.25em] font-medium transition-all"
            style={{
              border: "1px solid rgba(212,175,55,0.35)",
              color: "#D4AF37",
              background: "rgba(212,175,55,0.06)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(212,175,55,0.15)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(212,175,55,0.7)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(212,175,55,0.06)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(212,175,55,0.35)";
            }}
          >
            {clearLabel}
          </button>
        )}
      </div>
    </div>
  );
}
