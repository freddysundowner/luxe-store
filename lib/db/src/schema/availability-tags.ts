import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

export const availabilityTagsTable = pgTable("availability_tags", {
  id: serial("id").primaryKey(),
  value: text("value").notNull().unique(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AvailabilityTag = typeof availabilityTagsTable.$inferSelect;
