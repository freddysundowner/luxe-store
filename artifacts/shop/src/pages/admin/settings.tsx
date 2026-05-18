import { AdminLayout } from "@/components/layout/AdminLayout";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useGetSettings, getGetSettingsQueryKey, useUpdateSettings } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const settingsSchema = z.object({
  storeName: z.string().min(1, "Store name is required"),
  storeDescription: z.string().optional(),
  whatsappNumber: z.string().min(1, "WhatsApp number is required"),
  logoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  currency: z.string().default("KES"),
  currencySymbol: z.string().default("KSh"),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useGetSettings({
    query: { queryKey: getGetSettingsQueryKey() }
  });

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      storeName: "",
      storeDescription: "",
      whatsappNumber: "",
      logoUrl: "",
      currency: "KES",
      currencySymbol: "KSh",
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        storeName: settings.storeName,
        storeDescription: settings.storeDescription || "",
        whatsappNumber: settings.whatsappNumber,
        logoUrl: settings.logoUrl || "",
        currency: settings.currency || "KES",
        currencySymbol: settings.currencySymbol || "KSh",
      });
    }
  }, [settings, form]);

  const updateMutation = useUpdateSettings({
    mutation: {
      onSuccess: () => {
        toast({ title: "Settings saved successfully" });
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      },
      onError: () => toast({ variant: "destructive", title: "Failed to save settings" })
    }
  });

  const onSubmit = (data: SettingsFormValues) => {
    updateMutation.mutate({ data });
  };

  if (isLoading) {
    return <AdminLayout title="Store Settings"><div className="p-8 text-center">Loading settings...</div></AdminLayout>;
  }

  return (
    <AdminLayout title="Store Settings">
      <div className="max-w-2xl bg-card border border-border rounded-xl shadow-sm p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b border-border pb-2">General Information</h3>
              
              <FormField
                control={form.control}
                name="storeName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Neighborhood Shop" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="storeDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Welcome to our store..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormDescription>Used in the header of the public store</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4 pt-4">
              <h3 className="font-semibold text-lg border-b border-border pb-2">Checkout & WhatsApp</h3>
              
              <FormField
                control={form.control}
                name="whatsappNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp Number</FormLabel>
                    <FormControl>
                      <Input placeholder="1234567890" {...field} />
                    </FormControl>
                    <FormDescription>Include country code without + or spaces (e.g. 1234567890)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4 pt-4">
              <h3 className="font-semibold text-lg border-b border-border pb-2">Localization</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency Code</FormLabel>
                      <FormControl>
                        <Input placeholder="KES" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currencySymbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency Symbol</FormLabel>
                      <FormControl>
                        <Input placeholder="$" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-border">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Settings
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </AdminLayout>
  );
}
