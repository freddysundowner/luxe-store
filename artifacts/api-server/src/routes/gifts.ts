import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { randomBytes } from "crypto";
import { db, giftsTable } from "@workspace/db";
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
  paymentMethod: "whatsapp" | "mpesa";
  paymentRef?: string;
}

function validateCreateGift(body: unknown): { data: CreateGiftBodyType } | { error: string } {
  const b = body as Record<string, unknown>;
  if (!b || typeof b.productId !== "number" || typeof b.productName !== "string" || typeof b.productPrice !== "number") {
    return { error: "productId, productName and productPrice are required" };
  }
  if (b.paymentMethod !== "whatsapp" && b.paymentMethod !== "mpesa") {
    return { error: "paymentMethod must be 'whatsapp' or 'mpesa'" };
  }
  return { data: b as unknown as CreateGiftBodyType };
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

  // WhatsApp gifts start as "paid" immediately — sender self-certifies payment
  // M-Pesa gifts start as "pending" until webhook / manual mark-paid
  const status = d.paymentMethod === "whatsapp" ? "paid" : "pending";

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
  const [gift] = await db
    .select()
    .from(giftsTable)
    .where(eq(giftsTable.claimToken, req.params.token))
    .limit(1);

  if (!gift) {
    res.status(404).json({ error: "Gift not found" });
    return;
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

export default router;
