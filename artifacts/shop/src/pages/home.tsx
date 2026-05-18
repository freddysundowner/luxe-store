import { useState, useEffect, useRef } from "react";
import { Search, RefreshCw, Sparkles, X } from "lucide-react";
import { RootLayout } from "@/components/layout/RootLayout";
import { ProductCard } from "@/components/ProductCard";
import { useListProducts, getListProductsQueryKey, useListCategories, getListCategoriesQueryKey, Product } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export default function Home() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();

  const [aiMode, setAiMode] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [aiProducts, setAiProducts] = useState<Product[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: categories, isLoading: isLoadingCategories } = useListCategories({
    query: { queryKey: getListCategoriesQueryKey() }
  });

  const { data: products, isLoading: isLoadingProducts, isError, refetch } = useListProducts(
    { categoryId: selectedCategory, search: aiMode ? undefined : (search || undefined) },
    { query: { queryKey: getListProductsQueryKey({ categoryId: selectedCategory, search: aiMode ? undefined : (search || undefined) }) } }
  );

  const { data: allProducts } = useListProducts(
    {},
    { query: { queryKey: getListProductsQueryKey({}) } }
  );

  const runAiSearch = async (q: string) => {
    if (!q.trim()) { setAiProducts(null); return; }
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      setAiProducts(data.products ?? []);
    } catch {
      setAiProducts([]);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (!aiMode || !aiQuery.trim()) {
      setAiProducts(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runAiSearch(aiQuery), 700);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [aiQuery, aiMode]);

  const handleSearchChange = (value: string) => {
    if (aiMode) {
      setAiQuery(value);
    } else {
      setSearch(value);
    }
  };

  const currentSearchValue = aiMode ? aiQuery : search;

  const clearSearch = () => {
    setSearch("");
    setAiQuery("");
    setAiProducts(null);
  };

  const displayProducts: Product[] = aiMode && aiProducts !== null
    ? aiProducts
    : [...(products ?? [])].sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));

  const isLoading = aiMode ? aiLoading : isLoadingProducts;

  const searchBar = (
    <div className="relative w-full group flex items-center gap-2">
      <div className="relative flex-1">
        {aiMode
          ? <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D4AF37] pointer-events-none" />
          : <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-[#D4AF37] transition-colors pointer-events-none" />
        }
        <input
          type="search"
          placeholder={aiMode ? "e.g. gift for a tech lover under $30…" : "Search collection..."}
          className={`w-full pl-10 pr-8 py-2.5 bg-zinc-900/60 border rounded-full text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 transition-all ${
            aiMode
              ? "border-[#D4AF37]/40 focus:ring-[#D4AF37]/60 focus:border-[#D4AF37]/60"
              : "border-zinc-800 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
          }`}
          value={currentSearchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        {currentSearchValue && (
          <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {/* AI toggle */}
      <button
        onClick={() => { setAiMode(!aiMode); clearSearch(); }}
        title={aiMode ? "Switch to keyword search" : "Switch to AI smart search"}
        className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-[10px] uppercase tracking-widest border transition-all duration-300 ${
          aiMode
            ? "bg-[#D4AF37] text-black border-[#D4AF37] font-medium"
            : "bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-zinc-300"
        }`}
      >
        <Sparkles className="w-3 h-3" />
        <span className="hidden sm:inline">AI</span>
      </button>
    </div>
  );

  return (
    <RootLayout searchBar={searchBar}>
      {/* Mobile search bar */}
      <div className="md:hidden px-4 pt-4 pb-2 bg-[#0a0a0a] border-b border-zinc-900">
        {searchBar}
      </div>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">

        {/* Section header + categories */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div>
            {aiMode && aiQuery ? (
              <>
                <h2 className="text-2xl font-light text-white tracking-wide mb-1 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                  AI Results
                </h2>
                <p className="text-xs uppercase tracking-widest text-zinc-600">Smart search for "{aiQuery}"</p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-light text-white tracking-wide mb-1">Curated Selection</h2>
                <p className="text-xs uppercase tracking-widest text-zinc-600">Exclusive pieces for the discerning</p>
              </>
            )}
          </div>

          {/* Category filters — hidden during AI search */}
          {!(aiMode && aiQuery) && (
            <ScrollArea className="w-full md:w-auto whitespace-nowrap">
              <div className="flex w-max space-x-2">
                <button
                  onClick={() => setSelectedCategory(undefined)}
                  className={`px-5 py-2 text-xs uppercase tracking-widest rounded-full transition-all duration-300 ${
                    selectedCategory === undefined
                      ? "bg-[#D4AF37] text-black font-medium"
                      : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800"
                  }`}
                >
                  All
                </button>
                {isLoadingCategories ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-24 rounded-full bg-zinc-900" />
                  ))
                ) : (
                  categories?.map((category) => {
                    const count = allProducts?.filter((p) => p.categoryId === category.id).length ?? 0;
                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`px-5 py-2 text-xs uppercase tracking-widest rounded-full transition-all duration-300 ${
                          selectedCategory === category.id
                            ? "bg-[#D4AF37] text-black font-medium"
                            : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800"
                        }`}
                      >
                        {category.name}
                        {count > 0 && (
                          <span className="ml-1.5 text-[9px] opacity-60">({count})</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
              <ScrollBar orientation="horizontal" className="invisible" />
            </ScrollArea>
          )}
        </div>

        {/* Product grid */}
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
        ) : isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
            {Array.from({ length: aiMode ? 4 : 8 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3">
                <Skeleton className="w-full aspect-[4/5] bg-zinc-900" />
                <Skeleton className="h-3 w-1/2 bg-zinc-900" />
                <Skeleton className="h-3 w-2/3 bg-zinc-900" />
              </div>
            ))}
          </div>
        ) : displayProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4">
            <div className="bg-zinc-900 border border-zinc-800 p-4 mb-6 inline-flex">
              {aiMode ? <Sparkles className="h-8 w-8 text-zinc-700" /> : <Search className="h-8 w-8 text-zinc-700" />}
            </div>
            <h3 className="font-light text-lg mb-2 text-zinc-200 uppercase tracking-wide">No products found</h3>
            <p className="text-zinc-600 text-sm max-w-[260px]">
              {aiMode
                ? `No matches for "${aiQuery}". Try different keywords or describe the recipient.`
                : search
                  ? `We couldn't find any products matching "${search}"`
                  : "There are no products in this category yet."}
            </p>
            {(search || selectedCategory || (aiMode && aiQuery)) && (
              <button
                onClick={() => { clearSearch(); setSelectedCategory(undefined); }}
                className="mt-8 text-[#D4AF37] text-xs uppercase tracking-widest hover:text-white transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {displayProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </RootLayout>
  );
}
