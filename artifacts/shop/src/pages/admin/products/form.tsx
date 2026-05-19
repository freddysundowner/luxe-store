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
import { useCreateProduct, useUpdateProduct, useGetProduct, getGetProductQueryKey, useListCategories, getListCategoriesQueryKey, useListAvailabilityTagsPublic, getListAvailabilityTagsPublicQueryKey, getListProductsQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
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

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be positive"),
  originalPrice: z.coerce.number().optional().nullable(),
  categoryId: z.coerce.number({ required_error: "Category is required" }).min(1, "Category is required"),
  images: z.array(z.string()).default([]),
  inStock: z.boolean().default(true),
  stockQuantity: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number({ required_error: "Stock quantity is required" }).int().min(0, "Stock must be 0 or more")
  ),
  isActive: z.boolean().default(true),
  isDropship: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  availabilityTag: z.string().optional().nullable(),
  variants: z.array(variantSchema).default([]),
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

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      originalPrice: null,
      categoryId: undefined,
      images: [],
      inStock: true,
      stockQuantity: 0,
      isActive: true,
      isDropship: false,
      isFeatured: false,
      availabilityTag: null,
      variants: [],
    },
  });

  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  useEffect(() => {
    if (product && isEditing) {
      form.reset({
        name: product.name,
        description: product.description || "",
        price: product.price,
        originalPrice: product.originalPrice,
        categoryId: product.categoryId ?? undefined,
        images: product.images ?? (product.imageUrl ? [product.imageUrl] : []),
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
      onError: () => toast({ variant: "destructive", title: "Failed to create product" })
    }
  });

  const updateMutation = useUpdateProduct({
    mutation: {
      onSuccess: () => {
        toast({ title: "Product updated successfully" });
        invalidateProductCaches();
        setLocation("/admin/products");
      },
      onError: () => toast({ variant: "destructive", title: "Failed to update product" })
    }
  });

  const onSubmit = (data: ProductFormValues) => {
    const payload = {
      ...data,
      originalPrice: data.originalPrice || null,
      categoryId: data.categoryId,
      images: data.images,
      availabilityTag: data.availabilityTag === "none" ? null : (data.availabilityTag || null),
      variants: data.variants.map((v, i) => ({
        id: v.id,
        name: v.name.trim(),
        price: v.price,
        stockQuantity: v.stockQuantity,
        isActive: v.isActive,
        sortOrder: i,
      })),
    };

    if (isEditing) {
      updateMutation.mutate({ id: productId, data: payload });
    } else {
      createMutation.mutate({ data: payload });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isEditing && isProductLoading) {
    return <AdminLayout title="Edit Product"><div className="p-8 text-center">Loading...</div></AdminLayout>;
  }

  return (
    <AdminLayout title={isEditing ? "Edit Product" : "New Product"}>
      <div className="w-full bg-card border border-border rounded-xl shadow-sm p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g. Premium Leather Wallet" {...field} />
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
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        label="Product Images"
                        value={field.value ?? []}
                        onChange={field.onChange}
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
                      <Textarea placeholder="Product details..." className="min-h-[100px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Variants editor */}
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
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setLocation("/admin/products")}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isEditing ? "Save Changes" : "Create Product"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </AdminLayout>
  );
}
