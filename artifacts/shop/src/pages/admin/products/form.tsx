import { AdminLayout } from "@/components/layout/AdminLayout";
import { useLocation, useParams } from "wouter";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiImageUpload } from "@/components/MultiImageUpload";
import {
  useCreateProduct, useUpdateProduct, useGetProduct,
  getGetProductQueryKey, useListCategories, getListCategoriesQueryKey,
  useListAvailabilityTagsPublic, getListAvailabilityTagsPublicQueryKey,
  getListProductsQueryKey,
  useListAdminProducts, getListAdminProductsQueryKey,
  Product,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2, Gift } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";


const variantSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Variant name is required"),
  price: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().min(0, "Price must be 0 or more").nullable()
  ),
  stockQuantity: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? 0 : Number(v)),
    z.number().int().min(0, "Stock must be 0 or more")
  ),
  isActive: z.boolean().default(true),
});

const imageDisplaySettingsSchema = z.object({
  fit: z.enum(["cover", "contain"]),
  focalX: z.number().min(0).max(100),
  focalY: z.number().min(0).max(100),
});

const bundleItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1),
});

const productSchema = z.object({
  kind: z.enum(["simple", "bundle"]).default("simple"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be positive"),
  originalPrice: z.coerce.number().optional().nullable(),
  // Category is required for every product (simple and bundle alike). The
  // server's ProductInput contract requires it, and the admin list's bulk
  // actions skip rows without a category — leaving bundles uncategorised
  // makes them effectively un-manageable from the list view.
  categoryId: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number({ required_error: "Category is required" }).int().positive()
  ),
  images: z.array(z.string()).default([]),
  imageSettings: z.record(z.string(), imageDisplaySettingsSchema).default({}),
  inStock: z.boolean().default(true),
  stockQuantity: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? 0 : Number(v)),
    z.number().int().min(0, "Stock must be 0 or more")
  ),
  isActive: z.boolean().default(true),
  isDropship: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  availabilityTag: z.string().optional().nullable(),
  variants: z.array(variantSchema).default([]),
  bundleItems: z.array(bundleItemSchema).default([]),
}).superRefine((val, ctx) => {
  // categoryId is already enforced by the base schema for every kind. Only
  // bundle-specific item validation remains.
  if (val.kind === "bundle" && val.bundleItems.length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Add at least one product to the bundle", path: ["bundleItems"] });
  }
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function ProductForm() {
  const [, setLocation] = useLocation();
  const { id } = useParams();
  const isEditing = !!id;
  const productId = parseInt(id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: product, isLoading: isProductLoading } = useGetProduct(productId, {
    query: { queryKey: getGetProductQueryKey(productId), enabled: isEditing }
  });

  const { data: categories } = useListCategories({
    query: { queryKey: getListCategoriesQueryKey() }
  });

  const { data: availabilityTags } = useListAvailabilityTagsPublic({
    query: { queryKey: getListAvailabilityTagsPublicQueryKey() }
  });

  // Pull the full admin product list so bundles can reference any product
  // (including inactive ones — the admin may want to bundle something they
  // hide from the main feed).
  const { data: allProducts } = useListAdminProducts({
    query: { queryKey: getListAdminProductsQueryKey() }
  });

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      kind: "simple",
      name: "",
      description: "",
      price: 0,
      originalPrice: null,
      categoryId: undefined,
      images: [],
      imageSettings: {},
      inStock: true,
      stockQuantity: 0,
      isActive: true,
      isDropship: false,
      isFeatured: false,
      availabilityTag: null,
      variants: [],
      bundleItems: [],
    },
  });

  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  const kind = form.watch("kind");
  const bundleItems = form.watch("bundleItems");

  // Picker state for adding products to the bundle.
  const [pickerProductId, setPickerProductId] = useState<string>("");

  const productById = useMemo(() => {
    const map = new Map<number, Product>();
    (allProducts ?? []).forEach((p) => map.set(p.id, p));
    return map;
  }, [allProducts]);

  // Exclude bundles from the picker — we don't allow nested bundles (matches
  // the server-side guard in validateBundleItems). Also exclude items already
  // added and (when editing) the product itself.
  const availableForBundle = (allProducts ?? []).filter((p) =>
    p.kind !== "bundle" &&
    p.id !== (isEditing ? productId : -1) &&
    !bundleItems.some((it) => it.productId === p.id)
  );

  // Auto-suggest a bundle price = sum of items, only on create and only when
  // the price hasn't been touched yet (mirrors hamper-form behaviour).
  const bundleItemsSum = bundleItems.reduce((s, it) => {
    const p = productById.get(it.productId);
    return s + (p ? p.price * it.quantity : 0);
  }, 0);
  useEffect(() => {
    if (kind !== "bundle" || isEditing) return;
    const current = form.getValues("price");
    if (!current && bundleItemsSum > 0) {
      form.setValue("price", Number(bundleItemsSum.toFixed(2)));
    }
  }, [bundleItemsSum, kind, isEditing, form]);

  useEffect(() => {
    if (product && isEditing) {
      form.reset({
        kind: product.kind ?? "simple",
        name: product.name,
        description: product.description || "",
        price: product.price,
        originalPrice: product.originalPrice,
        categoryId: product.categoryId ?? undefined,
        images: product.images ?? (product.imageUrl ? [product.imageUrl] : []),
        imageSettings: product.imageSettings ?? {},
        inStock: product.inStock,
        stockQuantity: product.stockQuantity,
        isActive: product.isActive,
        isDropship: product.isDropship,
        isFeatured: product.isFeatured,
        availabilityTag: product.availabilityTag || null,
        variants: (product.variants ?? []).map((v) => ({
          id: v.id,
          name: v.name,
          price: v.price,
          stockQuantity: v.stockQuantity,
          isActive: v.isActive,
        })),
        bundleItems: (product.bundleItems ?? []).map((b) => ({
          productId: b.productId,
          quantity: b.quantity,
        })),
      });
    }
  }, [product, isEditing, form]);

  // After a successful create/update we have to invalidate every product
  // query the storefront might be holding in cache — otherwise the home
  // feed and product detail keep showing the stale single-image version.
  const invalidateProductCaches = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
    queryClient.invalidateQueries({ queryKey: getListProductsQueryKey({}) });
    queryClient.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "/api/products" });
    // Bundles surface through /api/hampers too — keep the legacy gift-finder
    // & admin-hampers pages in sync.
    queryClient.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && typeof q.queryKey[0] === "string" && q.queryKey[0].startsWith("/api/hampers") });
    if (isEditing) {
      queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(productId) });
    }
  };

  const createMutation = useCreateProduct({
    mutation: {
      onSuccess: () => {
        toast({ title: "Product created successfully" });
        invalidateProductCaches();
        setLocation("/admin/products");
      },
      onError: (e: unknown) => {
        const msg = (e as { data?: { error?: string }; message?: string })?.data?.error
          ?? (e as { message?: string })?.message;
        toast({ variant: "destructive", title: msg || "Failed to create product" });
      },
    }
  });

  const updateMutation = useUpdateProduct({
    mutation: {
      onSuccess: () => {
        toast({ title: "Product updated successfully" });
        invalidateProductCaches();
        setLocation("/admin/products");
      },
      onError: (e: unknown) => {
        const msg = (e as { data?: { error?: string }; message?: string })?.data?.error
          ?? (e as { message?: string })?.message;
        toast({ variant: "destructive", title: msg || "Failed to update product" });
      },
    }
  });

  const onSubmit = (data: ProductFormValues) => {
    const isBundle = data.kind === "bundle";
    const payload = {
      ...data,
      originalPrice: data.originalPrice || null,
      // categoryId is required by the form schema for every kind now.
      categoryId: data.categoryId,
      images: data.images,
      imageSettings: data.imageSettings,
      availabilityTag: data.availabilityTag === "none" ? null : (data.availabilityTag || null),
      // Bundles ignore variants — strip to avoid wasted round-trip work.
      variants: isBundle ? [] : data.variants.map((v, i) => ({
        id: v.id,
        name: v.name.trim(),
        price: v.price,
        stockQuantity: v.stockQuantity,
        isActive: v.isActive,
        sortOrder: i,
      })),
      bundleItems: isBundle ? data.bundleItems : [],
      // Bundles also ignore stockQuantity — server forces it to 0 anyway, but
      // sending 0 keeps the payload tidy.
      stockQuantity: isBundle ? 0 : data.stockQuantity,
    };

    if (isEditing) {
      updateMutation.mutate({ id: productId, data: payload });
    } else {
      createMutation.mutate({ data: payload });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isBundle = kind === "bundle";

  // Bundle picker handlers
  const addProductToBundle = () => {
    const pid = Number(pickerProductId);
    if (!Number.isFinite(pid) || pid <= 0) return;
    const next = (() => {
      const existing = bundleItems.find((i) => i.productId === pid);
      if (existing) {
        return bundleItems.map((i) => i.productId === pid ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...bundleItems, { productId: pid, quantity: 1 }];
    })();
    form.setValue("bundleItems", next, { shouldDirty: true, shouldValidate: true });
    setPickerProductId("");
  };
  const updateBundleQty = (productId: number, qty: number) => {
    if (qty <= 0) {
      form.setValue("bundleItems", bundleItems.filter((i) => i.productId !== productId), { shouldDirty: true, shouldValidate: true });
      return;
    }
    form.setValue("bundleItems", bundleItems.map((i) => i.productId === productId ? { ...i, quantity: qty } : i), { shouldDirty: true, shouldValidate: true });
  };
  const removeBundleItem = (productId: number) => {
    form.setValue("bundleItems", bundleItems.filter((i) => i.productId !== productId), { shouldDirty: true, shouldValidate: true });
  };

  if (isEditing && isProductLoading) {
    return <AdminLayout title="Edit Product"><div className="p-8 text-center">Loading...</div></AdminLayout>;
  }

  return (
    <AdminLayout title={isEditing ? "Edit Product" : "New Product"}>
      <div className="w-full bg-card border border-border rounded-xl shadow-sm p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Kind toggle — controls which sections render below. */}
            <FormField
              control={form.control}
              name="kind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Type</FormLabel>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => field.onChange("simple")}
                      className={`text-left border rounded-lg p-3 transition ${field.value === "simple" ? "border-primary ring-2 ring-primary/30 bg-primary/5" : "border-border hover:bg-muted/40"}`}
                    >
                      <div className="font-semibold text-sm">Simple product</div>
                      <div className="text-xs text-muted-foreground mt-0.5">A single item with optional variants and its own stock.</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => field.onChange("bundle")}
                      className={`text-left border rounded-lg p-3 transition ${field.value === "bundle" ? "border-primary ring-2 ring-primary/30 bg-primary/5" : "border-border hover:bg-muted/40"}`}
                    >
                      <div className="font-semibold text-sm flex items-center gap-1.5"><Gift className="w-3.5 h-3.5" />Gift bundle</div>
                      <div className="text-xs text-muted-foreground mt-0.5">A curated set of other products. Stock comes from the items.</div>
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>{isBundle ? "Bundle Name" : "Product Name"}</FormLabel>
                    <FormControl>
                      <Input placeholder={isBundle ? "E.g. Mum's Birthday Box" : "E.g. Premium Leather Wallet"} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (KSh)</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" {...field} />
                    </FormControl>
                    {isBundle && (
                      <FormDescription>
                        Items sum to {bundleItemsSum.toFixed(2)}. Charge less for a discount, more for gift-wrap markup.
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!isBundle && (
                <FormField
                  control={form.control}
                  name="stockQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="1"
                          placeholder="0"
                          value={field.value ?? 0}
                          onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>Auto-decrements on each paid order. Product is marked out of stock at 0.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="originalPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Original Price (KSh) — Optional</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" value={field.value || ""} onChange={field.onChange} />
                    </FormControl>
                    <FormDescription>Shows as crossed out to indicate a sale</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!isBundle && (
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category <span className="text-destructive">*</span></FormLabel>
                      <Select
                        key={field.value ?? "none"}
                        onValueChange={(val) => field.onChange(parseInt(val, 10))}
                        value={field.value ? field.value.toString() : ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category (required)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id.toString()}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="availabilityTag"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Availability</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(val === "none" ? null : val)}
                      value={field.value ?? "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="No badge" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No badge</SelectItem>
                        {availabilityTags?.map((tag) => (
                          <SelectItem key={tag.value} value={tag.value}>
                            {tag.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Badge displayed on the product card and used by the Availability filter (New Arrival, Sale, Hot / Trending, etc.)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="images"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormControl>
                      <MultiImageUpload
                        label={isBundle ? "Bundle Images (optional — falls back to a collage of items)" : "Product Images"}
                        value={field.value ?? []}
                        onChange={field.onChange}
                        settings={form.watch("imageSettings") ?? {}}
                        onSettingsChange={(next) => form.setValue("imageSettings", next, { shouldDirty: true })}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder={isBundle ? "Who is this bundle for? What occasions?" : "Product details..."} className="min-h-[100px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Bundle items editor — only for kind=bundle. */}
            {isBundle && (
              <div className="border-t border-border pt-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold flex items-center gap-2"><Gift className="w-4 h-4" />Bundle contents</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Pick the products that make up this gift bundle. Stock is computed from these items — the bundle is out of stock when any component is.
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 mt-1">
                    {bundleItems.length} unique · {bundleItems.reduce((s, i) => s + i.quantity, 0)} items
                  </span>
                </div>

                <div className="flex gap-2">
                  <select
                    value={pickerProductId}
                    onChange={(e) => setPickerProductId(e.target.value)}
                    className="flex-1 border border-input bg-background rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">Select a product to add…</option>
                    {availableForBundle.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} · {p.price.toFixed(2)}</option>
                    ))}
                  </select>
                  <Button type="button" onClick={addProductToBundle} disabled={!pickerProductId} className="gap-1">
                    <Plus className="w-4 h-4" /> Add
                  </Button>
                </div>

                {bundleItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic border border-dashed border-border rounded-lg p-4 text-center">
                    No products yet. Add at least one product above to create a bundle.
                  </p>
                ) : (
                  <div className="divide-y divide-border border border-border rounded-md">
                    {bundleItems.map((it) => {
                      const p = productById.get(it.productId);
                      return (
                        <div key={it.productId} className="flex items-center gap-3 p-3">
                          <div className="w-10 h-10 rounded bg-muted overflow-hidden shrink-0">
                            {p?.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> : null}
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
                            onChange={(e) => updateBundleQty(it.productId, Number(e.target.value))}
                            className="w-20 h-9"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeBundleItem(it.productId)}
                            aria-label="Remove from bundle"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* RHF needs a hidden field error surface for bundleItems. */}
                <FormField
                  control={form.control}
                  name="bundleItems"
                  render={() => (
                    <FormItem><FormMessage /></FormItem>
                  )}
                />
              </div>
            )}

            {/* Variants editor — only for simple products. */}
            {!isBundle && (
              <div className="border-t border-border pt-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold">Variants <span className="text-xs font-normal text-muted-foreground">(optional)</span></h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add options like "Red — L" or "32GB Black". Leave empty if the product has only one version.
                      Variant price is optional — if blank, the product price is used. Stock is tracked per variant.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendVariant({ name: "", price: null, stockQuantity: 0, isActive: true })}
                    className="gap-1.5 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />Add Variant
                  </Button>
                </div>

                {variantFields.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic border border-dashed border-border rounded-lg p-4 text-center">
                    No variants. The product will be sold as a single SKU.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {variantFields.map((v, idx) => (
                      <div key={v.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end border border-border rounded-lg p-3 bg-muted/20">
                        <FormField
                          control={form.control}
                          name={`variants.${idx}.name`}
                          render={({ field }) => (
                            <FormItem className="sm:col-span-4">
                              <FormLabel className="text-xs">Variant Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Red — L" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`variants.${idx}.price`}
                          render={({ field }) => (
                            <FormItem className="sm:col-span-3">
                              <FormLabel className="text-xs">Price Override (KSh)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  step="1"
                                  placeholder="Use product price"
                                  value={field.value ?? ""}
                                  onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`variants.${idx}.stockQuantity`}
                          render={({ field }) => (
                            <FormItem className="sm:col-span-2">
                              <FormLabel className="text-xs">Stock</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  step="1"
                                  placeholder="0"
                                  value={field.value ?? 0}
                                  onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`variants.${idx}.isActive`}
                          render={({ field }) => (
                            <FormItem className="sm:col-span-2 flex flex-row items-center justify-between rounded-md border border-border px-3 py-2">
                              <FormLabel className="text-xs mb-0">Active</FormLabel>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <div className="sm:col-span-1 flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeVariant(idx)}
                            className="text-muted-foreground hover:text-destructive"
                            aria-label="Remove variant"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border pt-6">
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active</FormLabel>
                      <FormDescription>Visible in store</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {!isBundle && (
                <FormField
                  control={form.control}
                  name="inStock"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">In Stock</FormLabel>
                        <FormDescription>Available for purchase</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="isFeatured"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Featured</FormLabel>
                      <FormDescription>Show on homepage</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {!isBundle && (
                <FormField
                  control={form.control}
                  name="isDropship"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Dropship</FormLabel>
                        <FormDescription>Fulfilled by supplier</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setLocation("/admin/products")}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isEditing ? "Save Changes" : (isBundle ? "Create Bundle" : "Create Product")}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </AdminLayout>
  );
}
