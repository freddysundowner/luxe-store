import { Switch, Route, Router as WouterRouter } from "wouter";
import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/lib/cart-context";
import { FavoritesProvider } from "@/lib/favorites-context";
import { GiftFinder } from "@/components/GiftFinder";
import { CartDrawer } from "@/components/CartDrawer";
import { MpesaModal } from "@/components/MpesaModal";
import { useCart } from "@/lib/cart-context";
import NotFound from "@/pages/not-found";

// Import pages
import Home from "@/pages/home";
import CategoryPage from "@/pages/category";
import ProductDetail from "@/pages/product";
import GiftPage from "@/pages/gift";
import Favorites from "@/pages/favorites";
import AdminLogin from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminProducts from "@/pages/admin/products/index";
import AdminProductForm from "@/pages/admin/products/form";
import AdminCategories from "@/pages/admin/categories/index";
import AdminSettings from "@/pages/admin/settings";
import AdminGifts from "@/pages/admin/gifts";
import AdminAvailabilityTags from "@/pages/admin/availability-tags";
import AdminOrders from "@/pages/admin/orders";
import AdminOrderDetail from "@/pages/admin/order-detail";
import ReceiptPage from "@/pages/receipt";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={Home} />
      <Route path="/category/:id" component={CategoryPage} />
      <Route path="/product/:id" component={ProductDetail} />
      <Route path="/favorites" component={Favorites} />
      <Route path="/gift/:id" component={GiftPage} />
      <Route path="/receipt/:transactionId" component={ReceiptPage} />

      {/* Admin Auth */}
      <Route path="/admin" component={AdminLogin} />

      {/* Admin Protected Routes */}
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/products" component={AdminProducts} />
      <Route path="/admin/products/new" component={AdminProductForm} />
      <Route path="/admin/products/:id/edit" component={AdminProductForm} />
      <Route path="/admin/categories" component={AdminCategories} />
      <Route path="/admin/orders" component={AdminOrders} />
      <Route path="/admin/orders/:id" component={AdminOrderDetail} />
      <Route path="/admin/gifts" component={AdminGifts} />
      <Route path="/admin/availability-tags" component={AdminAvailabilityTags} />
      <Route path="/admin/settings" component={AdminSettings} />

      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

interface AppProps {
  ssrUrl?: string;
}

function App({ ssrUrl }: AppProps) {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const locationHook =
    ssrUrl !== undefined
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (() => [ssrUrl, () => {}] as any)
      : undefined;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CartProvider>
          <FavoritesProvider>
            <WouterRouter base={base} hook={locationHook}>
              <Router />
              {mounted && <GiftFinder />}
              {/* CartDrawer has its own mounted guard */}
              <CartDrawer />
              <GlobalMpesaModal />
            </WouterRouter>
          </FavoritesProvider>
        </CartProvider>
        {mounted && <Toaster />}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

// Bridges the cart-context M-Pesa state to the overlay. Lives inside the
// providers so it can read context; rendered once at app root so the overlay
// is reachable from anywhere (Quick Buy, cart drawer, cart page).
function GlobalMpesaModal() {
  const { isMpesaOpen, closeMpesa } = useCart();
  return <MpesaModal open={isMpesaOpen} onClose={closeMpesa} />;
}

export default App;
