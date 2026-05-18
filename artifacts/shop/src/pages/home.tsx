import { useState } from "react";
import { Search, RefreshCw } from "lucide-react";
import { RootLayout } from "@/components/layout/RootLayout";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/ProductCard";
import { useListProducts, getListProductsQueryKey, useListCategories, getListCategoriesQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export default function Home() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();

  const { data: categories, isLoading: isLoadingCategories } = useListCategories({
    query: { queryKey: getListCategoriesQueryKey() }
  });

  const { data: products, isLoading: isLoadingProducts, isError, refetch } = useListProducts(
    { categoryId: selectedCategory, search: search || undefined },
    { query: { queryKey: getListProductsQueryKey({ categoryId: selectedCategory, search: search || undefined }) } }
  );

  return (
    <RootLayout>
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-3">
            <div className="relative max-w-2xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search products..."
                className="w-full pl-9 bg-muted/50 border-transparent focus-visible:ring-primary rounded-full h-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="w-full whitespace-nowrap border-t border-border/40">
            <div className="flex w-max space-x-2 py-3">
              <button
                onClick={() => setSelectedCategory(undefined)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === undefined
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                All
              </button>
              {isLoadingCategories ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-20 rounded-full" />
                ))
              ) : (
                categories?.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      selectedCategory === category.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {category.name}
                  </button>
                ))
              )}
            </div>
            <ScrollBar orientation="horizontal" className="invisible" />
          </ScrollArea>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {isError ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-destructive/10 text-destructive p-3 rounded-full mb-4">
              <RefreshCw className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Failed to load products</h3>
            <p className="text-muted-foreground mb-4 text-sm">Please try again.</p>
            <button
              onClick={() => refetch()}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm"
            >
              Retry
            </button>
          </div>
        ) : isLoadingProducts ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
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
                : "There are no products in this category yet."}
            </p>
            {(search || selectedCategory) && (
              <button
                onClick={() => {
                  setSearch("");
                  setSelectedCategory(undefined);
                }}
                className="mt-6 text-primary font-medium hover:underline text-sm"
              >
                Clear filters
              </button>
            )}
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
