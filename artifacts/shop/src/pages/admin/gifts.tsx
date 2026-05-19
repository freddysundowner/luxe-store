import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListAdminGifts, useMarkGiftPaid } from "@workspace/api-client-react";
import { Gift, Check, Clock, Package, Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const fmt = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 });

function StatusBadge({ status }: { status: string }) {
  if (status === "paid") return <Badge className="bg-blue-950 text-blue-300 border-blue-800 text-[10px]"><Check className="w-3 h-3 mr-1" />Paid</Badge>;
  if (status === "claimed") return <Badge className="bg-green-950 text-green-300 border-green-800 text-[10px]"><Package className="w-3 h-3 mr-1" />Claimed</Badge>;
  return <Badge className="bg-zinc-900 text-zinc-400 border-zinc-700 text-[10px]"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
}

export default function AdminGifts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: gifts, isLoading } = useListAdminGifts();

  const markPaidMutation = useMarkGiftPaid({
    mutation: {
      onSuccess: () => {
        toast({ title: "Gift marked as paid" });
        queryClient.invalidateQueries({ queryKey: ["listAdminGifts"] });
      },
      onError: () => toast({ variant: "destructive", title: "Failed to update gift" }),
    },
  });

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/gift/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Gift link copied!" });
  };

  return (
    <AdminLayout title="Gifts">
      <div className="space-y-4">
        {/* Summary cards */}
        {!isLoading && gifts && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: "Total Gifts", value: gifts.length, icon: Gift, color: "text-[#D4AF37]" },
              { label: "Paid / Sent", value: gifts.filter(g => g.status === "paid" || g.status === "claimed").length, icon: Check, color: "text-blue-400" },
              { label: "Claimed", value: gifts.filter(g => g.status === "claimed").length, icon: Package, color: "text-green-400" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading gifts…</div>
          ) : !gifts?.length ? (
            <div className="p-12 text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <Gift className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">No gifts yet</h3>
                <p className="text-muted-foreground text-sm">When customers send gifts, they'll appear here.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {/* Header */}
              <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 items-center px-4 py-2 bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <span className="w-10" />
                <span>Product / Recipient</span>
                <span className="hidden md:block w-24 text-center">Amount</span>
                <span className="hidden sm:block w-20 text-center">Method</span>
                <span className="w-20 text-center">Status</span>
                <span className="w-24 text-right">Actions</span>
              </div>

              {gifts.map((gift) => (
                <div key={gift.id} className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 items-center px-4 py-3 hover:bg-muted/20 transition-colors">
                  {/* Thumbnail */}
                  <div className="w-10 h-10 rounded bg-muted overflow-hidden shrink-0">
                    {gift.productImageUrl
                      ? <img src={gift.productImageUrl} alt={gift.productName} className="w-full h-full object-cover" />
                      : <Gift className="w-4 h-4 text-muted-foreground m-3" />}
                  </div>

                  {/* Details */}
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{gift.productName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {gift.recipientName ? `To: ${gift.recipientName}` : "No recipient name"}
                      {gift.senderName ? ` · From: ${gift.senderName}` : ""}
                    </p>
                    {gift.note && (
                      <p className="text-xs text-muted-foreground italic truncate">"{gift.note}"</p>
                    )}
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                      {new Date(gift.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="hidden md:block w-24 text-center">
                    <p className="font-medium text-sm">{fmt.format(gift.productPrice)}</p>
                  </div>

                  {/* Method */}
                  <div className="hidden sm:flex w-20 justify-center">
                    <Badge variant="outline" className="text-[10px]">
                      {gift.paymentMethod === "mpesa" ? "M-Pesa" : "WhatsApp"}
                    </Badge>
                  </div>

                  {/* Status */}
                  <div className="w-20 flex justify-center">
                    <StatusBadge status={gift.status} />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1 w-24">
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Copy gift link" onClick={() => copyLink(gift.claimToken)}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Open gift link" onClick={() => window.open(`/gift/${gift.claimToken}`, "_blank")}>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                    {gift.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[10px] text-green-500 hover:text-green-400 hover:bg-green-950/30"
                        title="Mark as paid"
                        disabled={markPaidMutation.isPending}
                        onClick={() => markPaidMutation.mutate({ id: gift.id })}
                      >
                        Mark paid
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
