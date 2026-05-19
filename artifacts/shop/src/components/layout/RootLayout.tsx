import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ShoppingBag, ArrowLeft } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useGetSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { StoreLogo } from "@/components/StoreLogo";

interface RootLayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  searchBar?: ReactNode;
  noHeader?: boolean;
  noMarquee?: boolean;
}

const MARQUEE_TEXT = "Free WhatsApp ordering\u2002·\u2002Curated luxury collection\u2002·\u2002New arrivals weekly\u2002·\u2002Exclusive pieces for the discerning\u2002·\u2002Free WhatsApp ordering\u2002·\u2002Curated luxury collection\u2002·\u2002New arrivals weekly\u2002·\u2002Exclusive pieces for the discerning\u2002·\u2002";

export function RootLayout({ children, title, showBack, searchBar, noHeader, noMarquee }: RootLayoutProps) {
  const { itemCount, subtotal, openCart } = useCart();
  const [location] = useLocation();
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const currency = settings?.currency ?? "KES";

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {!noHeader && (
        <>
          {/* Marquee strip */}
          {!noMarquee && (
            <div className="bg-[#D4AF37]/10 border-b border-[#D4AF37]/15 overflow-hidden py-1.5">
              <div
                className="flex whitespace-nowrap text-[10px] tracking-widest uppercase text-[#D4AF37]/60"
                style={{ animation: "marquee 28s linear infinite" }}
              >
                <span>{MARQUEE_TEXT}</span>
                <span aria-hidden>{MARQUEE_TEXT}</span>
              </div>
            </div>
          )}

          {/* Header */}
          <header
            className="sticky top-0 z-50 bg-[#0a0a0a]/92 backdrop-blur-md text-zinc-100 transition-all duration-300"
            style={{
              borderBottom: scrolled
                ? "1px solid rgba(212,175,55,0.3)"
                : "1px solid rgba(255,255,255,0.05)",
              boxShadow: scrolled
                ? "0 1px 32px 0 rgba(212,175,55,0.07)"
                : "none",
            }}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20 gap-4">
              {/* Left */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {showBack ? (
                  <Link href="/" className="p-2 -ml-2 text-zinc-500 hover:text-[#D4AF37] transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                  </Link>
                ) : null}
                <Link href="/" className="flex items-center">
                  {settings?.logoUrl ? (
                    <img src={settings.logoUrl} alt="Luxe Store" className="h-9 w-auto object-contain" />
                  ) : (
                    <StoreLogo />
                  )}
                </Link>
              </div>

              {/* Center search */}
              {searchBar && (
                <div className="hidden md:flex flex-1 max-w-md mx-4">
                  {searchBar}
                </div>
              )}

              {/* Right: cart */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={location === "/cart" ? undefined : openCart}
                  className="relative flex items-center p-2 -mr-2 text-zinc-500 hover:text-[#D4AF37] transition-colors"
                >
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
                </button>
              </div>
            </div>
          </header>
        </>
      )}

      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
