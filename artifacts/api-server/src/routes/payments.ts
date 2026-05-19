import { Router } from "express";
import { eq, desc, and, isNotNull, sql } from "drizzle-orm";
import { db, storeSettingsTable, paymentsTable, productsTable } from "@workspace/db";
import https from "node:https";
import { sendOrderConfirmationEmail } from "../lib/email";

interface OrderSnapshot {
  items?: Array<{ id?: number; productId?: number; name: string; quantity: number; price: number | string; imageUrl?: string | null }>;
  total?: number | string;
  customer?: { name?: string; email?: string; address?: string };
}

async function decrementStockForPayment(
  payment: typeof paymentsTable.$inferSelect,
  log: { info: (...a: unknown[]) => void; warn: (...a: unknown[]) => void; error: (...a: unknown[]) => void }
): Promise<void> {
  if (payment.stockApplied) return;

  // Atomically claim the right to decrement stock for this payment. If another
  // concurrent caller (e.g. webhook racing with status-poll) already claimed
  // it, we exit without touching stock.
  const claimed = await db
    .update(paymentsTable)
    .set({ stockApplied: true })
    .where(and(eq(paymentsTable.id, payment.id), eq(paymentsTable.stockApplied, false)))
    .returning({ id: paymentsTable.id });
  if (claimed.length === 0) return;

  const snapshot = (payment.cartSnapshot ?? {}) as OrderSnapshot;
  const items = snapshot.items ?? [];

  // Aggregate quantities per product in case the cart has duplicate lines.
  const perProduct = new Map<number, number>();
  for (const item of items) {
    const productId = item.productId ?? item.id;
    const qty = Number(item.quantity);
    if (!productId || !Number.isFinite(qty) || qty <= 0) continue;
    perProduct.set(productId, (perProduct.get(productId) ?? 0) + qty);
  }

  for (const [productId, qty] of perProduct) {
    try {
      // Atomic decrement in a single SQL statement. Skips untracked products
      // (NULL stockQuantity) and prevents lost updates from concurrent payments
      // for the same SKU.
      await db
        .update(productsTable)
        .set({
          stockQuantity: sql`GREATEST(0, ${productsTable.stockQuantity} - ${qty})`,
          inStock: sql`CASE WHEN GREATEST(0, ${productsTable.stockQuantity} - ${qty}) = 0 THEN false ELSE ${productsTable.inStock} END`,
        })
        .where(and(eq(productsTable.id, productId), isNotNull(productsTable.stockQuantity)));
    } catch (err) {
      log.warn({ err, productId }, "Failed to decrement product stock");
    }
  }
}

async function sendOrderEmailForPayment(
  payment: typeof paymentsTable.$inferSelect,
  log: { info: (...a: unknown[]) => void; warn: (...a: unknown[]) => void; error: (...a: unknown[]) => void }
): Promise<void> {
  const snapshot = (payment.cartSnapshot ?? {}) as OrderSnapshot;
  const customer = snapshot.customer ?? {};
  if (!customer.email) {
    log.info({ transactionId: payment.transactionId }, "Skipping order email — no customer email on record");
    return;
  }
  const settings = await getSettings();
  if (!settings) return;

  const result = await sendOrderConfirmationEmail(
    {
      settings,
      customer,
      items: snapshot.items ?? [],
      total: snapshot.total ?? payment.amount,
      transactionId: payment.transactionId,
      mpesaRef: payment.mpesaRef,
    },
    log
  );
  if (!result.sent) {
    log.warn({ transactionId: payment.transactionId, reason: result.reason }, "Order confirmation email not sent");
  }
}

const router = Router();

const SUNPAY_BASE = "https://sunpay.co.ke";

// SunPay's TLS cert doesn't match their hostname — bypass cert validation for their domain only
const sunpayAgent = new https.Agent({ rejectUnauthorized: false });

interface SunpayResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

