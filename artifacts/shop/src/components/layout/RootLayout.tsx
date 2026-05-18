import { ReactNode } from "react";
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

export function RootLayout({ children, title, showBack, searchBar }: RootLayoutProps) {
  const { itemCount } = useCart();
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-zinc-900 text-zinc-100">
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
            <Link href="/cart" className="relative p-2 -mr-2 text-zinc-400 hover:text-[#D4AF37] transition-colors">
              <ShoppingBag className="w-6 h-6" />
              {itemCount > 0 && (
                <span className="absolute top-1 right-1 bg-[#D4AF37] text-black text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-in zoom-in">
                  {itemCount}
                </span>
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
