import { Router } from "express";
import { eq, desc, and, sql } from "drizzle-orm";
import { randomBytes } from "crypto";
import { db, giftsTable, paymentsTable } from "@workspace/db";
const router = Router();

function makeToken() {
  return randomBytes(12).toString("base64url");
}

interface CreateGiftBodyType {
  productId: number;
  productName: string;
  productPrice: number;
  productImageUrl?: string;
  recipientName?: string;
  note?: string;
  senderName?: string;
  // Kept on the type for backwards-compat with the OpenAPI schema, but the
  // sender flow now only supports M-Pesa. WhatsApp self-checkout was removed
  // (gifts must be paid for before they can be shared).
  paymentMethod: "mpesa";
  paymentRef?: string;
}

function validateCreateGift(body: unknown): { data: CreateGiftBodyType } | { error: string } {
  const b = body as Record<string, unknown>;
  if (!b || typeof b.productId !== "number" || typeof b.productName !== "string" || typeof b.productPrice !== "number") {
    return { error: "productId, productName and productPrice are required" };
  }
  // Only M-Pesa is supported now. Older clients sending `paymentMethod:
  // "whatsapp"` are silently coerced — server treats every gift as pending
  // until the linked M-Pesa payment completes.
  const data = { ...b, paymentMethod: "mpesa" } as unknown as CreateGiftBodyType;
  return { data };
}

function serializeGift(g: typeof giftsTable.$inferSelect) {
  return {
    id: g.id,
    claimToken: g.claimToken,
    productId: g.productId,
    productName: g.productName,
    productPrice: Number(g.productPrice),
    productImageUrl: g.productImageUrl ?? null,
    recipientName: g.recipientName ?? null,
    note: g.note ?? null,
    senderName: g.senderName ?? null,
    paymentMethod: g.paymentMethod,
    paymentRef: g.paymentRef ?? null,
    status: g.status,
    claimedAt: g.claimedAt?.toISOString() ?? null,
    createdAt: g.createdAt.toISOString(),
  };
}

// ── POST /gifts ──────────────────────────────────────────────────────────────
router.post("/gifts", async (req, res): Promise<void> => {
  const parsed = validateCreateGift(req.body);
  if ("error" in parsed) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const d = parsed.data;
  const claimToken = makeToken();

  // Every gift starts as "pending" until the linked M-Pesa payment completes
  // (webhook or polled status will flip it to "paid" via markGiftPaidForRef).
  const status = "pending";

  const [gift] = await db.insert(giftsTable).values({
    claimToken,
    productId: d.productId,
    productName: d.productName,
    productPrice: String(d.productPrice),
    productImageUrl: d.productImageUrl,
    recipientName: d.recipientName,
    note: d.note,
    senderName: d.senderName,
    paymentMethod: d.paymentMethod,
    paymentRef: d.paymentRef,
    status,
  }).returning();

  res.status(201).json(serializeGift(gift));
});

// ── GET /gifts/:token ────────────────────────────────────────────────────────
router.get("/gifts/:token", async (req, res): Promise<void> => {
  let [gift] = await db
    .select()
    .from(giftsTable)
    .where(eq(giftsTable.claimToken, req.params.token))
    .limit(1);

  if (!gift) {
    res.status(404).json({ error: "Gift not found" });
    return;
  }

  // Self-heal: if the gift is still pending but a completed payment exists
  // for its GIFT-<token> external ref, flip it now. Covers the rare case
  // where the webhook/poll-completion path didn't run (e.g. server restart
  // between SunPay completion and notification, or transient error in the
  // post-payment side-effects). Without this, a paid gift can be stuck
  // "pending" forever from the recipient's view.
  if (gift.status === "pending") {
    const [pmt] = await db
      .select()
      .from(paymentsTable)
      .where(
        and(
          eq(paymentsTable.externalRef, `GIFT-${req.params.token}`),
          eq(paymentsTable.status, "completed"),
        ),
      )
      .limit(1);
    if (pmt) {
      await markGiftPaidForExternalRef({
        externalRef: pmt.externalRef,
        amount: Number(pmt.amount),
        status: pmt.status,
        transactionId: pmt.transactionId,
        mpesaRef: pmt.mpesaRef ?? null,
      });
      [gift] = await db
        .select()
        .from(giftsTable)
        .where(eq(giftsTable.claimToken, req.params.token))
        .limit(1);
    }
  }

  res.json(serializeGift(gift));
});

// ── POST /gifts/:token/claim ─────────────────────────────────────────────────
router.post("/gifts/:token/claim", async (req, res): Promise<void> => {
  const [gift] = await db
    .select()
    .from(giftsTable)
    .where(eq(giftsTable.claimToken, req.params.token))
    .limit(1);

  if (!gift) {
    res.status(404).json({ error: "Gift not found" });
    return;
  }

  if (gift.status === "claimed") {
    res.json(serializeGift(gift));
    return;
  }

  if (gift.status === "pending") {
    res.status(400).json({ error: "This gift has not been paid for yet." });
    return;
  }

  const [updated] = await db
    .update(giftsTable)
    .set({ status: "claimed", claimedAt: new Date() })
    .where(eq(giftsTable.claimToken, req.params.token))
    .returning();

  res.json(serializeGift(updated));
});

// ── GET /admin/gifts ─────────────────────────────────────────────────────────
router.get("/admin/gifts", async (_req, res): Promise<void> => {
  const gifts = await db
    .select()
    .from(giftsTable)
    .orderBy(desc(giftsTable.createdAt))
    .limit(500);

  res.json(gifts.map(serializeGift));
});

// ── POST /admin/gifts/:id/mark-paid ──────────────────────────────────────────
router.post("/admin/gifts/:id/mark-paid", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const [updated] = await db
    .update(giftsTable)
    .set({ status: "paid" })
    .where(eq(giftsTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Gift not found" }); return; }

  res.json(serializeGift(updated));
});

// Mark the gift linked to a payment as paid. Called from the payments webhook
// + status poller. The link is by `externalRef = "GIFT-<claimToken>"` which
// the client sets when initiating the M-Pesa STK push.
//
// Security guards (architect-flagged):
//   - Only flips gifts that are currently `pending` — prevents a malicious
//     client from regressing a `claimed` / `refunded` gift back to `paid` by
//     replaying a payment.
//   - Requires the payment to be `completed` AND its amount to cover the gift
//     price — prevents a "cheap payment, expensive gift" unlock by forging an
//     `externalRef` that points at someone else's gift.
//   - Stamps the payment's transaction reference on the gift for traceability.
export async function markGiftPaidForExternalRef(payment: {
  externalRef: string | null;
  amount: number;
  status: string;
  transactionId: string;
  mpesaRef?: string | null;
}): Promise<void> {
  if (!payment.externalRef || !payment.externalRef.startsWith("GIFT-")) return;
  if (payment.status !== "completed") return;
  const token = payment.externalRef.slice("GIFT-".length);
  if (!token) return;

  await db
    .update(giftsTable)
    .set({
      status: "paid",
      paymentRef: payment.mpesaRef ?? payment.transactionId,
    })
    .where(
      and(
        eq(giftsTable.claimToken, token),
        eq(giftsTable.status, "pending"),
        // productPrice is a numeric/decimal column — cast on the SQL side so
        // the comparison happens in numeric space, not string space.
        sql`${giftsTable.productPrice}::numeric <= ${payment.amount}`,
      ),
    );
}

export default router;
