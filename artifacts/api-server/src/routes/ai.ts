import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { and, eq } from "drizzle-orm";
import { db, productsTable, categoriesTable, storeSettingsTable } from "@workspace/db";
import type { BundleItem } from "@workspace/db";

const router = Router();

async function getClient() {
  // Prefer Replit's managed Anthropic integration when available (dev only —
  // no user-provided key needed, usage billed to Replit credits).
  const integrationKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
  const integrationBase = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
  if (integrationKey && integrationBase) {
    return new Anthropic({ apiKey: integrationKey, baseURL: integrationBase });
  }
  // Self-hosted: read the key from store_settings (admin Settings page).
  const rows = await db
    .select({ anthropicApiKey: storeSettingsTable.anthropicApiKey })
    .from(storeSettingsTable)
    .limit(1);
  const dbKey = rows[0]?.anthropicApiKey?.trim();
  if (dbKey) return new Anthropic({ apiKey: dbKey });
  // Last-resort env fallback (legacy installs).
  const envKey = process.env.ANTHROPIC_API_KEY;
  if (envKey) return new Anthropic({ apiKey: envKey });
  throw new Error("Anthropic credentials are not configured");
}

async function getActiveProducts() {
  const rows = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      price: productsTable.price,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      inStock: productsTable.inStock,
      isFeatured: productsTable.isFeatured,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
    .where(and(eq(productsTable.isActive, true), eq(productsTable.kind, "simple")));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    price: parseFloat(r.price as unknown as string),
    categoryId: r.categoryId,
    categoryName: r.categoryName,
    inStock: r.inStock,
    isFeatured: r.isFeatured,
  }));
}

function buildCatalogText(products: Awaited<ReturnType<typeof getActiveProducts>>, currency: string) {
  return products
    .map(
      (p) =>
        `ID:${p.id} | "${p.name}" | Category: ${p.categoryName ?? "Uncategorized"} | Price: ${currency} ${p.price.toFixed(2)} | In stock: ${p.inStock} | ${p.description ? p.description.slice(0, 80) : ""}`
    )
    .join("\n");
}

async function getCurrencySymbol(): Promise<string> {
  const rows = await db
    .select({ currencySymbol: storeSettingsTable.currencySymbol })
    .from(storeSettingsTable)
    .limit(1);
  return rows[0]?.currencySymbol?.trim() || "KSh";
}

async function getActiveHampers() {
  // Sourced from unified products table (kind='bundle'). The emitted `id` is
  // the product ID so GiftFinder's HAMPER:n marker resolves correctly via the
  // /api/hampers alias (which now returns product IDs).
  const rows = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      price: productsTable.price,
      bundleItems: productsTable.bundleItems,
    })
    .from(productsTable)
    .where(and(eq(productsTable.isActive, true), eq(productsTable.kind, "bundle")));
  return rows.map((h) => ({
    id: h.id,
    name: h.name,
    description: h.description,
    price: parseFloat(h.price as unknown as string),
    items: (h.bundleItems ?? []) as BundleItem[],
  }));
}

function buildHamperCatalogText(
  hampers: Awaited<ReturnType<typeof getActiveHampers>>,
  products: Awaited<ReturnType<typeof getActiveProducts>>,
  currency: string,
) {
  if (hampers.length === 0) return "(no curated hampers available)";
  const productNameById = new Map(products.map((p) => [p.id, p.name]));
  return hampers
    .map((h) => {
      const contents = h.items
        .map((i) => `${i.quantity}× ${productNameById.get(i.productId) ?? `product#${i.productId}`}`)
        .join(", ");
      return `HAMPER:${h.id} | "${h.name}" | Price: ${currency} ${h.price.toFixed(2)} | Contains: ${contents} | ${h.description ? h.description.slice(0, 100) : ""}`;
    })
    .join("\n");
}

router.post("/ai/suggest", async (req, res): Promise<void> => {
  const { messages } = req.body as {
    messages: { role: "user" | "assistant"; content: string }[];
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages array is required" });
    return;
  }

  try {
    const [products, hampers, currency] = await Promise.all([
      getActiveProducts(),
      getActiveHampers(),
      getCurrencySymbol(),
    ]);
    const catalog = buildCatalogText(products, currency);
    const hamperCatalog = buildHamperCatalogText(hampers, products, currency);
    const client = await getClient();

    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: `You are a helpful gift advisor for a luxury dark-themed online store.
You help customers find the perfect gift from the store's catalog of individual products and curated gift hampers (bundles).

How to recommend:
- For most queries, suggest 1-3 individual products OR 1 curated hamper that fits the brief.
- Prefer a curated hamper when one cleanly matches the recipient/occasion — hampers are pre-assembled gifts.
- You may also suggest 2-3 products that would combine into a great custom hamper, and invite the customer to "build a hamper" with them.

Currency:
- The store currency is "${currency}". ALWAYS use this exact symbol for prices.
- Never use "$", "USD", or any other currency symbol. Format prices as "${currency} 8,500" or "${currency} 8.5K".

Output format:
- Keep the whole reply under ~80 words.
- Write 2-3 short paragraphs separated by a single BLANK LINE. Each paragraph should be 1-2 sentences.
- When listing 2 or more products, put each one on its own bullet line starting with "- " (hyphen + space), not inline.
- Do NOT use markdown bold/italics, asterisks, or headings. Plain text only.
- For a product, append its ID like (ID:5).
- For a curated hamper, append its ID like (HAMPER:3).
- Never invent products or hampers not in the catalog.

Current product catalog:
${catalog}

Curated gift hampers:
${hamperCatalog}`,
      messages,
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    res.json({ reply: text });
  } catch (err) {
    req.log.error(err, "AI suggest error");
    res.status(500).json({ error: "AI service unavailable" });
  }
});

router.post("/ai/search", async (req, res): Promise<void> => {
  const { query } = req.body as { query: string };

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    res.status(400).json({ error: "query is required" });
    return;
  }

  try {
    const [products, currency] = await Promise.all([getActiveProducts(), getCurrencySymbol()]);
    const catalog = buildCatalogText(products, currency);
    const client = await getClient();

    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      system: `You are a product search engine. Given a natural language search query, return a JSON array of product IDs from the catalog that best match the query intent.
Consider price ranges, categories, use cases, recipient types, and product descriptions.
Return ONLY a valid JSON array of integers (product IDs), nothing else. Example: [1, 4, 7]
If nothing matches, return [].

Catalog:
${catalog}`,
      messages: [{ role: "user", content: query.trim() }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text.trim() : "[]";

    let ids: number[] = [];
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        ids = parsed.filter((x) => typeof x === "number");
      }
    } catch {
      ids = [];
    }

    const matched = products.filter((p) => ids.includes(p.id));
    res.json({ products: matched });
  } catch (err) {
    req.log.error(err, "AI search error");
    res.status(500).json({ error: "AI service unavailable" });
  }
});

export default router;
