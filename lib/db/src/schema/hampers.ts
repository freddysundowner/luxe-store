import { pgTable, text, serial, timestamp, numeric, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// A hamper is a named bundle of products sold as a single gift. Items are
// embedded as jsonb because they're always read/written together with the
// hamper and never queried independently. Stock for the hamper as a whole
// is computed from the component products at read-time.
export interface HamperItem {
  productId: number;
  quantity: number;
}

export const hampersTable = pgTable("hampers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  // Hamper price is admin-set (not auto-derived) so it can include gift
  // wrap / markup / discount versus the sum of component prices.
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  items: jsonb("items").$type<HamperItem[]>().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertHamperSchema = createInsertSchema(hampersTable).omit({
  id: true,
  createdAt: true,
});

export type Hamper = typeof hampersTable.$inferSelect;
export type InsertHamper = z.infer<typeof insertHamperSchema>;
