import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListAdminPayments, getListAdminPaymentsQueryKey, useGetSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import type { AdminPayment } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag, Phone, CheckCircle2, Clock, XCircle,
  Hash, ChevronRight, Package, CreditCard, Calendar, RefreshCw,
  MessageCircle, ExternalLink,
} from "lucide-react";

// ── helpers ──────────────────────────────────────────────────────────────────
function statusBadge(status: string, large = false) {
  const cls = large ? "text-sm px-3 py-1 gap-1.5" : "gap-1";
  if (status === "completed")
    return <Badge className={`bg-green-600/20 text-green-400 border-green-700/40 hover:bg-green-600/30 ${cls}`}><CheckCircle2 className={large ? "w-4 h-4" : "w-3 h-3"} />Paid</Badge>;
  if (status === "failed")
    return <Badge className={`bg-red-600/20 text-red-400 border-red-700/40 hover:bg-red-600/30 ${cls}`}><XCircle className={large ? "w-4 h-4" : "w-3 h-3"} />Failed</Badge>;
  return <Badge className={`bg-yellow-600/20 text-yellow-400 border-yellow-700/40 hover:bg-yellow-600/30 ${cls}`}><Clock className={large ? "w-4 h-4" : "w-3 h-3"} />Pending</Badge>;
}

