import { AdminLayout } from "@/components/layout/AdminLayout";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useGetSettings, getGetSettingsQueryKey, useUpdateSettings } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { Loader2, Plus, Trash2, Smartphone } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const priceTierSchema = z.object({
  name: z.string().min(1, "Tier name is required"),
  min: z.coerce.number().min(0, "Min must be ≥ 0"),
  max: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().nullable()
  ),
});

const settingsSchema = z.object({
  storeName: z.string().min(1, "Store name is required"),
  storeDescription: z.string().optional(),
  whatsappNumber: z.string().min(1, "WhatsApp number is required"),
  logoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  currency: z.string().default("KES"),
  currencySymbol: z.string().default("KSh"),
  priceTiers: z.array(priceTierSchema).min(1, "At least one price tier is required"),
  sunpayApiKey: z.string().optional(),
  sunpayEnabled: z.boolean().default(false),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const DEFAULT_TIERS = [
  { name: "Under Ksh 500", min: 0, max: 500 },
  { name: "Ksh 500 – 2,000", min: 500, max: 2000 },
  { name: "Ksh 2,000 – 5,000", min: 2000, max: 5000 },
  { name: "Over Ksh 5,000", min: 5000, max: null },
];

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
      priceTiers: DEFAULT_TIERS,
      sunpayApiKey: "",
      sunpayEnabled: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "priceTiers",
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
        priceTiers: (settings.priceTiers as typeof DEFAULT_TIERS | undefined) ?? DEFAULT_TIERS,
        sunpayApiKey: settings.sunpayApiKey || "",
        sunpayEnabled: settings.sunpayEnabled === "true",
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
    const { sunpayEnabled, sunpayApiKey, ...rest } = data;
    updateMutation.mutate({
      data: {
        ...rest,
        sunpayEnabled: sunpayEnabled ? "true" : "false",
        sunpayApiKey: sunpayApiKey || "",
      } as Parameters<typeof updateMutation.mutate>[0]["data"]
    });
  };

  if (isLoading) {
    return <AdminLayout title="Store Settings"><div className="p-8 text-center">Loading settings...</div></AdminLayout>;
  }

  return (
    <AdminLayout title="Store Settings">
      <div className="max-w-2xl bg-card border border-border rounded-xl shadow-sm p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* General */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b border-border pb-2">General Information</h3>

              <FormField control={form.control} name="storeName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store Name</FormLabel>
                    <FormControl><Input placeholder="Luxe Store" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField control={form.control} name="storeDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea placeholder="Welcome to our store..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField control={form.control} name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo URL</FormLabel>
                    <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                    <FormDescription>Used in the header of the public store</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Checkout */}
            <div className="space-y-4 pt-4">
              <h3 className="font-semibold text-lg border-b border-border pb-2">Checkout &amp; WhatsApp</h3>

              <FormField control={form.control} name="whatsappNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp Number</FormLabel>
                    <FormControl><Input placeholder="254712345678" {...field} /></FormControl>
                    <FormDescription>Include country code without + or spaces (e.g. 254712345678)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* M-Pesa / SunPay */}
            <div className="space-y-4 pt-4">
              <div className="border-b border-border pb-2">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-green-500" />
                  M-Pesa Payments (SunPay)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Enable STK Push checkout directly in the cart. Requires a SunPay account at{" "}
                  <a href="https://sunpay.co.ke" target="_blank" rel="noopener noreferrer" className="underline">
                    sunpay.co.ke
                  </a>.
                </p>
              </div>

              <FormField
                control={form.control}
                name="sunpayEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Enable M-Pesa Checkout</FormLabel>
                      <FormDescription>
                        Shows "Pay with M-Pesa" button on the cart page
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField control={form.control} name="sunpayApiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SunPay API Key</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="sp_live_xxxxxxxxxxxxxxxx"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Your SunPay secret key starting with <code className="text-xs bg-muted px-1 rounded">sp_</code>.
                      Found in your SunPay dashboard under API Keys.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Localization */}
            <div className="space-y-4 pt-4">
              <h3 className="font-semibold text-lg border-b border-border pb-2">Localization</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency Code</FormLabel>
                      <FormControl><Input placeholder="KES" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField control={form.control} name="currencySymbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency Symbol</FormLabel>
                      <FormControl><Input placeholder="KSh" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Price Tiers */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div>
                  <h3 className="font-semibold text-lg">Price Filter Tiers</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    These appear as checkboxes in the store's price range filter.
                    Leave <strong>Max</strong> empty on the last tier for "and above".
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_90px_90px_32px] gap-2 px-1">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Tier Label</span>
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Min (KSh)</span>
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Max (KSh)</span>
                  <span />
                </div>

                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-[1fr_90px_90px_32px] gap-2 items-start group">
                    <FormField control={form.control} name={`priceTiers.${index}.name`}
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormControl>
                            <Input placeholder="e.g. Budget" className="h-9 text-sm" {...field} />
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />
                    <FormField control={form.control} name={`priceTiers.${index}.min`}
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormControl>
                            <Input type="number" min={0} placeholder="0" className="h-9 text-sm" {...field} />
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />
                    <FormField control={form.control} name={`priceTiers.${index}.max`}
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              placeholder="∞"
                              className="h-9 text-sm"
                              value={field.value === null || field.value === undefined ? "" : field.value}
                              onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => remove(index)}
                      disabled={fields.length <= 1}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-1 text-xs gap-1.5"
                onClick={() => append({ name: "", min: 0, max: null })}
              >
                <Plus className="w-3.5 h-3.5" />
                Add tier
              </Button>

              <p className="text-[11px] text-muted-foreground">
                Tip: tiers are applied as <em>min ≤ price &lt; max</em>. Customers can select multiple tiers at once.
              </p>
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
