import type { Product, ProductVariant } from "@workspace/api-client-react";

export function isVariantSoldOut(v: Pick<ProductVariant, "stockQuantity">): boolean {
  return (v.stockQuantity ?? 0) <= 0;
}

export function isProductSoldOut(product: Product): boolean {
  if (!product.inStock) return true;
  const activeVariants = (product.variants ?? []).filter((v) => v.isActive);
  if (activeVariants.length > 0) {
    return activeVariants.every(isVariantSoldOut);
  }
  return product.stockQuantity === 0;
}
