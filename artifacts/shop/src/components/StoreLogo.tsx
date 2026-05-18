export function StoreLogo() {
  return (
    <svg
      viewBox="0 0 160 44"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Luxe Store"
      className="h-9 w-auto select-none"
    >
      {/* Top thin rule */}
      <line x1="0" y1="2" x2="60" y2="2" stroke="#D4AF37" strokeWidth="0.6" opacity="0.5" />
      <line x1="100" y1="2" x2="160" y2="2" stroke="#D4AF37" strokeWidth="0.6" opacity="0.5" />

      {/* Diamond centrepiece on top rule */}
      <polygon points="80,0 83,2 80,4 77,2" fill="#D4AF37" opacity="0.9" />

      {/* LUXE — main wordmark */}
      <text
        x="80"
        y="26"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="20"
        fontWeight="400"
        letterSpacing="8"
        fill="#D4AF37"
      >
        LUXE
      </text>

      {/* Bottom thin rule */}
      <line x1="10" y1="32" x2="150" y2="32" stroke="#D4AF37" strokeWidth="0.5" opacity="0.3" />

      {/* STORE — subtitle */}
      <text
        x="80"
        y="42"
        textAnchor="middle"
        fontFamily="'Inter', Arial, sans-serif"
        fontSize="7"
        fontWeight="300"
        letterSpacing="5"
        fill="#D4AF37"
        opacity="0.7"
      >
        STORE
      </text>
    </svg>
  );
}
