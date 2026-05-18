import { ReactNode } from "react";
import { Link } from "wouter";
import { ShoppingCart, Store, ArrowLeft } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useGetSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";

export function RootLayout({ children, title, showBack }: { children: ReactNode; title?: string; showBack?: boolean }) {
  const { itemCount } = useCart();
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showBack ? (
              <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-black/10 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            ) : (
              <div className="p-1.5 bg-white/20 rounded-xl">
                {settings?.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" className="w-6 h-6 rounded-md object-cover" />
                ) : (
                  <Store className="w-6 h-6" />
                )}
              </div>
            )}
            <h1 className="font-semibold text-lg tracking-tight truncate max-w-[260px] sm:max-w-none">
              {title || settings?.storeName || "Store"}
            </h1>
          </div>
          <Link href="/cart" className="relative p-2 -mr-2 rounded-full hover:bg-black/10 transition-colors">
            <ShoppingCart className="w-6 h-6" />
            {itemCount > 0 && (
              <span className="absolute top-0 right-0 bg-destructive text-destructive-foreground text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-in zoom-in">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </header>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
