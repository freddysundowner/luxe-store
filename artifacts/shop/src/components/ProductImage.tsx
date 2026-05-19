import { ShoppingBag } from "lucide-react";

export interface ImageDisplaySettings {
  fit: "cover" | "contain";
  focalX: number;
  focalY: number;
}

export const DEFAULT_IMAGE_SETTINGS: ImageDisplaySettings = {
  fit: "cover",
  focalX: 50,
  focalY: 50,
};

export function getImageSettings(
  url: string | null | undefined,
  settings: Record<string, ImageDisplaySettings> | null | undefined,
): ImageDisplaySettings {
  if (!url || !settings) return DEFAULT_IMAGE_SETTINGS;
  return settings[url] ?? DEFAULT_IMAGE_SETTINGS;
}

interface ProductImageProps {
  src: string | null | undefined;
  alt: string;
  settings?: ImageDisplaySettings | null;
  /** Tailwind classes for the wrapper that sets the aspect ratio / size. */
  className?: string;
  /** Extra Tailwind classes applied to the foreground <img> (e.g. hover scale). */
  imgClassName?: string;
  /** Show a placeholder bag icon when src is missing. */
  showFallback?: boolean;
  draggable?: boolean;
}

/**
 * Renders a product image with optional fit/focal-point settings.
 *
 * - `fit: "cover"` (default): the image is cropped to fill, with the focal
 *   point kept on-screen via object-position.
 * - `fit: "contain"`: the image is shown whole, and a blurred copy of the
 *   same image fills the empty space behind it (Instagram-style letterbox).
 *
 * The wrapper itself is responsible for the aspect ratio / size; pass it via
 * `className` (e.g. `aspect-[4/5]`, `absolute inset-0`, etc).
 */
export function ProductImage({
  src,
  alt,
  settings,
  className = "",
  imgClassName = "",
  showFallback = true,
  draggable,
}: ProductImageProps) {
  const cfg = settings ?? DEFAULT_IMAGE_SETTINGS;
  // Tailwind's compiled stylesheet declares `.relative` after `.absolute`,
  // so combining both classes makes `relative` win and collapses the wrapper
  // to 0×0. Only add `relative` when the caller hasn't taken responsibility
  // for positioning (e.g. by passing `absolute inset-0`).
  const positionClass = /\b(absolute|fixed|sticky)\b/.test(className) ? "" : "relative";
  const wrapperClass = `${positionClass} overflow-hidden bg-zinc-900 ${className}`.trim();

  if (!src) {
    if (!showFallback) return null;
    return (
      <div className={wrapperClass}>
        <div className="absolute inset-0 flex items-center justify-center">
          <ShoppingBag className="w-10 h-10 text-zinc-700" />
        </div>
      </div>
    );
  }

  const objectPosition = `${cfg.focalX}% ${cfg.focalY}%`;

  if (cfg.fit === "contain") {
    return (
      <div className={wrapperClass}>
        {/* Blurred background fills letterbox bars with the same image, so
            small/portrait/landscape uploads still look intentional rather
            than stranded against a black bar. */}
        <img
          src={src}
          alt=""
          aria-hidden
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-70"
        />
        <div className="absolute inset-0 bg-black/20" />
        <img
          src={src}
          alt={alt}
          draggable={draggable}
          className={`absolute inset-0 w-full h-full object-contain ${imgClassName}`}
        />
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <img
        src={src}
        alt={alt}
        draggable={draggable}
        className={`absolute inset-0 w-full h-full object-cover ${imgClassName}`}
        style={{ objectPosition }}
      />
    </div>
  );
}
