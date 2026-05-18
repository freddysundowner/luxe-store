import { AdminLayout } from "@/components/layout/AdminLayout";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateProduct, useUpdateProduct, useGetProduct, getGetProductQueryKey, useListCategories, getListCategoriesQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be positive"),
  originalPrice: z.coerce.number().optional().nullable(),
  categoryId: z.coerce.number().optional().nullable(),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  inStock: z.boolean().default(true),
  isActive: z.boolean().default(true),
  isDropship: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
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

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      originalPrice: null,
      categoryId: null,
      imageUrl: "",
      inStock: true,
      isActive: true,
      isDropship: false,
      isFeatured: false,
    },
  });

  useEffect(() => {
    if (product && isEditing) {
      form.reset({
        name: product.name,
        description: product.description || "",
        price: product.price,
        originalPrice: product.originalPrice,
        categoryId: product.categoryId,
        imageUrl: product.imageUrl || "",
        inStock: product.inStock,
        isActive: product.isActive,
        isDropship: product.isDropship,
        isFeatured: product.isFeatured,
      });
    }
  }, [product, isEditing, form]);

  const createMutation = useCreateProduct({
    mutation: {
      onSuccess: () => {
        toast({ title: "Product created successfully" });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
        setLocation("/admin/products");
      },
      onError: () => toast({ variant: "destructive", title: "Failed to create product" })
    }
  });

  const updateMutation = useUpdateProduct({
    mutation: {
      onSuccess: () => {
        toast({ title: "Product updated successfully" });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
        setLocation("/admin/products");
      },
      onError: () => toast({ variant: "destructive", title: "Failed to update product" })
    }
  });

  const onSubmit = (data: ProductFormValues) => {
    const payload = {
      ...data,
      originalPrice: data.originalPrice || null,
      categoryId: data.categoryId || null,
      imageUrl: data.imageUrl || undefined,
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
      <div className="max-w-2xl bg-card border border-border rounded-xl shadow-sm p-6">
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
                      <Input placeholder="E.g. Fresh Organic Tomatoes" {...field} />
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
                    <FormLabel>Price ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="originalPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Original Price ($) - Optional</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" value={field.value || ""} onChange={field.onChange} />
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
                    <FormLabel>Category</FormLabel>
                    <Select 
                      onValueChange={(val) => field.onChange(parseInt(val, 10))} 
                      value={field.value ? field.value.toString() : ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
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
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
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
