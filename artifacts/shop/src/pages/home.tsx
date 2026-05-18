import { useState } from "react";
import { Search, RefreshCw, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { RootLayout } from "@/components/layout/RootLayout";
import { ProductCard } from "@/components/ProductCard";
import { useListProducts, getListProductsQueryKey, useListCategories, getListCategoriesQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@workspace/api-client-react";

function FeaturedCard({ product, size }: { product: Product; size: "large" | "small" }) {
  const { addItem } = useCart();
  const { toast } = useToast();
  const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!product.inStock) return;
    addItem(product, 1);
    toast({ title: "Added to bag", description: `${product.name} added.`, duration: 2000 });
  };

  return (
    <Link href={`/product/${product.id}`}>
      <div className={`group relative overflow-hidden bg-zinc-900 border border-zinc-900 hover:border-[#D4AF37]/40 transition-colors duration-500 cursor-pointer ${size === "large" ? "h-[420px] md:h-[480px]" : "h-[280px]"}`}>
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-700 ease-out"
          />
        ) : (
          <div className="absolute inset-0 bg-zinc-900" />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />

        {/* Sale badge */}
        {product.originalPrice && product.originalPrice > product.price && (
          <div className="absolute top-4 right-4 px-2.5 py-1 bg-black/80 border border-[#D4AF37]/40 text-[10px] uppercase tracking-widest text-[#D4AF37]">
            Sale
          </div>
        )}

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
          {product.categoryName && (
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">{product.categoryName}</p>
          )}
          <h3 className={`font-light text-white uppercase tracking-wide group-hover:text-[#D4AF37] transition-colors mb-3 ${size === "large" ? "text-xl md:text-2xl" : "text-base"}`}>
            {product.name}
          </h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[#D4AF37] font-medium">{formatter.format(product.price)}</span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-zinc-600 line-through text-sm">{formatter.format(product.originalPrice)}</span>
              )}
            </div>
            {product.inStock && (
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-[#D4AF37] text-black text-[10px] uppercase tracking-widest font-medium hover:bg-white transition-colors opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300"
              >
                Add to Bag
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

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

  const { data: allProducts } = useListProducts(
    {},
    { query: { queryKey: getListProductsQueryKey({}) } }
  );

  const featuredProducts = allProducts?.filter((p) => p.isFeatured && p.inStock) ?? [];
  const showFeatured = featuredProducts.length > 0 && !search && !selectedCategory;

  const searchBar = (
    <div className="relative w-full group">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-[#D4AF37] transition-colors pointer-events-none" />
      <input
        type="search"
        placeholder="Search collection..."
        className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-full text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-all"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>
  );

  return (
    <RootLayout searchBar={searchBar}>
      {/* Mobile search bar */}
      <div className="md:hidden px-4 pt-4 pb-2 bg-[#0a0a0a] border-b border-zinc-900">
        {searchBar}
      </div>

      {/* Featured spotlight section */}
      {showFeatured && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-10 pb-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-light text-white tracking-wide mb-1">Featured</h2>
              <p className="text-xs uppercase tracking-widest text-zinc-600">Handpicked for you</p>
            </div>
            <button
              onClick={() => {}}
              className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-zinc-600 hover:text-[#D4AF37] transition-colors"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {featuredProducts.length === 1 && (
            <FeaturedCard product={featuredProducts[0]} size="large" />
          )}

          {featuredProducts.length === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {featuredProducts.map((p) => (
                <FeaturedCard key={p.id} product={p} size="large" />
              ))}
            </div>
          )}

          {featuredProducts.length >= 3 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FeaturedCard product={featuredProducts[0]} size="large" />
              <div className="grid grid-rows-2 gap-4">
                <FeaturedCard product={featuredProducts[1]} size="small" />
                <FeaturedCard product={featuredProducts[2]} size="small" />
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="mt-10 border-t border-zinc-900" />
        </div>
      )}

      {/* Main content */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        {/* Section header + categories in one row on desktop */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div>
            <h2 className="text-2xl font-light text-white tracking-wide mb-1">Curated Selection</h2>
            <p className="text-xs uppercase tracking-widest text-zinc-600">Exclusive pieces for the discerning</p>
          </div>

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
                categories?.map((category) => (
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
                  </button>
                ))
              )}
            </div>
            <ScrollBar orientation="horizontal" className="invisible" />
          </ScrollArea>
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
                ? `We couldn't find any products matching "${search}"`
                : "There are no products in this category yet."}
            </p>
            {(search || selectedCategory) && (
              <button
                onClick={() => { setSearch(""); setSelectedCategory(undefined); }}
                className="mt-8 text-[#D4AF37] text-xs uppercase tracking-widest hover:text-white transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {products?.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </RootLayout>
  );
}
