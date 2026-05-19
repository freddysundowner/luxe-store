import type { AdminPayment } from "@workspace/api-client-react";
import { useGetSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingBag, Phone, CheckCircle2, Clock, XCircle,
  Hash, Package, CreditCard, Calendar, RefreshCw,
  MessageCircle, ExternalLink, User, MapPin, Mail,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

export function statusBadge(status: string) {
  if (status === "completed")
    return <Badge className="bg-green-600/20 text-green-400 border-green-700/40 text-xs px-2 py-0.5 gap-1"><CheckCircle2 className="w-3 h-3" />Paid</Badge>;
  if (status === "failed")
    return <Badge className="bg-red-600/20 text-red-400 border-red-700/40 text-xs px-2 py-0.5 gap-1"><XCircle className="w-3 h-3" />Failed</Badge>;
  return <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-700/40 text-xs px-2 py-0.5 gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
}

export function formatPhone(phone: string) {
  if (phone.startsWith("254") && phone.length === 12)
    return `+254 ${phone.slice(3, 6)} ${phone.slice(6, 9)} ${phone.slice(9)}`;
  return phone;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-KE", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

interface CartItem { name: string; quantity: number; price: number; imageUrl?: string }
interface CartCustomer { name?: string; email?: string; address?: string }
interface CartSnapshot { items?: CartItem[]; total?: number; customer?: CartCustomer }

function Row({
  label, value, mono, bold, small, icon,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean; bold?: boolean; small?: boolean; icon?: React.ReactNode;
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

function SectionLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
      {icon}{children}
    </h2>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface Props {
  order: AdminPayment;
  /** Two-column layout (used on the full detail page). Single-column when false (modal). */
  twoColumn?: boolean;
}

export function OrderDetailPanel({ order, twoColumn = false }: Props) {
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });

  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const receiptUrl = `${window.location.origin}${base}/receipt/${order.transactionId}`;

  const cart = order.cartSnapshot as CartSnapshot | null;
  const items: CartItem[] = cart?.items ?? [];
  const customer: CartCustomer | undefined = cart?.customer;

  const shareReceiptToWhatsApp = () => {
    if (!settings?.whatsappNumber) return;
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
      items.forEach(i => { msg += `  - ${i.quantity}x ${i.name} — ${sym} ${(i.price * i.quantity).toLocaleString()}\n`; });
      msg += `\n`;
    }
    msg += `*Total: ${sym} ${order.amount.toLocaleString()}*\n\n`;
    msg += `*View receipt:* ${receiptUrl}`;
    window.open(`https://wa.me/${order.phoneNumber}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // ── Items section ──
  const itemsSection = items.length > 0 ? (
    <section>
      <SectionLabel icon={<Package className="w-3.5 h-3.5" />}>Items Ordered</SectionLabel>
      <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5">
            {item.imageUrl
              ? <img src={item.imageUrl} alt={item.name} className="w-9 h-9 rounded object-cover flex-shrink-0" />
              : <div className="w-9 h-9 rounded bg-muted flex items-center justify-center flex-shrink-0"><ShoppingBag className="w-4 h-4 text-muted-foreground" /></div>
            }
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{item.name}</p>
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
    <section>
      <SectionLabel icon={null}>Cart Data</SectionLabel>
      <pre className="text-[10px] bg-muted/50 rounded-lg p-3 overflow-x-auto text-muted-foreground">
        {JSON.stringify(cart, null, 2)}
      </pre>
    </section>
  ) : null;

  // ── Customer section ──
  const customerSection = (
    <section>
      <SectionLabel icon={<Phone className="w-3.5 h-3.5" />}>Customer</SectionLabel>
      <div className="rounded-lg border border-border divide-y divide-border">
        <Row label="Phone" value={formatPhone(order.phoneNumber)} mono icon={<Phone className="w-3 h-3" />} />
        {customer?.name && <Row label="Name" value={customer.name} icon={<User className="w-3 h-3" />} />}
        {customer?.email && <Row label="Email" value={customer.email} icon={<Mail className="w-3 h-3" />} />}
        {customer?.address && <Row label="Address" value={customer.address} icon={<MapPin className="w-3 h-3" />} />}
      </div>
    </section>
  );

  // ── Payment section ──
  const paymentSection = (
    <section>
      <SectionLabel icon={<CreditCard className="w-3.5 h-3.5" />}>Payment</SectionLabel>
      <div className="rounded-lg border border-border divide-y divide-border">
        <Row label="Amount" value={`KSh ${order.amount.toLocaleString()}`} bold />
        <Row label="Status" value={<span className="capitalize">{order.status}</span>} />
        {order.mpesaRef && <Row label="M-Pesa Ref" value={order.mpesaRef} mono icon={<Hash className="w-3 h-3" />} />}
        {order.externalRef && <Row label="Order Ref" value={order.externalRef} mono />}
        <Row label="Transaction ID" value={order.transactionId} mono small />
        {order.checkoutRequestId && <Row label="Checkout ID" value={order.checkoutRequestId} mono small />}
      </div>
    </section>
  );

  // ── Timeline section ──
  const timelineSection = (
    <section>
      <SectionLabel icon={<Calendar className="w-3.5 h-3.5" />}>Timeline</SectionLabel>
      <div className="rounded-lg border border-border divide-y divide-border">
        <Row label="Created" value={formatDate(order.createdAt)} />
        {order.updatedAt && order.updatedAt !== order.createdAt && (
          <Row label="Updated" value={formatDate(order.updatedAt)} icon={<RefreshCw className="w-3 h-3" />} />
        )}
      </div>
    </section>
  );

  // ── Actions ──
  const actionsSection = (
    <section className="flex gap-2">
      <Button
        className="flex-1 gap-1.5 bg-[#25D366] hover:bg-[#1fba59] text-white border-0 h-9 text-xs"
        onClick={shareReceiptToWhatsApp}
        disabled={!settings?.whatsappNumber}
        title={!settings?.whatsappNumber ? "Set a WhatsApp number in Settings first" : undefined}
      >
        <MessageCircle className="w-3.5 h-3.5" />Share Receipt
      </Button>
      <Button
        variant="outline"
        className="flex-1 gap-1.5 h-9 text-xs"
        onClick={() => window.open(receiptUrl, "_blank")}
      >
        <ExternalLink className="w-3.5 h-3.5" />Open Receipt
      </Button>
    </section>
  );

  if (twoColumn) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
        <div className="space-y-3">
          {itemsSection}
          {customerSection}
        </div>
        <div className="space-y-3">
          {paymentSection}
          {timelineSection}
          <Separator />
          {actionsSection}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {itemsSection}
      {customerSection}
      <Separator />
      {paymentSection}
      <Separator />
      {timelineSection}
      <Separator />
      {actionsSection}
    </div>
  );
}
