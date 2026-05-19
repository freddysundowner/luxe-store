import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const storeSettingsTable = pgTable("store_settings", {
  id: serial("id").primaryKey(),
  storeName: text("store_name").notNull().default("My Shop"),
  storeDescription: text("store_description"),
  whatsappNumber: text("whatsapp_number").notNull().default(""),
  logoUrl: text("logo_url"),
  currency: text("currency").notNull().default("KES"),
  currencySymbol: text("currency_symbol").notNull().default("KSh"),
  priceTiers: jsonb("price_tiers").$type<Array<{ name: string; min: number; max: number | null }>>(),
  sunpayApiKey: text("sunpay_api_key"),
  sunpayEnabled: text("sunpay_enabled").notNull().default("false"),
  brevoApiKey: text("brevo_api_key"),
  brevoSenderEmail: text("brevo_sender_email"),
  brevoSenderName: text("brevo_sender_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertStoreSettingsSchema = createInsertSchema(storeSettingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStoreSettings = z.infer<typeof insertStoreSettingsSchema>;
export type StoreSettings = typeof storeSettingsTable.$inferSelect;
