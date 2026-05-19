import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { db, productsTable, categoriesTable } from "@workspace/db";

const router = Router();

function getClient() {
  // Prefer Replit's managed Anthropic integration (no user-provided key
  // needed; usage is billed to Replit credits). Fall back to a plain
  // ANTHROPIC_API_KEY for self-hosted setups.
  const integrationKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
  const integrationBase = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
  if (integrationKey && integrationBase) {
    return new Anthropic({ apiKey: integrationKey, baseURL: integrationBase });
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Anthropic credentials are not configured");
  return new Anthropic({ apiKey: key });
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
    .where(eq(productsTable.isActive, true));

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

function buildCatalogText(products: Awaited<ReturnType<typeof getActiveProducts>>) {
  return products
    .map(
      (p) =>
        `ID:${p.id} | "${p.name}" | Category: ${p.categoryName ?? "Uncategorized"} | Price: $${p.price.toFixed(2)} | In stock: ${p.inStock} | ${p.description ? p.description.slice(0, 80) : ""}`
    )
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
    const products = await getActiveProducts();
    const catalog = buildCatalogText(products);
    const client = getClient();

    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: `You are a helpful gift advisor for a luxury dark-themed online store. 
You help customers find the perfect product from the store's catalog.
Reply in 2-4 short sentences. Recommend 1-3 specific products by name (exact match from catalog). 
Always include the product ID like (ID:5) after each recommendation so the frontend can link to it.
Be warm, concise and helpful. Do not make up products not in the catalog.

Current catalog:
${catalog}`,
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
    const products = await getActiveProducts();
    const catalog = buildCatalogText(products);
    const client = getClient();

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
