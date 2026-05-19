import { Gift } from "lucide-react";

interface BundleBoxCoverProps {
  itemImages: Array<string | null | undefined>;
  alt: string;
  className?: string;
}

// Stylised "opened gift box with a ribbon" rendered when a bundle has no
// admin-uploaded cover image. The component products' cover photos peek out
// of the box as a fanned stack of polaroid-style cards so the customer can
// see what's inside at a glance.
export function BundleBoxCover({ itemImages, alt, className = "" }: BundleBoxCoverProps) {
  const seen = new Set<string>();
  const imgs: string[] = [];
  for (const url of itemImages) {
    if (!url) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    imgs.push(url);
    if (imgs.length === 4) break;
  }

  if (imgs.length === 0) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`bg-zinc-900 flex items-center justify-center overflow-hidden ${className}`}
      >
        <Gift aria-hidden className="text-[#D4AF37]/60 w-1/3 h-1/3" />
      </div>
    );
  }

  const total = imgs.length;
  const middle = (total - 1) / 2;

  return (
    <div
      role="img"
      aria-label={alt}
      className={`overflow-hidden ${className}`}
      style={{
        background:
          "radial-gradient(ellipse at 50% 35%, #2a1c0a 0%, #150e07 55%, #0a0807 100%)",
      }}
    >
      {/* Warm glow behind the box */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%, rgba(212,175,55,0.18), transparent 60%)",
        }}
      />

      {/* Opened lid tilted back, sitting behind everything */}
      <div
        aria-hidden
        className="absolute left-1/2 top-[6%] w-[68%] h-[14%]"
        style={{
          transform: "translateX(-58%) rotate(-12deg)",
          transformOrigin: "bottom right",
        }}
      >
        <div
          className="w-full h-full rounded-[2px]"
          style={{
            background:
              "linear-gradient(180deg, #E6C158 0%, #B6892C 65%, #6f5018 100%)",
            boxShadow: "0 6px 14px rgba(0,0,0,0.55)",
          }}
        />
        {/* Horizontal ribbon across the lid */}
        <div
          className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[16%]"
          style={{
            background:
              "linear-gradient(180deg, #ffe48a 0%, #d4a93a 50%, #8a6418 100%)",
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.25)",
          }}
        />
      </div>

      {/* Bow loops sitting on top of the lid */}
      <div
        aria-hidden
        className="absolute left-[32%] top-[2%] w-[24%] h-[11%] z-20"
        style={{ transform: "rotate(-6deg)" }}
      >
        <div
          className="absolute left-0 top-[15%] w-[48%] h-[80%] rounded-[55%]"
          style={{
            background:
              "radial-gradient(circle at 35% 40%, #ffe48a 0%, #c9982f 70%, #7a571a 100%)",
            transform: "skewX(-18deg)",
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.25)",
          }}
        />
        <div
          className="absolute right-0 top-[15%] w-[48%] h-[80%] rounded-[55%]"
          style={{
            background:
              "radial-gradient(circle at 65% 40%, #ffe48a 0%, #c9982f 70%, #7a571a 100%)",
            transform: "skewX(18deg)",
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.25)",
          }}
        />
        <div
          className="absolute left-1/2 top-0 -translate-x-1/2 w-[18%] h-full rounded-[2px]"
          style={{
            background: "linear-gradient(180deg, #d4a93a, #7a571a)",
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.3)",
          }}
        />
      </div>

      {/* Items fanned out, peeking from inside the box */}
      <div className="absolute inset-x-[10%] top-[24%] bottom-[18%] z-10">
        {imgs.map((src, i) => {
          const offset = i - middle;
          const rotate = offset * 9;
          const translateX = offset * 16;
          const translateY = Math.abs(offset) * 4;
          return (
            <div
              key={src}
              className="absolute top-0 bottom-0 left-1/2 w-[44%] overflow-hidden border-[3px] border-white/95 rounded-[2px]"
              style={{
                transform: `translateX(calc(-50% + ${translateX}%)) translateY(${translateY}%) rotate(${rotate}deg)`,
                zIndex: 20 - Math.abs(offset) * 2,
                boxShadow: "0 10px 22px rgba(0,0,0,0.55)",
              }}
            >
              <img
                src={src}
                alt=""
                aria-hidden
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </div>
          );
        })}
      </div>

      {/* Box front face, drawn over the bottom of the cards so they look
          tucked inside the box. */}
      <div
        aria-hidden
        className="absolute left-[7%] right-[7%] bottom-[5%] h-[32%] rounded-[2px] z-30 overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, #c9982f 0%, #8c661f 65%, #4f3a11 100%)",
          boxShadow:
            "0 12px 26px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,220,140,0.4)",
        }}
      >
        {/* Soft inner shadow at the rim suggests depth inside the box */}
        <div
          className="absolute inset-x-0 top-0 h-[22%]"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.55), transparent)",
          }}
        />
        {/* Vertical ribbon down the front of the box */}
        <div
          className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[15%]"
          style={{
            background:
              "linear-gradient(180deg, #ffe48a 0%, #d4a93a 50%, #8a6418 100%)",
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.25)",
          }}
        />
      </div>
    </div>
  );
}
