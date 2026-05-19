import { Gift } from "lucide-react";
import { useState } from "react";

interface HamperCoverProps {
  imageUrl?: string | null;
  fallbackImages?: Array<string | null | undefined>;
  alt: string;
  className?: string;
  iconClassName?: string;
}

// Renders the cover for a hamper. If the admin uploaded an imageUrl we use it
// directly; otherwise we synthesize a smooth collage from up to four product
// cover photos belonging to the hamper. When no product images are available
// we fall back to the gift icon placeholder.
export function HamperCover({
  imageUrl,
  fallbackImages = [],
  alt,
  className = "",
  iconClassName = "",
}: HamperCoverProps) {
  // If the uploaded cover URL fails to load (404, dead host, etc) we silently
  // degrade to the collage/placeholder instead of leaving a broken-image icon.
  const [imageFailed, setImageFailed] = useState(false);
  const showUploaded = imageUrl && !imageFailed;

  if (showUploaded) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <img
          src={imageUrl ?? undefined}
          alt={alt}
          onError={() => setImageFailed(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // De-dupe and trim to the first 4 valid product images for the collage.
  const seen = new Set<string>();
  const imgs: string[] = [];
  for (const url of fallbackImages) {
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
        className={`bg-[#D4AF37]/5 flex items-center justify-center overflow-hidden ${className}`}
      >
        <Gift aria-hidden className={`text-[#D4AF37]/60 ${iconClassName || "w-1/2 h-1/2"}`} />
      </div>
    );
  }

  // Single image: simple cover.
  if (imgs.length === 1) {
    return (
      <div className={`overflow-hidden ${className}`}>
        <img src={imgs[0]} alt={alt} className="w-full h-full object-cover" />
      </div>
    );
  }

  // 2: side-by-side halves. 3: large left + two stacked. 4: 2x2 grid.
  // Hairline divider (border-r/border-b on the inner cells) gives the
  // photo-mosaic look without breaking pixel rounding at small sizes.
  const cell = "w-full h-full object-cover";
  const divider = "border-zinc-950/80";

  if (imgs.length === 2) {
    return (
      <div className={`grid grid-cols-2 overflow-hidden bg-zinc-950 ${className}`}>
        <div className={`overflow-hidden border-r ${divider}`}>
          <img src={imgs[0]} alt={alt} className={cell} />
        </div>
        <div className="overflow-hidden">
          <img src={imgs[1]} alt="" aria-hidden className={cell} />
        </div>
      </div>
    );
  }

  if (imgs.length === 3) {
    return (
      <div className={`grid grid-cols-2 grid-rows-2 overflow-hidden bg-zinc-950 ${className}`}>
        <div className={`row-span-2 overflow-hidden border-r ${divider}`}>
          <img src={imgs[0]} alt={alt} className={cell} />
        </div>
        <div className={`overflow-hidden border-b ${divider}`}>
          <img src={imgs[1]} alt="" aria-hidden className={cell} />
        </div>
        <div className="overflow-hidden">
          <img src={imgs[2]} alt="" aria-hidden className={cell} />
        </div>
      </div>
    );
  }

  // 4+
  return (
    <div className={`grid grid-cols-2 grid-rows-2 overflow-hidden bg-zinc-950 ${className}`}>
      <div className={`overflow-hidden border-r border-b ${divider}`}>
        <img src={imgs[0]} alt={alt} className={cell} />
      </div>
      <div className={`overflow-hidden border-b ${divider}`}>
        <img src={imgs[1]} alt="" aria-hidden className={cell} />
      </div>
      <div className={`overflow-hidden border-r ${divider}`}>
        <img src={imgs[2]} alt="" aria-hidden className={cell} />
      </div>
      <div className="overflow-hidden">
        <img src={imgs[3]} alt="" aria-hidden className={cell} />
      </div>
    </div>
  );
}