function sunpayFetch(
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: string } = {}
): Promise<SunpayResponse> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname + u.search,
        method: options.method ?? "GET",
        headers: options.headers ?? {},
        agent: sunpayAgent,
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk: string) => { raw += chunk; });
        res.on("end", () => {
          const status = res.statusCode ?? 0;
          resolve({
            ok: status >= 200 && status < 300,
            status,
            json: () => Promise.resolve(JSON.parse(raw)),
            text: () => Promise.resolve(raw),
          });
        });
      }
    );
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function getSettings() {
  const rows = await db.select().from(storeSettingsTable).limit(1);
  return rows[0] ?? null;
}

// ── POST /payments/initiate ──────────────────────────────────────────────────
router.post("/payments/initiate", async (req, res): Promise<void> => {
  const settings = await getSettings();

  if (!settings?.sunpayApiKey || settings.sunpayEnabled !== "true") {
    res.status(503).json({ error: "M-Pesa payments are not configured or enabled." });
    return;
  }

  const { phoneNumber, amount, externalRef, cartSnapshot } = req.body as {
    phoneNumber: string;
    amount: number;
    externalRef?: string;
    cartSnapshot?: unknown;
  };

  if (!phoneNumber || !amount || amount < 1) {
    res.status(400).json({ error: "phoneNumber and amount (≥ 1) are required." });
    return;
  }

  // M-Pesa and the payments table both require whole-number amounts (KES)
  const amountInt = Math.round(amount);

  // Build callback URL from request host
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const callbackUrl = `${protocol}://${host}/api/webhooks/sunpay`;

  const ref = externalRef || `ORDER-${Date.now()}`;

  let sunpayRes: { success: boolean; message: string; transactionId: string; checkoutRequestId: string };
  try {
    const r = await sunpayFetch(`${SUNPAY_BASE}/api/v1/payments/stk-push`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.sunpayApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phoneNumber,
        amount: amountInt,
        externalRef: ref,
        callbackUrl,
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      req.log.error({ status: r.status, body: errText }, "SunPay STK push failed");
      res.status(502).json({ error: "Payment gateway error. Please try again." });
      return;
    }

    sunpayRes = await r.json() as typeof sunpayRes;
  } catch (err) {
    req.log.error({ err }, "SunPay fetch error");
    res.status(502).json({ error: "Could not reach payment gateway." });
    return;
  }

  if (!sunpayRes.success) {
    res.status(400).json({ error: sunpayRes.message || "STK push failed." });
    return;
  }

  // Persist payment record
  await db.insert(paymentsTable).values({
    transactionId: sunpayRes.transactionId,
    checkoutRequestId: sunpayRes.checkoutRequestId,
    phoneNumber,
    amount: amountInt,
    status: "pending",
    externalRef: ref,
    cartSnapshot: cartSnapshot as Record<string, unknown> | undefined,
  });

  res.json({
    success: true,
    message: sunpayRes.message,
    transactionId: sunpayRes.transactionId,
    checkoutRequestId: sunpayRes.checkoutRequestId,
  });
});

