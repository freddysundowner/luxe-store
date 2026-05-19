import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListAdminProducts, getListAdminProductsQueryKey, useDeleteProduct, useUpdateProduct, useGetSettings, getGetSettingsQueryKey, type Product } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Plus, Edit, Trash2, Search, Package, Check, X, Star, StarOff, Eye, EyeOff } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const TAG_COLORS: Record<string, { label: string; color: string }> = {
  new:         { label: "New Arrival",     color: "#D4AF37" },
  sale:        { label: "Sale",            color: "#ef4444" },
  hot:         { label: "Hot / Trending",  color: "#f97316" },
  bestseller:  { label: "Bestseller",      color: "#3b82f6" },
  limited:     { label: "Limited Edition", color: "#8b5cf6" },
  coming_soon: { label: "Coming Soon",     color: "#71717a" },
};

// Build an UpdateProduct payload from a row + a small set of overrides. The
// API's update endpoint replaces the full record (name/price/categoryId are
// required) so we carry forward existing values and only swap the fields we
// want to change.
type BuildResult = { ok: true; data: Record<string, unknown> } | { ok: false; error: string };

function buildUpdatePayload(product: Product, overrides: { stockQuantity?: number; isActive?: boolean; isFeatured?: boolean }): BuildResult {
  if (product.categoryId == null) {
    return { ok: false, error: `"${product.name}" has no category — open the product to set one before bulk-editing.` };
  }
  const stockQuantity = overrides.stockQuantity ?? product.stockQuantity;
  const data: Record<string, unknown> = {
    name: product.name,
    price: product.price,
    categoryId: product.categoryId,
    stockQuantity,
    inStock: overrides.stockQuantity != null ? stockQuantity > 0 : product.inStock,
    isActive: overrides.isActive ?? product.isActive,
    isDropship: product.isDropship,
    isFeatured: overrides.isFeatured ?? product.isFeatured,
    originalPrice: product.originalPrice ?? null,
    availabilityTag: product.availabilityTag ?? null,
  };
  if (product.description) data.description = product.description;
  if (product.imageUrl) data.imageUrl = product.imageUrl;
  return { ok: true, data };
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "—";
  const diff = Date.now() - then;
  const min = 60_000, hr = 60 * min, day = 24 * hr;
  if (diff < min) return "just now";
  if (diff < hr) return `${Math.floor(diff / min)}m ago`;
  if (diff < day) return `${Math.floor(diff / hr)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function AdminProducts() {
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkQty, setBulkQty] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useListAdminProducts({
    query: { queryKey: getListAdminProductsQueryKey() }
  });

  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const currencySymbol = settings?.currencySymbol || "KSh";

  const deleteMutation = useDeleteProduct({
    mutation: {
      onSuccess: () => {
        toast({ title: "Product deleted" });
        queryClient.invalidateQueries({ queryKey: getListAdminProductsQueryKey() });
      },
      onError: () => {
        toast({ variant: "destructive", title: "Failed to delete product" });
      }
    }
  });

  const [editingStockId, setEditingStockId] = useState<number | null>(null);
  const [stockDraft, setStockDraft] = useState<string>("");

  const updateMutation = useUpdateProduct({
    mutation: {
      onSuccess: () => {
        toast({ title: "Stock updated" });
        queryClient.invalidateQueries({ queryKey: getListAdminProductsQueryKey() });
        setEditingStockId(null);
      },
      onError: () => {
        toast({ variant: "destructive", title: "Failed to update stock" });
      },
    },
  });

  // Bare mutation hook so bulk updates don't trigger the per-row success toast
  // for every product (we surface a single summary toast at the end instead).
  const bulkUpdateMutation = useUpdateProduct({ mutation: {} });

  const startEditStock = (id: number, current: number) => {
    setEditingStockId(id);
    setStockDraft(String(current));
  };

  const saveStock = (product: Product) => {
    const trimmed = stockDraft.trim();
    const n = Number(trimmed);
    if (trimmed === "" || !Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      toast({ variant: "destructive", title: "Enter a whole number 0 or greater" });
      return;
    }
    const payload = buildUpdatePayload(product, { stockQuantity: n });
    if (!payload.ok) {
      toast({ variant: "destructive", title: payload.error });
      return;
    }
    updateMutation.mutate({ id: product.id, data: payload.data as never });
  };

  const handleDelete = (id: number) => setDeleteId(id);

  // Server returns admin products already sorted by updatedAt desc, so we
  // just apply the search filter here.
  const filteredProducts: Product[] = useMemo(() => {
    if (!products) return [];
    const q = search.toLowerCase().trim();
    if (!q) return products;
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.categoryName && p.categoryName.toLowerCase().includes(q))
    );
  }, [products, search]);

  const visibleIds = useMemo(() => filteredProducts.map(p => p.id), [filteredProducts]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));
  const someVisibleSelected = !allVisibleSelected && visibleIds.some(id => selectedIds.has(id));
  // Bulk actions target every selected row, even ones hidden by the current
  // search filter, so a selection made before searching isn't silently dropped.
  const selectedProducts = useMemo(
    () => (products ?? []).filter(p => selectedIds.has(p.id)),
    [products, selectedIds],
  );

  const toggleOne = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const runBulk = async (overrides: { stockQuantity?: number; isActive?: boolean; isFeatured?: boolean }, label: string) => {
    // Re-entrancy guard: a rapid double-click on a bulk button would otherwise
    // kick off two overlapping update loops sharing the same selection.
    if (bulkBusy) return;
    // Stock quantity has no meaning on bundle products (bundle stock is
    // computed from component availability on the server). Drop them from
    // the target set with a clear note rather than silently writing 0s.
    let targets = selectedProducts;
    const skippedBundles: string[] = [];
    if (overrides.stockQuantity != null) {
      targets = targets.filter(p => {
        if (p.kind === "bundle") { skippedBundles.push(p.name); return false; }
        return true;
      });
    }
    if (targets.length === 0) {
      if (skippedBundles.length > 0) {
        toast({ variant: "destructive", title: "Stock can't be set on bundles", description: `Skipped: ${skippedBundles.slice(0, 3).join(", ")}` });
      }
      return;
    }
    setBulkBusy(true);
    let ok = 0;
    const failures: string[] = skippedBundles.map(n => `"${n}" is a bundle (stock skipped)`);
    for (const p of targets) {
      const payload = buildUpdatePayload(p, overrides);
      if (!payload.ok) { failures.push(payload.error); continue; }
      try {
        await bulkUpdateMutation.mutateAsync({ id: p.id, data: payload.data as never });
        ok++;
      } catch {
        failures.push(`"${p.name}" failed to update`);
      }
    }
    await queryClient.invalidateQueries({ queryKey: getListAdminProductsQueryKey() });
    setBulkBusy(false);
    if (failures.length === 0) {
      toast({ title: `${label}: ${ok} product${ok === 1 ? "" : "s"} updated` });
      clearSelection();
    } else {
      toast({
        variant: "destructive",
        title: `${label}: ${ok} updated, ${failures.length} failed`,
        description: failures.slice(0, 3).join(" • "),
      });
    }
  };

  const applyBulkQty = () => {
    const trimmed = bulkQty.trim();
    const n = Number(trimmed);
    if (trimmed === "" || !Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      toast({ variant: "destructive", title: "Enter a whole number 0 or greater" });
      return;
    }
    void runBulk({ stockQuantity: n }, `Set stock to ${n}`);
    setBulkQty("");
  };

  return (
    <AdminLayout title="Products">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Link href="/admin/products/new">
          <Button className="w-full sm:w-auto gap-2">
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </Link>
      </div>

      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-10 bg-card border border-border rounded-xl shadow-sm p-3 mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium px-2">
            {selectedIds.size} selected
          </span>
          <div className="h-5 w-px bg-border mx-1" />

          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={0}
              step={1}
              value={bulkQty}
              onChange={(e) => setBulkQty(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") applyBulkQty(); }}
              placeholder="Set qty"
              className="h-8 w-24"
              disabled={bulkBusy}
            />
            <Button size="sm" variant="outline" onClick={applyBulkQty} disabled={bulkBusy || bulkQty.trim() === ""}>
              Apply
            </Button>
          </div>

          <div className="h-5 w-px bg-border mx-1" />

          <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => void runBulk({ isActive: true }, "Set active")}>
            <Eye className="w-4 h-4 mr-1" /> Activate
          </Button>
          <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => void runBulk({ isActive: false }, "Set draft")}>
            <EyeOff className="w-4 h-4 mr-1" /> Draft
          </Button>

          <div className="h-5 w-px bg-border mx-1" />

          <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => void runBulk({ isFeatured: true }, "Featured on")}>
            <Star className="w-4 h-4 mr-1" /> Feature
          </Button>
          <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => void runBulk({ isFeatured: false }, "Featured off")}>
            <StarOff className="w-4 h-4 mr-1" /> Unfeature
          </Button>

          <div className="ml-auto">
            <Button size="sm" variant="ghost" onClick={clearSelection} disabled={bulkBusy}>
              Clear
            </Button>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading products...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">No products found</h3>
            <p className="text-muted-foreground mb-4">Add some products to your catalog.</p>
            <Link href="/admin/products/new">
              <Button variant="outline">Create Product</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all visible products"
                      className="h-4 w-4 cursor-pointer accent-primary"
                      checked={allVisibleSelected}
                      ref={(el) => { if (el) el.indeterminate = someVisibleSelected; }}
                      onChange={toggleAllVisible}
                    />
                  </TableHead>
                  <TableHead className="w-16">Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id} data-state={selectedIds.has(product.id) ? "selected" : undefined}>
                    <TableCell>
                      <input
                        type="checkbox"
                        aria-label={`Select ${product.name}`}
                        className="h-4 w-4 cursor-pointer accent-primary"
                        checked={selectedIds.has(product.id)}
                        onChange={() => toggleOne(product.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="w-10 h-10 rounded bg-muted overflow-hidden">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-5 h-5 text-muted-foreground m-2.5" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {product.name}
                        {product.isFeatured && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                      </div>
                    </TableCell>
                    <TableCell>{product.categoryName || "Uncategorized"}</TableCell>
                    <TableCell>{currencySymbol} {Number(product.price).toFixed(2)}</TableCell>
                    <TableCell>
                      {product.kind === "bundle" ? (
                        <span className="text-xs text-muted-foreground">bundle</span>
                      ) : editingStockId === product.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={stockDraft}
                            onChange={(e) => setStockDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveStock(product);
                              if (e.key === "Escape") setEditingStockId(null);
                            }}
                            placeholder="0"
                            className="h-8 w-20"
                            autoFocus
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => saveStock(product)}
                            disabled={updateMutation.isPending}
                          >
                            <Check className="w-4 h-4 text-emerald-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setEditingStockId(null)}
                          >
                            <X className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditStock(product.id, product.stockQuantity)}
                          className="text-left hover:underline text-sm"
                          title="Click to edit stock"
                        >
                          {product.stockQuantity === 0 ? (
                            <span className="text-destructive font-medium">0</span>
                          ) : product.stockQuantity <= 5 ? (
                            <span className="text-amber-600 font-medium">{product.stockQuantity}</span>
                          ) : (
                            <span>{product.stockQuantity}</span>
                          )}
                        </button>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {product.isActive ? (
                          <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Draft</Badge>
                        )}
                        {!product.inStock && (
                          <Badge variant="destructive">Out of Stock</Badge>
                        )}
                        {product.availabilityTag && (
                          <Badge
                            variant="outline"
                            style={{
                              borderColor: TAG_COLORS[product.availabilityTag]?.color ?? "#71717a",
                              color: TAG_COLORS[product.availabilityTag]?.color ?? "#71717a",
                            }}
                          >
                            {TAG_COLORS[product.availabilityTag]?.label ?? product.availabilityTag}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap" title={product.updatedAt ?? undefined}>
                      {formatRelative(product.updatedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/products/${product.id}/edit`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(product.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Delete product?"
        description="This action cannot be undone. The product will be permanently removed from your catalog."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => { if (deleteId !== null) deleteMutation.mutate({ id: deleteId }); }}
      />
    </AdminLayout>
  );
}
