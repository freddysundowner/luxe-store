import { useParams } from "wouter";
import { useState } from "react";
import { RootLayout } from "@/components/layout/RootLayout";
import { useListProducts, getListProductsQueryKey, useGetCategory, getGetCategoryQueryKey } from "@workspace/api-client-react";
import { ProductCard } from "@/components/ProductCard";
import { Search, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function CategoryPage() {
  const { id } = useParams();
  const categoryId = parseInt(id || "0", 10);
  const [search, setSearch] = useState("");

  const { data: category } = useGetCategory(categoryId, {
    query: { queryKey: getGetCategoryQueryKey(categoryId), enabled: !!categoryId }
  });

  const { data: products, isLoading, isError, refetch } = useListProducts(
    { categoryId, search: search || undefined },
    { query: { queryKey: getListProductsQueryKey({ categoryId, search: search || undefined }) } }
  );

  return (
    <RootLayout title={category?.name || "Category"} showBack>
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={`Search in ${category?.name || "category"}...`}
              className="w-full pl-9 bg-muted/50 border-transparent focus-visible:ring-primary rounded-full h-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {category?.description && (
          <div className="mb-6 p-4 bg-muted/50 rounded-xl text-sm text-muted-foreground">
            {category.description}
          </div>
        )}

        {isError ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-destructive/10 text-destructive p-3 rounded-full mb-4">
              <RefreshCw className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Failed to load products</h3>
            <button
              onClick={() => refetch()}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm mt-2"
            >
              Retry
            </button>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2 bg-card border border-border rounded-lg p-2">
                <Skeleton className="w-full aspect-square rounded-md" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))}
          </div>
        ) : products?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="bg-muted p-4 rounded-full mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">No products found</h3>
            <p className="text-muted-foreground text-sm max-w-[250px]">
              {search
                ? `We couldn't find any products matching "${search}"`
                : "This category is currently empty."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {products?.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </RootLayout>
  );
}
