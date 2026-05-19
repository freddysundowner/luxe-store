import { pgTable, text, serial, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  transactionId: text("transaction_id").notNull().unique(),
  checkoutRequestId: text("checkout_request_id"),
  phoneNumber: text("phone_number").notNull(),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("pending"),
  externalRef: text("external_ref"),
  mpesaRef: text("mpesa_ref"),
  cartSnapshot: jsonb("cart_snapshot"),
  stockApplied: boolean("stock_applied").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Payment = typeof paymentsTable.$inferSelect;
export type InsertPayment = typeof paymentsTable.$inferInsert;

export const paymentStatusValues = ["pending", "completed", "failed"] as const;
export type PaymentStatus = typeof paymentStatusValues[number];
