import type { StoreSettings } from "@workspace/db";

interface CartItem {
  name: string;
  quantity: number;
  price: number | string;
  imageUrl?: string | null;
}

interface CartCustomer {
  name?: string;
  email?: string;
  address?: string;
}

export interface OrderEmailInput {
  settings: Pick<
    StoreSettings,
    "brevoApiKey" | "brevoSenderEmail" | "brevoSenderName" | "storeName" | "currencySymbol"
  >;
  customer: CartCustomer;
  items: CartItem[];
  total: number | string;
  transactionId: string;
  mpesaRef?: string | null;
  receiptUrl?: string;
}

export interface SendOrderEmailResult {
  sent: boolean;
  reason?: string;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMoney(amount: number | string, symbol: string): string {
  const n = typeof amount === "number" ? amount : Number(amount);
  return `${symbol} ${Number.isFinite(n) ? n.toFixed(2) : amount}`;
}

function buildHtml(input: OrderEmailInput): string {
  const symbol = input.settings.currencySymbol || "KSh";
  const storeName = input.settings.storeName || "Store";
  const rows = input.items
    .map((it) => {
      const lineTotal = Number(it.price) * Number(it.quantity);
      return `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(it.name)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${it.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${formatMoney(lineTotal, symbol)}</td>
        </tr>`;
    })
    .join("");

  return `<!doctype html>
<html><body style="font-family:Arial,sans-serif;background:#f7f7f7;padding:20px;color:#111;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #eee;">
    <div style="background:#25D366;color:#fff;padding:18px 22px;">
      <h2 style="margin:0;font-size:18px;">${escapeHtml(storeName)} — Order Confirmed ✅</h2>
    </div>
    <div style="padding:20px 22px;">
      <p>Hi ${escapeHtml(input.customer.name || "there")},</p>
      <p>Thanks for your order! We've received your payment and are processing your order.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <thead>
          <tr style="background:#fafafa;">
            <th style="padding:8px 12px;text-align:left;border-bottom:1px solid #eee;">Item</th>
            <th style="padding:8px 12px;text-align:center;border-bottom:1px solid #eee;">Qty</th>
            <th style="padding:8px 12px;text-align:right;border-bottom:1px solid #eee;">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding:10px 12px;text-align:right;font-weight:bold;">Total</td>
            <td style="padding:10px 12px;text-align:right;font-weight:bold;">${formatMoney(input.total, symbol)}</td>
          </tr>
        </tfoot>
      </table>
      ${input.customer.address ? `<p><strong>Delivery to:</strong> ${escapeHtml(input.customer.address)}</p>` : ""}
      <p><strong>Order ref:</strong> ${escapeHtml(input.transactionId)}${input.mpesaRef ? ` &middot; <strong>M-Pesa:</strong> ${escapeHtml(input.mpesaRef)}` : ""}</p>
      ${input.receiptUrl ? `<p><a href="${escapeHtml(input.receiptUrl)}" style="display:inline-block;background:#25D366;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">View Receipt</a></p>` : ""}
      <p style="color:#666;font-size:12px;margin-top:24px;">— ${escapeHtml(storeName)}</p>
    </div>
  </div>
</body></html>`;
}

export async function sendOrderConfirmationEmail(
  input: OrderEmailInput,
  log?: { info: (...a: unknown[]) => void; warn: (...a: unknown[]) => void; error: (...a: unknown[]) => void }
): Promise<SendOrderEmailResult> {
  const { settings, customer } = input;

  if (!settings.brevoApiKey) return { sent: false, reason: "Brevo API key not configured" };
  if (!settings.brevoSenderEmail) return { sent: false, reason: "Brevo sender email not configured" };
  if (!customer.email) return { sent: false, reason: "No customer email" };

  const payload = {
    sender: {
      email: settings.brevoSenderEmail,
      name: settings.brevoSenderName || settings.storeName || "Store",
    },
    to: [{ email: customer.email, name: customer.name || customer.email }],
    subject: `Order confirmed — ${settings.storeName || "Store"}`,
    htmlContent: buildHtml(input),
  };

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": settings.brevoApiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      log?.error({ status: res.status, body }, "Brevo email send failed");
      return { sent: false, reason: `Brevo ${res.status}: ${body.slice(0, 200)}` };
    }

    log?.info({ to: customer.email, transactionId: input.transactionId }, "Order confirmation email sent");
    return { sent: true };
  } catch (err) {
    log?.error({ err }, "Brevo email send error");
    return { sent: false, reason: (err as Error).message };
  }
}
