import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  useListAdminPayments, getListAdminPaymentsQueryKey,
  useGetSettings, getGetSettingsQueryKey,
} from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ReceiptCard } from "@/components/ReceiptCard";
import {
  ShoppingBag, Phone, CheckCircle2, Clock, XCircle,
  Hash, Package, CreditCard, Calendar, RefreshCw,
  MessageCircle, ExternalLink, ArrowLeft, User, MapPin, Mail,
} from "lucide-react";

// ── helpers ───────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  if (status === "completed")
    return <Badge className="bg-green-600/20 text-green-400 border-green-700/40 text-sm px-3 py-1 gap-1.5"><CheckCircle2 className="w-4 h-4" />Paid</Badge>;
  if (status === "failed")
    return <Badge className="bg-red-600/20 text-red-400 border-red-700/40 text-sm px-3 py-1 gap-1.5"><XCircle className="w-4 h-4" />Failed</Badge>;
  return <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-700/40 text-sm px-3 py-1 gap-1.5"><Clock className="w-4 h-4" />Pending</Badge>;
}

function formatPhone(phone: string) {
  if (phone.startsWith("254") && phone.length === 12)
    return `+254 ${phone.slice(3, 6)} ${phone.slice(6, 9)} ${phone.slice(9)}`;
  return phone;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-KE", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

interface CartItem { name: string; variantName?: string | null; quantity: number; price: number; imageUrl?: string }
interface CartCustomer { name?: string; email?: string; address?: string }
interface CartSnapshot { items?: CartItem[]; total?: number; customer?: CartCustomer }

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
    <div className="flex items-center justify-between gap-4 px-4 py-2">
      <span className="text-xs text-muted-foreground flex items-center gap-1.5 flex-shrink-0">
        {icon}{label}
      </span>
      <span className={`text-right break-all ${bold ? "font-semibold text-sm" : small ? "text-[10px] font-mono text-muted-foreground" : mono ? "text-xs font-mono text-muted-foreground" : "text-xs"}`}>
        {value}
      </span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [receiptOpen, setReceiptOpen] = useState(false);

  const { data: orders, isLoading } = useListAdminPayments({
    query: { queryKey: getListAdminPaymentsQueryKey() },
  });
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });

  const order = orders?.find(o => o.transactionId === id || String(o.id) === id);

  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const receiptUrl = order ? `${window.location.origin}${base}/receipt/${order.transactionId}` : "";

  const cart = order?.cartSnapshot as CartSnapshot | null;
  const items: CartItem[] = cart?.items ?? [];
  const customer: CartCustomer | undefined = cart?.customer;

  const shareReceiptToWhatsApp = () => {
    if (!order || !settings?.whatsappNumber) return;
    const sym = settings.currencySymbol ?? "KSh";
    let msg = `*Order Receipt — ${settings.storeName ?? "Store"}*\n\n`;
    msg += `*Ref:* ${order.externalRef ?? order.transactionId}\n`;
    if (order.mpesaRef) msg += `*M-Pesa Ref:* ${order.mpesaRef}\n`;
    msg += `*Phone:* ${formatPhone(order.phoneNumber)}\n`;
    if (customer?.name) msg += `*Name:* ${customer.name}\n`;
    if (customer?.address) msg += `*Deliver to:* ${customer.address}\n`;
    msg += `*Date:* ${formatDate(order.createdAt)}\n\n`;
    if (items.length > 0) {
      msg += `*Items:*\n`;
      items.forEach(i => {
        const name = i.variantName ? `${i.name} (${i.variantName})` : i.name;
        msg += `  - ${i.quantity}x ${name} — ${sym} ${(i.price * i.quantity).toLocaleString()}\n`;
      });
      msg += `\n`;
    }
    msg += `*Total: ${sym} ${order.amount.toLocaleString()}*\n\n`;
    msg += `*View receipt:* ${receiptUrl}`;
    window.open(`https://wa.me/${order.phoneNumber}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // ── Loading ──
  if (isLoading) {
    return (
      <AdminLayout title="Order Details">
        <div className="space-y-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </AdminLayout>
    );
  }

  // ── Not found ──
  if (!order) {
    return (
      <AdminLayout title="Order Not Found">
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
          <ShoppingBag className="w-14 h-14 opacity-20" />
          <p className="text-xl font-medium">Order not found</p>
          <p className="text-sm">No order matches ID: <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{id}</code></p>
          <Button variant="outline" onClick={() => navigate("/admin/orders")} className="mt-2 gap-2">
            <ArrowLeft className="w-4 h-4" />Back to Orders
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Order Details">
      <div className="space-y-3 pb-6">

        {/* Header — full width */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/admin/orders")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />Back
            </button>
            <h1 className="text-base font-semibold break-all font-mono">
              {order.externalRef ?? order.transactionId}
            </h1>
          </div>
          {statusBadge(order.status)}
        </div>

        {/* Two-column body */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">

          {/* ── LEFT COLUMN ── */}
          <div className="space-y-3">

            {/* Items */}
            {items.length > 0 ? (
              <section className="space-y-1.5">
                <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" />Items Ordered
                </h2>
                <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
                  {items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                      {item.imageUrl
                        ? <img src={item.imageUrl} alt={item.name} className="w-9 h-9 rounded object-cover flex-shrink-0" />
                        : <div className="w-9 h-9 rounded bg-muted flex items-center justify-center flex-shrink-0"><ShoppingBag className="w-4 h-4 text-muted-foreground" /></div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{item.name}</p>
                        {item.variantName && (
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/80">{item.variantName}</p>
                        )}
                        <p className="text-[11px] text-muted-foreground">Qty: {item.quantity} × KSh {item.price.toLocaleString()}</p>
                      </div>
                      <p className="text-xs font-semibold flex-shrink-0">KSh {(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  ))}
                  <div className="flex justify-between items-center px-4 py-2 bg-muted/30">
                    <span className="font-semibold text-xs">Total</span>
                    <span className="font-bold text-sm">KSh {order.amount.toLocaleString()}</span>
                  </div>
                </div>
              </section>
            ) : cart ? (
              <section className="space-y-1.5">
                <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Cart Data</h2>
                <pre className="text-[10px] bg-muted/50 rounded-lg p-3 overflow-x-auto text-muted-foreground">
                  {JSON.stringify(cart, null, 2)}
                </pre>
              </section>
            ) : null}

            {/* Customer */}
            <section className="space-y-1.5">
              <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />Customer
              </h2>
              <div className="rounded-lg border border-border divide-y divide-border">
                <Row label="Phone" value={formatPhone(order.phoneNumber)} mono icon={<Phone className="w-3 h-3" />} />
                {customer?.name && <Row label="Name" value={customer.name} icon={<User className="w-3 h-3" />} />}
                {customer?.email && <Row label="Email" value={customer.email} icon={<Mail className="w-3 h-3" />} />}
                {customer?.address && <Row label="Delivery Address" value={customer.address} icon={<MapPin className="w-3 h-3" />} />}
              </div>
            </section>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="space-y-3">

            {/* Payment */}
            <section className="space-y-1.5">
              <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />Payment
              </h2>
              <div className="rounded-lg border border-border divide-y divide-border">
                <Row label="Amount" value={`KSh ${order.amount.toLocaleString()}`} bold />
                <Row label="Status" value={<span className="capitalize">{order.status}</span>} />
                {order.mpesaRef && <Row label="M-Pesa Ref" value={order.mpesaRef} mono icon={<Hash className="w-3 h-3" />} />}
                {order.externalRef && <Row label="Order Ref" value={order.externalRef} mono />}
                <Row label="Transaction ID" value={order.transactionId} mono small />
                {order.checkoutRequestId && <Row label="Checkout ID" value={order.checkoutRequestId} mono small />}
              </div>
            </section>

            {/* Timeline */}
            <section className="space-y-1.5">
              <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />Timeline
              </h2>
              <div className="rounded-lg border border-border divide-y divide-border">
                <Row label="Created" value={formatDate(order.createdAt)} />
                {order.updatedAt && order.updatedAt !== order.createdAt && (
                  <Row label="Last updated" value={formatDate(order.updatedAt)} icon={<RefreshCw className="w-3 h-3" />} />
                )}
              </div>
            </section>

            {/* Actions */}
            <section className="flex gap-2">
              <Button
                className="flex-1 gap-1.5 bg-[#25D366] hover:bg-[#1fba59] text-white border-0 h-9 text-xs"
                onClick={shareReceiptToWhatsApp}
                disabled={!settings?.whatsappNumber}
                title={!settings?.whatsappNumber ? "Set a WhatsApp number in Settings first" : undefined}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Share Receipt
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-1.5 h-9 text-xs"
                onClick={() => setReceiptOpen(true)}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Receipt
              </Button>
            </section>
          </div>
        </div>
      </div>

      {/* Receipt preview modal */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-lg w-full p-0 overflow-hidden">
          <DialogHeader className="px-4 py-3 border-b border-border">
            <DialogTitle className="text-sm font-semibold">
              Receipt — {order.externalRef ?? order.transactionId.slice(0, 20) + "…"}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[75vh] overflow-y-auto">
            <ReceiptCard
              storeName={settings?.storeName ?? "Store"}
              storeLogoUrl={settings?.logoUrl}
              currencySymbol={settings?.currencySymbol ?? "KSh"}
              status={order.status}
              amount={order.amount}
              phoneNumber={order.phoneNumber}
              transactionId={order.transactionId}
              externalRef={order.externalRef}
              mpesaRef={order.mpesaRef}
              createdAt={order.createdAt}
              cartSnapshot={order.cartSnapshot}
              hideActions
            />
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