function formatPhone(phone: string) {
  if (phone.startsWith("254") && phone.length === 12)
    return `+254 ${phone.slice(3, 6)} ${phone.slice(6, 9)} ${phone.slice(9)}`;
  return phone;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-KE", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleString("en-KE", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

interface CartItem { name: string; quantity: number; price: number; imageUrl?: string }
interface CartSnapshot { items?: CartItem[]; total?: number }

// ── Detail sheet ─────────────────────────────────────────────────────────────
function OrderDetailSheet({ order, onClose }: { order: AdminPayment; onClose: () => void }) {
  const cart = order.cartSnapshot as CartSnapshot | null;
  const items: CartItem[] = cart?.items ?? [];
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });

  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const receiptUrl = `${window.location.origin}${base}/receipt/${order.transactionId}`;

  const shareReceiptToWhatsApp = () => {
    if (!settings?.whatsappNumber) return;
    const sym = settings.currencySymbol ?? "KSh";
    let msg = `*Order Receipt — ${settings.storeName ?? "Store"}*\n\n`;
    msg += `📋 *Ref:* ${order.externalRef ?? order.transactionId}\n`;
    if (order.mpesaRef) msg += `✅ *M-Pesa Ref:* ${order.mpesaRef}\n`;
    msg += `📱 *Phone:* ${formatPhone(order.phoneNumber)}\n`;
    msg += `📅 *Date:* ${formatDate(order.createdAt)}\n\n`;
    if (items.length > 0) {
      msg += `*Items:*\n`;
      items.forEach(i => { msg += `  • ${i.quantity}× ${i.name} — ${sym} ${(i.price * i.quantity).toLocaleString()}\n`; });
      msg += `\n`;
    }
    msg += `*Total: ${sym} ${order.amount.toLocaleString()}*\n\n`;
    msg += `🔗 View receipt: ${receiptUrl}`;
    window.open(`https://wa.me/${order.phoneNumber}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0">
        {/* Header */}
        <SheetHeader className="px-6 py-5 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center justify-between gap-3">
            <SheetTitle className="text-base font-semibold truncate">
              {order.externalRef ?? order.transactionId}
            </SheetTitle>
            {statusBadge(order.status, true)}
          </div>
        </SheetHeader>

        <div className="px-6 py-5 space-y-6">
          {/* Cart items */}
          {items.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                <Package className="w-4 h-4" />Items Ordered
              </h3>
              <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
                      : <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0"><ShoppingBag className="w-4 h-4 text-muted-foreground" /></div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold flex-shrink-0">
                      KSh {(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>
                ))}
                <div className="flex justify-between items-center px-4 py-3 bg-muted/30 font-semibold text-sm">
                  <span>Total</span>
                  <span>KSh {order.amount.toLocaleString()}</span>
                </div>
              </div>
            </section>
          )}

          <Separator />

          {/* Customer info */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
              <Phone className="w-4 h-4" />Customer
            </h3>
            <div className="rounded-xl border border-border divide-y divide-border">
              <Row label="Phone" value={formatPhone(order.phoneNumber)} mono />
            </div>
          </section>

          <Separator />

          {/* Payment info */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
              <CreditCard className="w-4 h-4" />Payment
            </h3>
            <div className="rounded-xl border border-border divide-y divide-border">
              <Row label="Amount" value={`KSh ${order.amount.toLocaleString()}`} bold />
              <Row label="Status" value={<span className="capitalize">{order.status}</span>} />
              {order.mpesaRef && <Row label="M-Pesa Ref" value={order.mpesaRef} mono />}
              {order.externalRef && <Row label="Order Ref" value={order.externalRef} mono />}
              <Row label="Transaction ID" value={order.transactionId} mono small />
              {order.checkoutRequestId && <Row label="Checkout ID" value={order.checkoutRequestId} mono small />}
            </div>
          </section>

          <Separator />

          {/* Timestamps */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
              <Calendar className="w-4 h-4" />Timeline
            </h3>
            <div className="rounded-xl border border-border divide-y divide-border">
              <Row label="Created" value={formatDate(order.createdAt)} />
              {order.updatedAt && order.updatedAt !== order.createdAt && (
                <Row label="Last updated" value={formatDate(order.updatedAt)} icon={<RefreshCw className="w-3.5 h-3.5" />} />
              )}
            </div>
          </section>

          {/* Raw cart snapshot (dev aid) */}
          {cart && items.length === 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cart Data</h3>
              <pre className="text-[11px] bg-muted/50 rounded-lg p-3 overflow-x-auto text-muted-foreground">
                {JSON.stringify(cart, null, 2)}
              </pre>
            </section>
          )}

          <Separator />

          {/* Actions */}
          <section className="space-y-3 pb-2">
            <Button
              className="w-full gap-2 bg-[#25D366] hover:bg-[#1fba59] text-white border-0"
              onClick={shareReceiptToWhatsApp}
              disabled={!settings?.whatsappNumber}
              title={!settings?.whatsappNumber ? "Set a WhatsApp number in Settings first" : undefined}
            >
              <MessageCircle className="w-4 h-4" />
              Share Receipt to Customer WhatsApp
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => window.open(receiptUrl, "_blank")}
            >
              <ExternalLink className="w-4 h-4" />
              Open Receipt Page
            </Button>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({
  label, value, mono, bold, small, icon,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  bold?: boolean;
  small?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <span className="text-sm text-muted-foreground flex items-center gap-1.5 flex-shrink-0 pt-0.5">
        {icon}{label}
      </span>
      <span className={`text-right break-all ${bold ? "font-semibold text-sm" : small ? "text-[11px] font-mono text-muted-foreground" : mono ? "text-xs font-mono text-muted-foreground" : "text-sm"}`}>
        {value}
      </span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminOrders() {
  const [selected, setSelected] = useState<AdminPayment | null>(null);

  const { data: orders, isLoading } = useListAdminPayments({
    query: { queryKey: getListAdminPaymentsQueryKey(), refetchInterval: 30_000 },
  });

  const total = orders?.length ?? 0;
  const paid = orders?.filter(o => o.status === "completed").length ?? 0;
  const revenue = orders?.filter(o => o.status === "completed").reduce((s, o) => s + o.amount, 0) ?? 0;

  return (
    <AdminLayout title="Orders">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
            <ShoppingBag className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-7 w-12" /> : <p className="text-2xl font-bold">{total}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-7 w-12" /> : <p className="text-2xl font-bold text-green-400">{paid}</p>}
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
            <span className="text-xs font-semibold text-muted-foreground">KES</span>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-7 w-24" /> : <p className="text-2xl font-bold">KSh {revenue.toLocaleString()}</p>}
          </CardContent>
        </Card>
      </div>

      {/* Orders table */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : !orders || orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <ShoppingBag className="w-12 h-12 opacity-30" />
          <p className="text-lg font-medium">No orders yet</p>
          <p className="text-sm">M-Pesa payments will appear here once customers check out.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          {/* Desktop header */}
          <div className="hidden md:grid grid-cols-[1fr_140px_110px_150px_150px_28px] gap-4 px-5 py-3 bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
            <span>Reference</span>
            <span>Phone</span>
            <span className="text-right">Amount</span>
            <span>M-Pesa Ref</span>
            <span className="text-right">Date</span>
            <span />
          </div>

          <div className="divide-y divide-border">
            {orders.map((order) => (
              <button
                key={order.id}
                onClick={() => setSelected(order)}
                className="w-full text-left px-4 md:px-5 py-4 md:grid md:grid-cols-[1fr_140px_110px_150px_150px_28px] md:gap-4 md:items-center hover:bg-muted/30 active:bg-muted/50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3 md:contents">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      {statusBadge(order.status)}
                      <span className="text-xs text-muted-foreground font-mono truncate">
                        {order.externalRef ?? order.transactionId.slice(0, 18) + "…"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 md:hidden flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" />{formatPhone(order.phoneNumber)}
                      </span>
                      <span className="text-xs font-semibold">KSh {order.amount.toLocaleString()}</span>
                      {order.mpesaRef && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Hash className="w-3 h-3" />{order.mpesaRef}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">{formatDateShort(order.createdAt)}</span>
                    </div>
                  </div>

                  {/* Desktop columns */}
                  <span className="hidden md:block text-sm text-muted-foreground">{formatPhone(order.phoneNumber)}</span>
                  <span className="hidden md:block text-sm font-semibold text-right">KSh {order.amount.toLocaleString()}</span>
                  <span className="hidden md:block text-xs text-muted-foreground font-mono">
                    {order.mpesaRef ?? <span className="opacity-30">—</span>}
                  </span>
                  <span className="hidden md:block text-xs text-muted-foreground text-right">{formatDateShort(order.createdAt)}</span>
                  <ChevronRight className="hidden md:block w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-right mt-3">Auto-refreshes every 30 s · click a row to see full details</p>

      {/* Detail sheet */}
      {selected && (
        <OrderDetailSheet order={selected} onClose={() => setSelected(null)} />
      )}
    </AdminLayout>
  );
}