// ── GET /payments/:transactionId/status ─────────────────────────────────────
router.get("/payments/:transactionId/status", async (req, res): Promise<void> => {
  const { transactionId } = req.params;

  const [payment] = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.transactionId, transactionId))
    .limit(1);

  if (!payment) {
    res.status(404).json({ error: "Payment not found." });
    return;
  }

  // If still pending, refresh from SunPay
  if (payment.status === "pending") {
    const settings = await getSettings();
    if (settings?.sunpayApiKey) {
      try {
        const r = await sunpayFetch(`${SUNPAY_BASE}/api/v1/payments/${transactionId}`, {
          headers: { Authorization: `Bearer ${settings.sunpayApiKey}` },
        });
        if (r.ok) {
          const remote = await r.json() as {
            id: string;
            status: string;
            amount: string;
            phoneNumber: string;
            mpesaRef?: string;
          };
          const newStatus = remote.status as "pending" | "completed" | "failed";
          if (newStatus !== "pending") {
            await db
              .update(paymentsTable)
              .set({ status: newStatus, mpesaRef: remote.mpesaRef ?? null })
              .where(eq(paymentsTable.transactionId, transactionId));
            payment.status = newStatus;
            payment.mpesaRef = remote.mpesaRef ?? null;
            if (newStatus === "completed") {
              await decrementStockForPayment(payment, req.log).catch((err) =>
                req.log.error({ err }, "Stock decrement task failed")
              );
              sendOrderEmailForPayment(payment, req.log).catch((err) =>
                req.log.error({ err }, "Order email task failed")
              );
            }
          }
        }
      } catch {
        // Non-fatal — return cached status
      }
    }
  }

  res.json({
    id: payment.transactionId,
    status: payment.status,
    amount: payment.amount,
    phoneNumber: payment.phoneNumber,
    mpesaRef: payment.mpesaRef,
    createdAt: payment.createdAt,
  });
});

// ── POST /webhooks/sunpay ────────────────────────────────────────────────────
router.post("/webhooks/sunpay", async (req, res): Promise<void> => {
  const payload = req.body as {
    transactionId?: string;
    status?: string;
    mpesaRef?: string;
  };

  const tid = payload.transactionId;
  const status = payload.status as "pending" | "completed" | "failed" | undefined;

  if (tid && status) {
    await db
      .update(paymentsTable)
      .set({
        status,
        mpesaRef: payload.mpesaRef ?? null,
      })
      .where(eq(paymentsTable.transactionId, tid))
      .catch(() => {}); // non-fatal

    if (status === "completed") {
      const [updated] = await db
        .select()
        .from(paymentsTable)
        .where(eq(paymentsTable.transactionId, tid))
        .limit(1);
      if (updated) {
        await decrementStockForPayment(updated, req.log).catch((err) =>
          req.log.error({ err }, "Stock decrement task failed")
        );
        sendOrderEmailForPayment(updated, req.log).catch((err) =>
          req.log.error({ err }, "Order email task failed")
        );
      }
    }
  }

  res.json({ received: true });
});

// ── GET /payments/:transactionId/receipt ─────────────────────────────────────
router.get("/payments/:transactionId/receipt", async (req, res): Promise<void> => {
  const { transactionId } = req.params;

  const [payment] = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.transactionId, transactionId))
    .limit(1);

  if (!payment) {
    res.status(404).json({ error: "Receipt not found." });
    return;
  }

  const settings = await getSettings();

  res.json({
    transactionId: payment.transactionId,
    externalRef: payment.externalRef,
    status: payment.status,
    amount: payment.amount,
    phoneNumber: payment.phoneNumber,
    mpesaRef: payment.mpesaRef,
    cartSnapshot: payment.cartSnapshot,
    createdAt: payment.createdAt,
    storeName: settings?.storeName ?? "Store",
    storeLogoUrl: settings?.logoUrl ?? null,
    currencySymbol: settings?.currencySymbol ?? "KSh",
  });
});

// ── GET /admin/payments ──────────────────────────────────────────────────────
router.get("/admin/payments", async (req, res): Promise<void> => {
  const payments = await db
    .select()
    .from(paymentsTable)
    .orderBy(desc(paymentsTable.createdAt))
    .limit(200);

  res.json(
    payments.map((p) => ({
      id: p.id,
      transactionId: p.transactionId,
      checkoutRequestId: p.checkoutRequestId,
      phoneNumber: p.phoneNumber,
      amount: p.amount,
      status: p.status,
      mpesaRef: p.mpesaRef,
      externalRef: p.externalRef,
      cartSnapshot: p.cartSnapshot,
      updatedAt: p.updatedAt,
      createdAt: p.createdAt,
    }))
  );
});

export default router;
