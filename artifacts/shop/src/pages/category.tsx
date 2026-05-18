import { useParams } from "wouter";
import { useState } from "react";
import { RootLayout } from "@/components/layout/RootLayout";
import { useListProducts, getListProductsQueryKey, useGetCategory, getGetCategoryQueryKey } from "@workspace/api-client-react";
import { ProductCard } from "@/components/ProductCard";
import { Search, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Helmet } from "react-helmet-async";

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

  const searchBar = (
    <div className="relative w-full group">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-[#D4AF37] transition-colors pointer-events-none" />
      <input
        type="search"
        placeholder={`Search ${category?.name ?? "collection"}...`}
        className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-full text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-all"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>
  );

  return (
    <RootLayout title={category?.name ?? "Category"} showBack searchBar={searchBar}>
      <Helmet>
        <title>{category ? `${category.name} — Luxe Store` : "Collection — Luxe Store"}</title>
        <meta name="description" content={`Shop ${category?.name ?? "luxury"} products at Luxe Store. Curated selection with M-Pesa & WhatsApp checkout. Fast delivery in Kenya.`} />
        <meta property="og:title" content={category ? `${category.name} — Luxe Store` : "Luxe Store Collection"} />
        <meta property="og:type" content="website" />
      </Helmet>
      {/* Mobile search */}
      <div className="md:hidden px-4 pt-4 pb-2 bg-[#0a0a0a] border-b border-zinc-900">
        {searchBar}
      </div>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        {category?.description && (
          <p className="text-xs uppercase tracking-widest text-zinc-600 mb-8 border-l-2 border-[#D4AF37]/40 pl-4">
            {category.description}
          </p>
        )}

        <div className="mb-8">
          <h2 className="text-2xl font-light text-white tracking-wide mb-1">{category?.name ?? "Collection"}</h2>
          <p className="text-xs uppercase tracking-widest text-zinc-600">
            {products ? `${products.length} piece${products.length !== 1 ? "s" : ""}` : "Loading..."}
          </p>
        </div>

        {isError ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-zinc-900 border border-zinc-800 p-3 mb-4 inline-flex">
              <RefreshCw className="h-6 w-6 text-zinc-500" />
            </div>
            <h3 className="font-light text-lg mb-2 text-zinc-200 uppercase tracking-wide">Failed to load</h3>
            <button
              onClick={() => refetch()}
              className="bg-[#D4AF37] text-black px-6 py-2.5 text-xs uppercase tracking-widest font-medium hover:bg-white transition-colors mt-4"
            >
              Retry
            </button>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3">
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
                ? `No results for "${search}"`
                : "This category is currently empty."}
            </p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="mt-8 text-[#D4AF37] text-xs uppercase tracking-widest hover:text-white transition-colors"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12 animate-in fade-in duration-500">
            {products?.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </RootLayout>
  );
}
