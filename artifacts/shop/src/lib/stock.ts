import type { Product, ProductVariant } from "@workspace/api-client-react";

export function isVariantSoldOut(v: Pick<ProductVariant, "stockQuantity">): boolean {
  return (v.stockQuantity ?? 0) <= 0;
}

export function isProductSoldOut(product: Product): boolean {
  if (!product.inStock) return true;
  // Bundles don't track their own stock — the server computes `inStock`
  // from the availability of every component product. Trust that flag and
  // don't fall through to the stockQuantity check (which is always 0 for
  // bundles and would otherwise mark them all as sold out).
  if (product.kind === "bundle") return false;
  const activeVariants = (product.variants ?? []).filter((v) => v.isActive);
  if (activeVariants.length > 0) {
    return activeVariants.every(isVariantSoldOut);
  }
  return product.stockQuantity === 0;
}
