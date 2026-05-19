/**
 * Idempotent seed for a fresh Luxe Store install.
 *
 * - Skips entirely if products already exist (so re-running install.sh on a
 *   live shop never overwrites the merchant's catalogue).
 * - Otherwise inserts a handful of categories, availability tags, a settings
 *   row, sample products and one bundle so the storefront has something to
 *   show on day one.
 *
 * Run with:  pnpm --filter @workspace/db exec tsx scripts/seed.ts
 */
import { db, pool, categoriesTable, productsTable, storeSettingsTable, availabilityTagsTable } from "../src/index";
import { sql } from "drizzle-orm";

async function main() {
  const existing = await db.select().from(productsTable).limit(1);
  if (existing.length > 0) {
    console.log(`[seed] products table already populated — skipping seed.`);
    return;
  }

  console.log("[seed] empty database detected, inserting sample data…");

  // Store settings
  const [existingSettings] = await db.select().from(storeSettingsTable).limit(1);
  if (!existingSettings) {
    await db.insert(storeSettingsTable).values({
      storeName: "Luxe Store",
      storeDescription: "Curated luxury gifts and lifestyle products.",
      whatsappNumber: "",
      currency: "KES",
      currencySymbol: "KSh",
      priceTiers: [
        { name: "Under Ksh 500", min: 0, max: 500 },
        { name: "Ksh 500 – 2,000", min: 500, max: 2000 },
        { name: "Ksh 2,000 – 5,000", min: 2000, max: 5000 },
        { name: "Over Ksh 5,000", min: 5000, max: null },
      ],
      sunpayEnabled: "false",
    });
  }

  // Availability tags
  await db.insert(availabilityTagsTable).values([
    { value: "new-arrival",     label: "New Arrival",     sortOrder: 1 },
    { value: "bestseller",      label: "Bestseller",      sortOrder: 2 },
    { value: "limited-edition", label: "Limited Edition", sortOrder: 3 },
    { value: "sale",            label: "Sale",            sortOrder: 4 },
  ]).onConflictDoNothing();

  // Categories
  const cats = await db.insert(categoriesTable).values([
    { name: "Beauty", description: "Skincare, fragrance and self-care" },
    { name: "Electronics", description: "Gadgets and accessories" },
    { name: "Fashion", description: "Apparel and accessories" },
    { name: "Home & Living", description: "Décor and home essentials" },
  ]).returning();
  const byName = (n: string) => cats.find((c) => c.name === n)!.id;

  // Sample products
  const products = await db.insert(productsTable).values([
    {
      name: "Wireless Bluetooth Earbuds",
      description: "Premium noise-cancelling earbuds with 30-hour battery life.",
      price: "3500",
      originalPrice: "5000",
      categoryId: byName("Electronics"),
      imageUrl: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800",
      images: [],
      kind: "simple",
      stockQuantity: 25,
      isActive: true,
    },
    {
      name: "Smart Watch Pro",
      description: "Fitness tracking, sleep insights, and always-on display.",
      price: "4500",
      originalPrice: "6000",
      categoryId: byName("Electronics"),
      imageUrl: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800",
      images: [],
      kind: "simple",
      stockQuantity: 18,
      isActive: true,
    },
    {
      name: "Power Bank 20,000mAh",
      description: "Fast-charging portable battery for travel and outdoors.",
      price: "2200",
      categoryId: byName("Electronics"),
      imageUrl: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800",
      images: [],
      kind: "simple",
      stockQuantity: 40,
      isActive: true,
    },
    {
      name: "Perfume Eau de Parfum 50ml",
      description: "A timeless floral fragrance for every occasion.",
      price: "3800",
      originalPrice: "5000",
      categoryId: byName("Beauty"),
      imageUrl: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=800",
      images: [],
      kind: "simple",
      stockQuantity: 12,
      isActive: true,
    },
    {
      name: "Modern Table Lamp",
      description: "Minimalist matte-black bedside lamp with warm LED.",
      price: "3500",
      categoryId: byName("Home & Living"),
      imageUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800",
      images: [],
      kind: "simple",
      stockQuantity: 9,
      isActive: true,
    },
    {
      name: "Vitamin C Brightening Serum",
      description: "Daily antioxidant boost for radiant, even-toned skin.",
      price: "1900",
      originalPrice: "2800",
      categoryId: byName("Beauty"),
      imageUrl: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800",
      images: [],
      kind: "simple",
      stockQuantity: 30,
      isActive: true,
    },
  ]).returning();

  const earbudsId = products.find((p) => p.name.includes("Earbuds"))!.id;
  const watchId = products.find((p) => p.name.includes("Watch"))!.id;
  const powerBankId = products.find((p) => p.name.includes("Power Bank"))!.id;

  // One bundle (no cover image — the gold gift-box graphic will render)
  await db.insert(productsTable).values({
    name: "Tech Lover Gift Set",
    description: "A curated bundle of our favourite tech essentials, beautifully gift-wrapped.",
    price: "9500",
    originalPrice: "11700",
    categoryId: byName("Electronics"),
    imageUrl: null,
    images: [],
    kind: "bundle",
    bundleItems: [
      { productId: earbudsId, quantity: 1 },
      { productId: watchId, quantity: 1 },
      { productId: powerBankId, quantity: 1 },
    ],
    stockQuantity: 0,
    isActive: true,
  });

  console.log(`[seed] inserted ${products.length + 1} products, ${cats.length} categories, settings row.`);
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error("[seed] failed:", err);
    await pool.end();
    process.exit(1);
  });
