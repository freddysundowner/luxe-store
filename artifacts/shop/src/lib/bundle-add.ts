import { useCallback, useMemo } from "react";
import {
  Product,
  useListProducts,
  getListProductsQueryKey,
} from "@workspace/api-client-react";
import { useCart, HamperLineInput } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";

/**
 * Resolve a bundle product's `bundleProducts` summaries into full Product
 * objects (needed because the cart stores Products as line items, not
 * summaries) and provide a callback that adds them as a hamper group.
 *
 * Uses the unfiltered `/api/products` cache as the source of truth — same
 * list the home page and gift finder already load, so this is effectively
 * free on most surfaces.
 *
 * Returns null `add` when the lookup table isn't ready yet so callers can
 * disable their button until resolution succeeds.
 */
export function useAddBundleToCart() {
  const { addHamper, openCart } = useCart();
  const { toast } = useToast();

  // Cache shared with the home feed — won't re-fetch on each card.
  const { data: allProducts } = useListProducts(
    {},
    { query: { queryKey: getListProductsQueryKey({}) } },
  );

  const productById = useMemo(() => {
    const m = new Map<number, Product>();
    (allProducts ?? []).forEach((p) => m.set(p.id, p));
    return m;
  }, [allProducts]);

  const ready = !!allProducts;

  const add = useCallback(
    (bundle: Product): boolean => {
      if (bundle.kind !== "bundle") return false;
      const summaries = bundle.bundleProducts ?? [];
      if (summaries.length === 0) {
        toast({ variant: "destructive", title: "This bundle is empty." });
        return false;
      }
      // Resolve each summary into a full Product. If any component is
      // missing from the cached list (e.g. inactive product), refuse the
      // add rather than charging for a partial bundle.
      const resolved = summaries.map((s) => ({
        product: productById.get(s.id),
        quantity: s.quantity,
      }));
      if (resolved.some((l) => !l.product)) {
        toast({
          variant: "destructive",
          title: "Some items in this bundle are unavailable right now.",
        });
        return false;
      }
      const lines: HamperLineInput[] = resolved.filter(
        (l): l is HamperLineInput => Boolean(l.product),
      );
      addHamper(lines, {
        name: bundle.name,
        hamperId: bundle.id,
        totalPrice: bundle.price,
        imageUrl: bundle.imageUrl ?? null,
      });
      toast({ title: `${bundle.name} added to bag` });
      openCart();
      return true;
    },
    [productById, addHamper, openCart, toast],
  );

  return { add, ready };
}
