import { useListProducts, getListProductsQueryKey } from "@workspace/api-client-react";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";

interface RelatedProductsProps {
  categoryId: number | null | undefined;
  currentProductId: number;
}

export function RelatedProducts({ categoryId, currentProductId }: RelatedProductsProps) {
  const { data: products, isLoading } = useListProducts(
    { categoryId: categoryId ?? undefined },
    {
      query: {
        queryKey: getListProductsQueryKey({ categoryId: categoryId ?? undefined }),
        enabled: categoryId != null,
      },
    }
  );

  const related = products?.filter((p) => p.id !== currentProductId).slice(0, 4) ?? [];

  if (!categoryId || (!isLoading && related.length === 0)) return null;

  return (
    <div className="border-t border-zinc-900 mt-16 pt-12">
      <p className="text-[10px] uppercase tracking-widest text-[#D4AF37] mb-1">From the same collection</p>
      <h3 className="text-xl font-light text-zinc-100 uppercase tracking-wide mb-8">You may also like</h3>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <Skeleton className="w-full aspect-[4/5] bg-zinc-900" />
              <Skeleton className="h-3 w-1/2 bg-zinc-900" />
              <Skeleton className="h-3 w-2/3 bg-zinc-900" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-10">
          {related.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
