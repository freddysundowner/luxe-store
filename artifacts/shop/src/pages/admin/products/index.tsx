import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListAdminProducts, getListAdminProductsQueryKey, useDeleteProduct, useUpdateProduct, useGetSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Plus, Edit, Trash2, Search, Package, Check, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useState } from "react";
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

export default function AdminProducts() {
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
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

  const startEditStock = (id: number, current: number) => {
    setEditingStockId(id);
    setStockDraft(String(current));
  };

  const saveStock = (product: { id: number; name: string; description?: string | null; price: number; originalPrice?: number | null; categoryId?: number | null; imageUrl?: string | null; inStock: boolean; isActive: boolean; isDropship: boolean; isFeatured: boolean; availabilityTag?: string | null; }) => {
    const trimmed = stockDraft.trim();
    const n = Number(trimmed);
    if (trimmed === "" || !Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      toast({ variant: "destructive", title: "Enter a whole number 0 or greater" });
      return;
    }
    const stockQuantity = n;
    if (product.categoryId == null) {
      toast({ variant: "destructive", title: "Set a category on this product first (open the product to edit)." });
      return;
    }
    const data: Record<string, unknown> = {
      name: product.name,
      price: product.price,
      categoryId: product.categoryId,
      inStock: stockQuantity > 0,
      isActive: product.isActive,
      isDropship: product.isDropship,
      isFeatured: product.isFeatured,
      stockQuantity,
      originalPrice: product.originalPrice ?? null,
      availabilityTag: product.availabilityTag ?? null,
    };
    if (product.description) data.description = product.description;
    if (product.imageUrl) data.imageUrl = product.imageUrl;
    updateMutation.mutate({ id: product.id, data: data as never });
  };

  const handleDelete = (id: number) => setDeleteId(id);

  const filteredProducts = products?.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.categoryName && p.categoryName.toLowerCase().includes(search.toLowerCase()))
  ) || [];

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
                  <TableHead className="w-16">Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="w-10 h-10 rounded bg-muted overflow-hidden">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-5 h-5 text-muted-foreground m-2.5" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.categoryName || "Uncategorized"}</TableCell>
                    <TableCell>{currencySymbol} {Number(product.price).toFixed(2)}</TableCell>
                    <TableCell>
                      {editingStockId === product.id ? (
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
