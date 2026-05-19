import { Gift } from "lucide-react";

interface BundleBoxCoverProps {
  itemImages: Array<string | null | undefined>;
  alt: string;
  className?: string;
}

// Cover visual for bundle ("gift set") products that have no admin-uploaded
// hero image. Instead of a faux-3D wrapped-box illustration, we show the real
// component product photos as a clean mosaic and mark the card with a small
// gold "Gift Set" chip. This keeps the look consistent with the rest of the
// store and tells the customer at a glance what's actually inside.
export function BundleBoxCover({ itemImages, alt, className = "" }: BundleBoxCoverProps) {
  const seen = new Set<string>();
  const imgs: string[] = [];
  for (const url of itemImages) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    imgs.push(url);
    if (imgs.length === 4) break;
  }
  const totalItems = itemImages.filter(Boolean).length;

  const Chip = (
    <div className="absolute top-2 left-2 z-20 flex items-center gap-1 bg-black/75 border border-[#D4AF37]/50 px-1.5 py-[3px] backdrop-blur-[1px]">
      <Gift aria-hidden className="w-3 h-3 text-[#D4AF37]" />
      <span className="text-[9px] uppercase tracking-widest text-[#D4AF37] font-medium leading-none">
        Gift Set{totalItems > 1 ? ` · ${totalItems}` : ""}
      </span>
    </div>
  );

  if (imgs.length === 0) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`bg-zinc-950 flex items-center justify-center ${className}`}
      >
        <Gift aria-hidden className="text-[#D4AF37]/50 w-1/3 h-1/3" />
        {Chip}
      </div>
    );
  }

  // Mosaic layouts: 1 → full bleed, 2 → vertical split, 3 → tall hero + 2 stack,
  // 4 → 2x2. The 1px black gaps come from the wrapper's bg-black showing through.
  const tiles =
    imgs.length === 1 ? (
      <Tile src={imgs[0]} className="col-span-2 row-span-2" />
    ) : imgs.length === 2 ? (
      <>
        <Tile src={imgs[0]} className="row-span-2" />
        <Tile src={imgs[1]} className="row-span-2" />
      </>
    ) : imgs.length === 3 ? (
      <>
        <Tile src={imgs[0]} className="row-span-2" />
        <Tile src={imgs[1]} />
        <Tile src={imgs[2]} />
      </>
    ) : (
      <>
        <Tile src={imgs[0]} />
        <Tile src={imgs[1]} />
        <Tile src={imgs[2]} />
        <Tile src={imgs[3]} />
      </>
    );

  return (
    <div role="img" aria-label={alt} className={`bg-black ${className}`}>
      <div
        aria-hidden
        className="absolute inset-0 grid"
        style={{
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: "1px",
        }}
      >
        {tiles}
      </div>
      {/* Subtle top/bottom vignette so the chip and any overlaid price stay legible. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 22%, transparent 72%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      {Chip}
    </div>
  );
}

function Tile({ src, className = "" }: { src: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-zinc-900 ${className}`}>
      <img
        src={src}
        alt=""
        aria-hidden
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  );
}
