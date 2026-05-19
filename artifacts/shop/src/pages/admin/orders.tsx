import { useLocation } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListAdminPayments, getListAdminPaymentsQueryKey } from "@workspace/api-client-react";
import type { AdminPayment } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShoppingBag, Phone, CheckCircle2, Clock, XCircle,
  Hash, ChevronRight,
} from "lucide-react";

// ── helpers ───────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  if (status === "completed")
    return <Badge className="bg-green-600/20 text-green-400 border-green-700/40 hover:bg-green-600/30 gap-1"><CheckCircle2 className="w-3 h-3" />Paid</Badge>;
  if (status === "failed")
    return <Badge className="bg-red-600/20 text-red-400 border-red-700/40 hover:bg-red-600/30 gap-1"><XCircle className="w-3 h-3" />Failed</Badge>;
  return <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-700/40 hover:bg-yellow-600/30 gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
}

function formatPhone(phone: string) {
  if (phone.startsWith("254") && phone.length === 12)
    return `+254 ${phone.slice(3, 6)} ${phone.slice(6, 9)} ${phone.slice(9)}`;
  return phone;
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleString("en-KE", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AdminOrders() {
  const [, navigate] = useLocation();

  const { data: orders, isLoading } = useListAdminPayments({
    query: { queryKey: getListAdminPaymentsQueryKey(), refetchInterval: 30_000 },
  });

  const total = orders?.length ?? 0;
  const paid = orders?.filter((o: AdminPayment) => o.status === "completed").length ?? 0;
  const revenue = orders?.filter((o: AdminPayment) => o.status === "completed").reduce((s: number, o: AdminPayment) => s + o.amount, 0) ?? 0;

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
            {orders.map((order: AdminPayment) => (
              <button
                key={order.id}
                onClick={() => navigate(`/admin/orders/${order.transactionId}`)}
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
    </AdminLayout>
  );
}
