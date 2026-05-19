/**
 * One-shot migration: copy every row from `hampers` into `products` with
 * kind='bundle'. Safe to re-run — products created from a hamper carry the
 * source hamper id in their name suffix `[bundle:<id>]` (stripped on read in
 * the API) so we can detect already-migrated rows and skip them.
 *
 * After running this, the `hampers` table can be dropped manually once
 * confidence is high. We keep it for now as a backup.
 *
 * Usage:
 *   pnpm --filter @workspace/db exec tsx scripts/migrate-hampers-to-products.ts
 */
import { sql } from "drizzle-orm";
import { db, hampersTable, productsTable } from "../src/index";

async function main() {
  const hampers = await db.select().from(hampersTable);
  console.log(`Found ${hampers.length} hamper(s) to migrate.`);

  for (const h of hampers) {
    // Detect already-migrated: a bundle product whose imported_from_hamper_id
    // matches this hamper's id. We stash that as a side-channel in the
    // description prefix `[bundle:<hamperId>]` for idempotency.
    const marker = `[bundle:${h.id}]`;
    const existing = await db.execute(sql`
      SELECT id FROM products
      WHERE kind = 'bundle' AND description LIKE ${`${marker}%`}
      LIMIT 1
    `);
    if (existing.rows.length > 0) {
      console.log(`  hamper #${h.id} (${h.name}) already migrated → product #${(existing.rows[0] as { id: number }).id}, skip.`);
      continue;
    }
    const descWithMarker = `${marker}${h.description ? "\n" + h.description : ""}`;
    const [created] = await db.insert(productsTable).values({
      name: h.name,
      description: descWithMarker,
      price: h.price,
      imageUrl: h.imageUrl,
      images: h.imageUrl ? [h.imageUrl] : [],
      isActive: h.isActive,
      isFeatured: h.isFeatured,
      kind: "bundle",
      bundleItems: h.items ?? [],
      stockQuantity: 0,
      inStock: true,
    }).returning();
    console.log(`  hamper #${h.id} (${h.name}) → product #${created.id}.`);
  }
  console.log("Migration complete.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
