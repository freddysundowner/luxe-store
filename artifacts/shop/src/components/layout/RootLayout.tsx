import { ReactNode, useEffect, useState } from "react";
import { Link } from "wouter";
import { ShoppingBag, Store, ArrowLeft } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useGetSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";

interface RootLayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  searchBar?: ReactNode;
}

const MARQUEE_TEXT = "Free WhatsApp ordering\u2002·\u2002Curated luxury collection\u2002·\u2002New arrivals weekly\u2002·\u2002Exclusive pieces for the discerning\u2002·\u2002Free WhatsApp ordering\u2002·\u2002Curated luxury collection\u2002·\u2002New arrivals weekly\u2002·\u2002Exclusive pieces for the discerning\u2002·\u2002";

export function RootLayout({ children, title, showBack, searchBar }: RootLayoutProps) {
  const { itemCount, subtotal } = useCart();
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const currency = settings?.currency ?? "$";

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Marquee strip */}
      <div className="bg-[#D4AF37]/10 border-b border-[#D4AF37]/20 overflow-hidden py-1.5">
        <div
          className="flex whitespace-nowrap text-[10px] tracking-widest uppercase text-[#D4AF37]/70"
          style={{ animation: "marquee 28s linear infinite" }}
        >
          <span>{MARQUEE_TEXT}</span>
          <span aria-hidden>{MARQUEE_TEXT}</span>
        </div>
      </div>

      {/* Header */}
      <header
        className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-md text-zinc-100 transition-all duration-300"
        style={{
          borderBottom: scrolled
            ? "1px solid rgba(212,175,55,0.35)"
            : "1px solid rgb(24,24,27)",
          boxShadow: scrolled
            ? "0 1px 24px 0 rgba(212,175,55,0.08)"
            : "none",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20 gap-4">
          {/* Left: back/logo + store name */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {showBack ? (
              <Link href="/" className="p-2 -ml-2 text-zinc-400 hover:text-[#D4AF37] transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            ) : (
              <div className="p-1.5">
                {settings?.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" className="w-7 h-7 object-cover" />
                ) : (
                  <Store className="w-6 h-6 text-[#D4AF37]" />
                )}
              </div>
            )}
            <span className="text-xl tracking-[0.18em] font-light text-[#D4AF37] uppercase truncate max-w-[160px] sm:max-w-[240px] lg:max-w-none">
              {title || settings?.storeName || "Store"}
            </span>
          </div>

          {/* Center: search slot (desktop only) */}
          {searchBar && (
            <div className="hidden md:flex flex-1 max-w-md mx-4">
              {searchBar}
            </div>
          )}

          {/* Right: cart */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link href="/cart" className="relative flex items-center gap-2 p-2 -mr-2 text-zinc-400 hover:text-[#D4AF37] transition-colors group">
              <ShoppingBag className="w-6 h-6" />
              {itemCount > 0 && (
                <>
                  <span className="absolute top-1 right-1 bg-[#D4AF37] text-black text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-in zoom-in">
                    {itemCount}
                  </span>
                  <span className="hidden sm:block text-xs tracking-widest text-[#D4AF37] font-light tabular-nums ml-5">
                    {currency}{subtotal.toFixed(2)}
                  </span>
                </>
              )}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
