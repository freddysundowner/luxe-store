import { pgTable, text, serial, timestamp, integer, numeric, jsonb } from "drizzle-orm/pg-core";

export interface GiftItem {
  productId: number;
  name: string;
  price: number;
  imageUrl?: string | null;
  quantity: number;
}

export const giftsTable = pgTable("gifts", {
  id: serial("id").primaryKey(),
  claimToken: text("claim_token").notNull().unique(),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull(),
  productPrice: numeric("product_price", { precision: 10, scale: 2 }).notNull(),
  productImageUrl: text("product_image_url"),
  // Full snapshot of every item in this gift. When null/empty, the gift is a
  // legacy single-item gift represented by the productId/productName/...
  // columns above. When present, it carries the truth — productPrice is the
  // SUM across items[] and the single-product columns are the first item
  // (kept for back-compat with admin views and the M-Pesa price guard).
  items: jsonb("items").$type<GiftItem[]>(),
  recipientName: text("recipient_name"),
  note: text("note"),
  senderName: text("sender_name"),
  paymentMethod: text("payment_method").notNull().default("whatsapp"),
  paymentRef: text("payment_ref"),
  status: text("status").notNull().default("pending"),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Gift = typeof giftsTable.$inferSelect;
export type InsertGift = typeof giftsTable.$inferInsert;

export const giftStatusValues = ["pending", "paid", "claimed"] as const;
export type GiftStatus = typeof giftStatusValues[number];
