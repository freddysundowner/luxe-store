import { AdminLayout } from "@/components/layout/AdminLayout";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute, Link } from "wouter";
import {
  useListAdminProducts,
  getListAdminProductsQueryKey,
  useListAdminHampers,
  getListAdminHampersQueryKey,
  useCreateHamper,
  useUpdateHamper,
  Product,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, Plus, ArrowLeft, Gift } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";

interface ItemDraft {
  productId: number;
  quantity: number;
}

export default function AdminHamperForm() {
  const [, params] = useRoute<{ id: string }>("/admin/hampers/:id/edit");
  const id = params ? Number(params.id) : null;
  const isEdit = id !== null && Number.isFinite(id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products } = useListAdminProducts({
    query: { queryKey: getListAdminProductsQueryKey() },
  });
  const { data: hampers } = useListAdminHampers({
    query: { queryKey: getListAdminHampersQueryKey(), enabled: isEdit },
  });

  const productById = useMemo(() => {
    const map = new Map<number, Product>();
    (products ?? []).forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [price, setPrice] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [items, setItems] = useState<ItemDraft[]>([]);
  const [pickerProductId, setPickerProductId] = useState<string>("");

  // Hydrate from existing hamper when editing.
  useEffect(() => {
    if (!isEdit || !hampers) return;
    const h = hampers.find((x) => x.id === id);
    if (!h) return;
    setName(h.name);
    setDescription(h.description ?? "");
    setImageUrl(h.imageUrl ?? "");
    setPrice(String(h.price));
    setIsActive(h.isActive);
    setIsFeatured(h.isFeatured);
    setItems(h.items.map((i) => ({ productId: i.productId, quantity: i.quantity })));
  }, [isEdit, id, hampers]);

  const sumOfItems = items.reduce((s, i) => {
    const p = productById.get(i.productId);
    return s + (p ? p.price * i.quantity : 0);
  }, 0);

  // Auto-suggest a price when user hasn't typed one yet.
  useEffect(() => {
    if (!isEdit && price === "" && sumOfItems > 0) {
      setPrice(sumOfItems.toFixed(2));
    }
  }, [sumOfItems, price, isEdit]);

  const addProductToHamper = () => {
    const pid = Number(pickerProductId);
    if (!Number.isFinite(pid) || pid <= 0) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === pid);
      if (existing) return prev.map((i) => (i.productId === pid ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { productId: pid, quantity: 1 }];
    });
    setPickerProductId("");
  };

  const updateQty = (productId: number, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)));
  };

  const removeItem = (productId: number) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const createMutation = useCreateHamper({
    mutation: {
      onSuccess: () => {
        toast({ title: "Hamper created" });
        queryClient.invalidateQueries({ queryKey: getListAdminHampersQueryKey() });
        setLocation("/admin/hampers");
      },
      onError: (e: unknown) => {
        // ApiError exposes the parsed body directly on `.data` (see customFetch).
        const msg = (e as { data?: { error?: string }; message?: string })?.data?.error
          ?? (e as { message?: string })?.message;
        toast({ variant: "destructive", title: msg || "Failed to create hamper" });
      },
    },
  });

  const updateMutation = useUpdateHamper({
    mutation: {
      onSuccess: () => {
        toast({ title: "Hamper saved" });
        queryClient.invalidateQueries({ queryKey: getListAdminHampersQueryKey() });
        setLocation("/admin/hampers");
      },
      onError: (e: unknown) => {
        const msg = (e as { data?: { error?: string }; message?: string })?.data?.error
          ?? (e as { message?: string })?.message;
        toast({ variant: "destructive", title: msg || "Failed to save hamper" });
      },
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = Number(price);
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Name is required" });
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      toast({ variant: "destructive", title: "Enter a valid price" });
      return;
    }
    if (items.length === 0) {
      toast({ variant: "destructive", title: "Add at least one product to the hamper" });
      return;
    }
    const body = {
      name: name.trim(),
      description: description.trim() || null,
      imageUrl: imageUrl.trim() || null,
      price: priceNum,
      items,
      isActive,
      isFeatured,
    };
    if (isEdit && id !== null) {
      updateMutation.mutate({ id, data: body });
    } else {
      createMutation.mutate({ data: body });
    }
  };

  const saving = createMutation.isPending || updateMutation.isPending;
  const availableProducts = (products ?? []).filter((p) => !items.some((i) => i.productId === p.id));

  return (
    <AdminLayout title={isEdit ? "Edit Hamper" : "New Hamper"}>
      <Link href="/admin/hampers">
        <Button variant="ghost" size="sm" className="mb-4 gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to hampers
        </Button>
      </Link>

      <form onSubmit={submit} className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 space-y-4">
            <div>
              <Label htmlFor="name">Hamper name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mum's Birthday Box" required />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A curated bundle for the woman who has it all..."
                rows={3}
              />
            </div>
            <ImageUpload
              value={imageUrl}
              onChange={setImageUrl}
              label="Cover image (optional — we'll collage product photos if blank)"
            />
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Gift className="w-4 h-4" /> Hamper contents
              </h3>
              <span className="text-sm text-muted-foreground">{items.length} unique products · {items.reduce((s, i) => s + i.quantity, 0)} items</span>
            </div>

            <div className="flex gap-2">
              <select
                value={pickerProductId}
                onChange={(e) => setPickerProductId(e.target.value)}
                className="flex-1 border border-input bg-background rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select a product to add…</option>
                {availableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.price.toFixed(2)}
                  </option>
                ))}
              </select>
              <Button type="button" onClick={addProductToHamper} disabled={!pickerProductId} className="gap-1">
                <Plus className="w-4 h-4" /> Add
              </Button>
            </div>

            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No products yet. Add at least one product above.</p>
            ) : (
              <div className="divide-y divide-border border border-border rounded-md">
                {items.map((it) => {
                  const p = productById.get(it.productId);
                  return (
                    <div key={it.productId} className="flex items-center gap-3 p-3">
                      <div className="w-10 h-10 rounded bg-muted overflow-hidden shrink-0">
                        {p?.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                        ) : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{p?.name ?? `Product #${it.productId}`}</p>
                        <p className="text-xs text-muted-foreground">{p ? p.price.toFixed(2) : "—"} each</p>
                      </div>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        value={it.quantity}
                        onChange={(e) => updateQty(it.productId, Number(e.target.value))}
                        className="w-20 h-9"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeItem(it.productId)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <div>
              <Label htmlFor="price">Hamper price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Items sum to {sumOfItems.toFixed(2)}. You can charge less (discount) or more (gift wrap markup).
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="isActive">Active</Label>
                <p className="text-xs text-muted-foreground">Shown to customers and AI</p>
              </div>
              <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="isFeatured">Featured</Label>
                <p className="text-xs text-muted-foreground">Promoted in concierge replies</p>
              </div>
              <Switch id="isFeatured" checked={isFeatured} onCheckedChange={setIsFeatured} />
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create hamper"}
            </Button>
          </Card>
        </div>
      </form>
    </AdminLayout>
  );
}
