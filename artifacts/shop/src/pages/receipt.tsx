import { useParams, useLocation } from "wouter";
import { useGetPaymentReceipt, getGetPaymentReceiptQueryKey, useGetSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { XCircle, ArrowLeft } from "lucide-react";
import { ReceiptCard } from "@/components/ReceiptCard";

export default function ReceiptPage() {
  const { transactionId } = useParams<{ transactionId: string }>();
  const [, navigate] = useLocation();

  const { data: receipt, isLoading, isError } = useGetPaymentReceipt(transactionId!, {
    query: {
      queryKey: getGetPaymentReceiptQueryKey(transactionId!),
      enabled: !!transactionId,
      refetchInterval: (q) => {
        const s = (q.state.data as { status?: string } | undefined)?.status;
        return s === "pending" ? 4000 : false;
      },
    },
  });

  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });

  const buildShareUrl = () => {
    if (!settings?.whatsappNumber || !receipt) return null;
    const sym = receipt.currencySymbol ?? "KSh";
    const receiptUrl = `${window.location.origin}${import.meta.env.BASE_URL}receipt/${transactionId}`;
    const items = (receipt.cartSnapshot as { items?: { name: string; quantity: number; price: number }[] } | null)?.items ?? [];
    let msg = `*Order Receipt — ${receipt.storeName}*\n\n`;
    msg += `📋 *Ref:* ${receipt.externalRef ?? receipt.transactionId}\n`;
    if (receipt.mpesaRef) msg += `✅ *M-Pesa Ref:* ${receipt.mpesaRef}\n`;
    msg += `📱 *Phone:* ${receipt.phoneNumber}\n`;
    msg += `📅 *Date:* ${new Date(receipt.createdAt).toLocaleString("en-KE")}\n\n`;
    if (items.length > 0) {
      msg += `*Items:*\n`;
      items.forEach(i => { msg += `  • ${i.quantity}× ${i.name} — ${sym} ${(i.price * i.quantity).toLocaleString()}\n`; });
      msg += `\n`;
    }
    msg += `*Total: ${sym} ${receipt.amount.toLocaleString()}*\n\n`;
    msg += `🔗 View receipt: ${receiptUrl}`;
    return `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(msg)}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-zinc-800 border-t-[#D4AF37] rounded-full animate-spin mx-auto" />
          <p className="text-zinc-600 text-xs uppercase tracking-widest">Loading receipt…</p>
        </div>
      </div>
    );
  }

  if (isError || !receipt) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6">
        <div className="text-center space-y-4 max-w-sm">
          <XCircle className="w-12 h-12 text-red-500/60 mx-auto" />
          <p className="text-zinc-300 font-medium">Receipt not found</p>
          <p className="text-zinc-600 text-sm">This receipt link may be invalid or expired.</p>
          <button
            onClick={() => navigate("/")}
            className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-[#D4AF37] text-black text-xs uppercase tracking-widest font-medium hover:bg-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Store
          </button>
        </div>
      </div>
    );
  }

  const shareUrl = buildShareUrl();

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-md mx-auto pt-8 px-4">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-400 text-xs uppercase tracking-widest mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Store
        </button>
      </div>
      <ReceiptCard
        storeName={receipt.storeName}
        storeLogoUrl={receipt.storeLogoUrl}
        currencySymbol={receipt.currencySymbol ?? "KSh"}
        status={receipt.status}
        amount={receipt.amount}
        phoneNumber={receipt.phoneNumber}
        transactionId={receipt.transactionId}
        externalRef={receipt.externalRef}
        mpesaRef={receipt.mpesaRef}
        createdAt={receipt.createdAt}
        cartSnapshot={receipt.cartSnapshot}
        onShareToWhatsApp={shareUrl ? () => window.open(shareUrl, "_blank") : undefined}
        onContinueShopping={() => navigate("/")}
      />
    </div>
  );
}
