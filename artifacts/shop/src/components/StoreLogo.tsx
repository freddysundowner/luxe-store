export function StoreLogo() {
  return (
    <div className="flex flex-col items-center leading-none select-none" style={{ gap: "3px", minWidth: "110px" }}>
      {/* Decorative line + diamond + line */}
      <div className="flex items-center gap-2 w-full">
        <div style={{ height: "1px", flex: 1, background: "linear-gradient(to right, transparent, rgba(212,175,55,0.7))" }} />
        <svg width="5" height="5" viewBox="0 0 5 5" style={{ flexShrink: 0 }}>
          <polygon points="2.5,0 5,2.5 2.5,5 0,2.5" fill="#D4AF37" />
        </svg>
        <div style={{ height: "1px", flex: 1, background: "linear-gradient(to left, transparent, rgba(212,175,55,0.7))" }} />
      </div>

      {/* LUXE wordmark */}
      <span
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "28px",
          fontWeight: 400,
          letterSpacing: "0.4em",
          color: "#D4AF37",
          lineHeight: 1,
          paddingLeft: "0.4em",
          textShadow: "0 0 30px rgba(212,175,55,0.25)",
        }}
      >
        LUXE
      </span>

      {/* Bottom rule */}
      <div style={{ height: "1px", width: "100%", background: "rgba(212,175,55,0.25)" }} />

      {/* STORE subtitle */}
      <span
        style={{
          fontFamily: "'Inter', Arial, sans-serif",
          fontSize: "9px",
          fontWeight: 300,
          letterSpacing: "0.5em",
          color: "rgba(212,175,55,0.6)",
          lineHeight: 1,
          paddingLeft: "0.5em",
        }}
      >
        STORE
      </span>
    </div>
  );
}
