interface BundleBoxCoverProps {
  // Kept in the signature for backwards-compat with existing callers; the new
  // visual is a self-contained gift-box illustration and does not need the
  // component product photos.
  itemImages?: Array<string | null | undefined>;
  alt: string;
  className?: string;
}

// Cover visual for bundle ("gift set") products that have no admin-uploaded
// hero image. A clean SVG gift box rendered in 3/4 view: matte black body,
// gold ribbon cross with a neat bow on top, soft ground shadow. Scales
// crisply to any size and renders cheaply (single SVG, no animations).
export function BundleBoxCover({ alt, className = "" }: BundleBoxCoverProps) {
  return (
    <div
      role="img"
      aria-label={alt}
      className={`overflow-hidden ${className}`}
      style={{
        background:
          "radial-gradient(ellipse at 50% 42%, #1c1206 0%, #100a05 55%, #060403 100%)",
      }}
    >
      <svg
        viewBox="0 0 200 200"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 w-full h-full"
        aria-hidden
      >
        <defs>
          {/* Warm halo behind the box */}
          <radialGradient id="bbc-halo" cx="50%" cy="48%" r="45%">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.28" />
            <stop offset="60%" stopColor="#D4AF37" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
          </radialGradient>

          {/* Matte black box surfaces */}
          <linearGradient id="bbc-top" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a2a2a" />
            <stop offset="100%" stopColor="#1a1a1a" />
          </linearGradient>
          <linearGradient id="bbc-front" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1d1d1d" />
            <stop offset="55%" stopColor="#141414" />
            <stop offset="100%" stopColor="#0a0a0a" />
          </linearGradient>
          <linearGradient id="bbc-side" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0e0e0e" />
            <stop offset="100%" stopColor="#050505" />
          </linearGradient>
          <linearGradient id="bbc-lid-edge" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a3a3a" />
            <stop offset="100%" stopColor="#1f1f1f" />
          </linearGradient>

          {/* Gold ribbon — vertical strip (light edge → dark edge) */}
          <linearGradient id="bbc-ribbon-v" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7a571a" />
            <stop offset="35%" stopColor="#d4a93a" />
            <stop offset="55%" stopColor="#ffe48a" />
            <stop offset="75%" stopColor="#d4a93a" />
            <stop offset="100%" stopColor="#7a571a" />
          </linearGradient>
          {/* Gold ribbon — horizontal strip */}
          <linearGradient id="bbc-ribbon-h" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7a571a" />
            <stop offset="35%" stopColor="#d4a93a" />
            <stop offset="55%" stopColor="#ffe48a" />
            <stop offset="75%" stopColor="#d4a93a" />
            <stop offset="100%" stopColor="#7a571a" />
          </linearGradient>
          {/* Bow gold (radial sheen) */}
          <radialGradient id="bbc-bow" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#ffe48a" />
            <stop offset="55%" stopColor="#d4a93a" />
            <stop offset="100%" stopColor="#7a571a" />
          </radialGradient>
        </defs>

        {/* Warm halo */}
        <rect x="0" y="0" width="200" height="200" fill="url(#bbc-halo)" />

        {/* Ground shadow */}
        <ellipse cx="100" cy="173" rx="62" ry="6" fill="#000" opacity="0.7" />

        {/* ── Box body (3/4 view) ───────────────────────────────────── */}
        {/* Top of the box (parallelogram) */}
        <polygon
          points="55,72 145,72 158,58 68,58"
          fill="url(#bbc-top)"
          stroke="#000"
          strokeOpacity="0.35"
          strokeWidth="0.5"
        />
        {/* Lid edge strip — gives the box a visible "lid sits on base" line */}
        <polygon
          points="55,72 145,72 145,80 55,80"
          fill="url(#bbc-lid-edge)"
        />
        {/* Right side face (small chamfer) */}
        <polygon
          points="145,72 158,58 158,148 145,162"
          fill="url(#bbc-side)"
        />
        {/* Front face */}
        <rect x="55" y="80" width="90" height="82" fill="url(#bbc-front)" />
        {/* Highlight along the top-front edge */}
        <rect x="55" y="80" width="90" height="1.2" fill="#ffffff" opacity="0.08" />

        {/* ── Gold ribbon cross ─────────────────────────────────────── */}
        {/* Horizontal ribbon — front face */}
        <rect x="55" y="113" width="90" height="14" fill="url(#bbc-ribbon-h)" />
        {/* Horizontal ribbon — wraps onto right side face */}
        <polygon
          points="145,113 158,99 158,113 145,127"
          fill="#a07a25"
        />
        <polygon
          points="145,113 158,99 158,113 145,127"
          fill="url(#bbc-ribbon-h)"
          opacity="0.65"
        />

        {/* Vertical ribbon — front face */}
        <rect x="92" y="80" width="16" height="82" fill="url(#bbc-ribbon-v)" />
        {/* Vertical ribbon — wraps over the top face */}
        <polygon
          points="92,80 108,80 114,66 98,66"
          fill="url(#bbc-ribbon-v)"
        />
        {/* Small shadow under horizontal ribbon to ground it */}
        <rect x="55" y="127" width="90" height="1.5" fill="#000" opacity="0.35" />

        {/* ── Bow on top ────────────────────────────────────────────── */}
        {/* Tails hanging from knot, down onto the lid */}
        <path
          d="M 95 56 L 90 72 L 98 70 L 100 58 Z"
          fill="url(#bbc-bow)"
        />
        <path
          d="M 105 56 L 110 72 L 102 70 L 100 58 Z"
          fill="url(#bbc-bow)"
        />

        {/* Left loop */}
        <path
          d="M 100 50
             C 86 38, 70 40, 70 50
             C 70 60, 86 62, 100 54
             Z"
          fill="url(#bbc-bow)"
          stroke="#000"
          strokeOpacity="0.3"
          strokeWidth="0.6"
        />
        {/* Right loop */}
        <path
          d="M 100 50
             C 114 38, 130 40, 130 50
             C 130 60, 114 62, 100 54
             Z"
          fill="url(#bbc-bow)"
          stroke="#000"
          strokeOpacity="0.3"
          strokeWidth="0.6"
        />
        {/* Loop inner crease shadows */}
        <path
          d="M 78 44 C 86 46, 94 50, 100 52"
          stroke="#000"
          strokeOpacity="0.25"
          strokeWidth="0.8"
          fill="none"
        />
        <path
          d="M 122 44 C 114 46, 106 50, 100 52"
          stroke="#000"
          strokeOpacity="0.25"
          strokeWidth="0.8"
          fill="none"
        />
        {/* Center knot */}
        <rect
          x="93"
          y="44"
          width="14"
          height="14"
          rx="1.5"
          fill="url(#bbc-bow)"
          stroke="#000"
          strokeOpacity="0.35"
          strokeWidth="0.6"
        />
        {/* Knot highlight */}
        <rect x="94.5" y="45.5" width="11" height="2" fill="#fff" opacity="0.25" />
      </svg>
    </div>
  );
}
