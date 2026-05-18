import { useState } from "react";
import { Search, RefreshCw } from "lucide-react";
import { RootLayout } from "@/components/layout/RootLayout";
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
      {/* Search + category bar */}
      <div className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="relative max-w-2xl group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-[#D4AF37] transition-colors" />
              <input
                type="search"
                placeholder="Search collection..."
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-full text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="w-full whitespace-nowrap border-t border-zinc-900/60">
            <div className="flex w-max space-x-2 py-3">
              <button
                onClick={() => setSelectedCategory(undefined)}
                className={`px-5 py-1.5 text-xs uppercase tracking-widest rounded-full transition-all duration-300 ${
                  selectedCategory === undefined
                    ? "bg-[#D4AF37] text-black font-medium"
                    : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800"
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
                    className={`px-5 py-1.5 text-xs uppercase tracking-widest rounded-full transition-all duration-300 ${
                      selectedCategory === category.id
                        ? "bg-[#D4AF37] text-black font-medium"
                        : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800"
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

      {/* Main content */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        {/* Section header */}
        <div className="mb-10">
          <h2 className="text-2xl font-light text-white tracking-wide mb-1">Curated Selection</h2>
          <p className="text-xs uppercase tracking-widest text-zinc-600">Exclusive pieces for the discerning</p>
        </div>

        {isError ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-zinc-900 border border-zinc-800 p-3 mb-4 inline-flex">
              <RefreshCw className="h-6 w-6 text-zinc-500" />
            </div>
            <h3 className="font-light text-lg mb-1 text-zinc-200 uppercase tracking-wide">Failed to load products</h3>
            <p className="text-zinc-600 mb-6 text-sm">Please try again.</p>
            <button
              onClick={() => refetch()}
              className="bg-[#D4AF37] text-black px-6 py-2.5 text-xs uppercase tracking-widest font-medium hover:bg-white transition-colors"
            >
              Retry
            </button>
          </div>
        ) : isLoadingProducts ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-5 gap-y-10">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="w-full aspect-[4/5] bg-zinc-900" />
                <Skeleton className="h-3 w-1/2 bg-zinc-900" />
                <Skeleton className="h-3 w-2/3 bg-zinc-900" />
              </div>
            ))}
          </div>
        ) : products?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4">
            <div className="bg-zinc-900 border border-zinc-800 p-4 mb-6 inline-flex">
              <Search className="h-8 w-8 text-zinc-700" />
            </div>
            <h3 className="font-light text-lg mb-2 text-zinc-200 uppercase tracking-wide">No products found</h3>
            <p className="text-zinc-600 text-sm max-w-[260px]">
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
                className="mt-8 text-[#D4AF37] text-xs uppercase tracking-widest hover:text-white transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-5 gap-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {products?.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </RootLayout>
  );
}
