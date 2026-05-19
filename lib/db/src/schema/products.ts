import { pgTable, text, serial, timestamp, numeric, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Per-image display settings, keyed by image URL. Keys not present default to
// `{ fit: "cover", focalX: 50, focalY: 50 }` everywhere, so old products keep
// rendering exactly as before.
export interface ImageDisplaySettings {
  fit: "cover" | "contain";
  focalX: number; // 0–100 (percentage)
  focalY: number; // 0–100 (percentage)
}

// One entry per component product in a bundle (kind='bundle'). Embedded as
// jsonb because items are always read/written together with the parent
// product and never queried independently. Stock for a bundle is derived
// from component product availability at read-time.
export interface BundleItem {
  productId: number;
  quantity: number;
}

// `kind` distinguishes simple products (the historical default) from
// bundles, which are curated multi-product gift sets (formerly "hampers").
// Bundles ignore `stockQuantity`/`variants` — their availability is computed
// from the items list.
export type ProductKind = "simple" | "bundle";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: numeric("original_price", { precision: 10, scale: 2 }),
  categoryId: integer("category_id"),
  imageUrl: text("image_url"),
  images: text("images").array().notNull().default([]),
  imageSettings: jsonb("image_settings").$type<Record<string, ImageDisplaySettings>>().notNull().default({}),
  inStock: boolean("in_stock").notNull().default(true),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  isDropship: boolean("is_dropship").notNull().default(false),
  isFeatured: boolean("is_featured").notNull().default(false),
  availabilityTag: text("availability_tag"),
  kind: text("kind").$type<ProductKind>().notNull().default("simple"),
  bundleItems: jsonb("bundle_items").$type<BundleItem[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const productVariantsTable = pgTable("product_variants", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
export type ProductVariant = typeof productVariantsTable.$inferSelect;
